import { prisma } from "../prisma";
import { EXCEPTION_TRANSITIONS } from "../policy/defaults";
import { releaseBlockedActions } from "./actions";

export async function listOpenExceptions({ ownerUserId } = {}) {
  const items = await prisma.exceptionReview.findMany({
    where: {
      status: { in: ["pending_review", "in_review"] },
      ...(ownerUserId ? { call: { ownerUserId } } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      call: {
        select: {
          id: true,
          title: true,
          representativeName: true,
          riskLevel: true,
          status: true,
          ownerUserId: true,
          analysis: { select: { proposedActions: true } },
          actionTasks: {
            select: { id: true, type: true, title: true, status: true, reason: true },
          },
        },
      },
    },
  });

  return items.map((item) => ({
    id: item.id,
    callId: item.callId,
    title: item.call?.title || "Untitled call",
    reason: item.reason,
    risk: item.call?.riskLevel || "medium",
    status: item.status,
    callStatus: item.call?.status,
    representativeName: item.call?.representativeName || "—",
    createdAt: item.createdAt,
    notes: item.notes,
    proposedActions: (() => {
      try {
        return JSON.parse(item.call?.analysis?.proposedActions || "[]");
      } catch {
        return [];
      }
    })(),
    actionTasks: item.call?.actionTasks || [],
    allowedNext: EXCEPTION_TRANSITIONS[item.status] || [],
  }));
}

export async function transitionException({ id, status, notes }) {
  const current = await prisma.exceptionReview.findUnique({ where: { id } });
  if (!current) {
    const err = new Error("Exception not found");
    err.statusCode = 404;
    throw err;
  }

  const allowed = EXCEPTION_TRANSITIONS[current.status] || [];
  if (!allowed.includes(status)) {
    const err = new Error(
      `Invalid transition: ${current.status} → ${status}. Allowed: ${allowed.join(", ") || "none"}`
    );
    err.statusCode = 400;
    throw err;
  }

  const updated = await prisma.exceptionReview.update({
    where: { id },
    data: {
      status,
      notes: notes ?? current.notes,
      reviewer: "demo-reviewer",
      resolvedAt: ["approved", "rejected", "resolved"].includes(status) ? new Date() : null,
    },
  });

  if (status === "in_review") {
    await prisma.auditLog.create({
      data: {
        callId: updated.callId,
        actor: "demo-reviewer",
        event: "exception.in_review",
        detail: JSON.stringify({ exceptionId: id }),
      },
    });
    return updated;
  }

  if (status === "approved") {
    await releaseBlockedActions(updated.callId, { reject: false });
    await prisma.call.update({
      where: { id: updated.callId },
      data: { status: "completed" },
    });
  } else if (status === "rejected") {
    await releaseBlockedActions(updated.callId, { reject: true });
    await prisma.call.update({
      where: { id: updated.callId },
      data: { status: "completed" },
    });
  } else if (status === "resolved") {
    // Close without forcing action execution — leave blocked as blocked unless already handled
    await prisma.call.update({
      where: { id: updated.callId },
      data: { status: "completed" },
    });
  }

  await prisma.auditLog.create({
    data: {
      callId: updated.callId,
      actor: "demo-reviewer",
      event: `exception.${status}`,
      detail: JSON.stringify({ exceptionId: id, notes: notes || null, from: current.status }),
    },
  });

  return updated;
}

export async function createExceptionReview({ callId, reason, status = "pending_review" }) {
  return prisma.exceptionReview.create({
    data: {
      callId,
      reason,
      status,
      reviewer: "demo-reviewer",
    },
  });
}
