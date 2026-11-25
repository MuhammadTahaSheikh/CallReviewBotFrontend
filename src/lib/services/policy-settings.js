import { prisma } from "../prisma";
import { DEFAULT_POLICY } from "../policy/defaults";

export async function getPolicySettings() {
  const row = await prisma.appSetting.findUnique({ where: { key: "policy" } });
  if (!row) return { ...DEFAULT_POLICY };

  try {
    const parsed = JSON.parse(row.value);
    return {
      ...DEFAULT_POLICY,
      ...parsed,
      // Prototype hard rule — never send customer messages
      neverSendCustomerMessages: true,
      highRiskKeywords: parsed.highRiskKeywords || DEFAULT_POLICY.highRiskKeywords,
      mediumRiskKeywords: parsed.mediumRiskKeywords || DEFAULT_POLICY.mediumRiskKeywords,
    };
  } catch {
    return { ...DEFAULT_POLICY };
  }
}

export async function savePolicySettings(partial) {
  const current = await getPolicySettings();
  const next = {
    ...current,
    ...partial,
    neverSendCustomerMessages: true,
    qaSampleRatePercent: Math.max(
      0,
      Math.min(100, Number(partial.qaSampleRatePercent ?? current.qaSampleRatePercent) || 0)
    ),
  };

  await prisma.appSetting.upsert({
    where: { key: "policy" },
    update: { value: JSON.stringify(next) },
    create: { key: "policy", value: JSON.stringify(next) },
  });

  await prisma.auditLog.create({
    data: {
      actor: "demo-reviewer",
      event: "policy.updated",
      detail: JSON.stringify({
        qaSampleRatePercent: next.qaSampleRatePercent,
        autoCreateCrmTasks: next.autoCreateCrmTasks,
        autoCreateCoachingTasks: next.autoCreateCoachingTasks,
        autoQueueCustomerDrafts: next.autoQueueCustomerDrafts,
        queueMediumRisk: next.queueMediumRisk,
      }),
    },
  });

  return next;
}
