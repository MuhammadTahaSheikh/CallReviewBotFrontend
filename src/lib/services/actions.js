import { prisma } from "../prisma";

/**
 * Persist proposed actions according to policy decisions.
 * Idempotent per callId + type + idempotencyKey.
 */
export async function applyPolicyActions({ callId, actionDecisions }) {
  const results = [];

  for (const item of actionDecisions) {
    const key = `${item.type}:v1`;
    const decision = item.decision;

    if (!decision.allowed) {
      await prisma.automationExecution.create({
        data: {
          callId,
          action: item.type,
          label: item.label || item.type,
          status: "blocked",
          reason: decision.reason,
        },
      });
      results.push({ type: item.type, status: "blocked", reason: decision.reason });
      continue;
    }

    const existing = await prisma.actionTask.findFirst({
      where: { callId, type: item.type, idempotencyKey: key },
    });

    if (existing) {
      results.push({ type: item.type, status: existing.status, reason: "Idempotent skip" });
      continue;
    }

    const status = decision.autoExecute ? "completed" : "blocked";
    const task = await prisma.actionTask.create({
      data: {
        callId,
        type: item.type,
        title: item.label || item.type,
        description: item.reason || decision.reason,
        status,
        reason: decision.reason,
        idempotencyKey: key,
      },
    });

    await prisma.automationExecution.create({
      data: {
        callId,
        action: item.type,
        label: item.label || item.type,
        status: decision.autoExecute ? "succeeded" : "blocked",
        reason: decision.reason,
        detail:
          item.type === "customer_draft"
            ? JSON.stringify({ delivery: "local_queue_only", sent: false })
            : null,
      },
    });

    results.push({ type: item.type, status: task.status, reason: decision.reason, id: task.id });
  }

  return results;
}

/**
 * After human approval, execute previously blocked permitted actions.
 */
export async function releaseBlockedActions(callId, { reject = false } = {}) {
  const blocked = await prisma.actionTask.findMany({
    where: { callId, status: "blocked" },
  });

  for (const task of blocked) {
    const nextStatus = reject ? "rejected" : "completed";
    await prisma.actionTask.update({
      where: { id: task.id },
      data: {
        status: nextStatus,
        reason: reject
          ? "Rejected by human reviewer"
          : "Approved by human reviewer and executed (dummy)",
      },
    });

    await prisma.automationExecution.create({
      data: {
        callId,
        action: task.type,
        label: task.title,
        status: reject ? "blocked" : "succeeded",
        reason: reject ? "Rejected by reviewer" : "Released after exception approval",
        detail:
          task.type === "customer_draft"
            ? JSON.stringify({ delivery: "local_queue_only", sent: false })
            : null,
      },
    });
  }

  return blocked.length;
}
