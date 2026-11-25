import { prisma } from "../prisma";
import { callTypeLabel } from "../format";

/**
 * Build per-representative performance from stored scored calls.
 * Comparisons are only meaningful within the same call type.
 */
export async function getTeamPerformance({ callType = "all", ownerUserId } = {}) {
  const where = {
    overallScore: { not: null },
    status: { in: ["completed", "exception"] },
    OR: [{ representativeName: { not: null } }, { representativeId: { not: null } }],
    ...(ownerUserId ? { ownerUserId } : {}),
  };

  if (callType && callType !== "all") {
    where.callType = callType;
  }

  const calls = await prisma.call.findMany({
    where,
    orderBy: { occurredAt: "asc" },
    select: {
      id: true,
      callType: true,
      overallScore: true,
      riskLevel: true,
      occurredAt: true,
      representativeId: true,
      representativeName: true,
      representative: { select: { id: true, name: true } },
    },
  });

  const byRep = new Map();

  for (const call of calls) {
    const name = call.representative?.name || call.representativeName || "Unassigned";
    const id = call.representative?.id || call.representativeId || `name:${name}`;

    if (!byRep.has(id)) {
      byRep.set(id, {
        id,
        name,
        scores: [],
        byType: new Map(),
        flagged: 0,
      });
    }

    const entry = byRep.get(id);
    entry.scores.push({
      score: call.overallScore,
      occurredAt: call.occurredAt,
      callType: call.callType,
      callId: call.id,
    });

    if (call.riskLevel === "high" || call.riskLevel === "medium") {
      entry.flagged += 1;
    }

    const typeKey = call.callType;
    const typeEntry = entry.byType.get(typeKey) || { sum: 0, count: 0 };
    typeEntry.sum += call.overallScore;
    typeEntry.count += 1;
    entry.byType.set(typeKey, typeEntry);
  }

  // Also include seeded reps with zero calls so the page isn't empty of known names
  const seededReps = await prisma.representative.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  for (const rep of seededReps) {
    if (!byRep.has(rep.id)) {
      // Only show zero-call reps when not filtering by type, or always show with 0
      byRep.set(rep.id, {
        id: rep.id,
        name: rep.name,
        scores: [],
        byType: new Map(),
        flagged: 0,
      });
    } else {
      // Prefer seeded display name
      const existing = byRep.get(rep.id);
      existing.name = rep.name;
    }
  }

  const reps = [...byRep.values()]
    .map((entry) => {
      const scored = entry.scores;
      const avgScore =
        scored.length === 0
          ? null
          : Math.round((scored.reduce((acc, s) => acc + s.score, 0) / scored.length) * 10) / 10;

      // Last up to 12 scored calls as trend points
      const trend = scored.slice(-12).map((s, index) => ({
        point: `C${index + 1}`,
        score: s.score,
        date: s.occurredAt,
        callType: s.callType,
      }));

      const byType = {};
      for (const [type, { sum, count }] of entry.byType.entries()) {
        byType[type] = {
          label: callTypeLabel(type),
          avgScore: Math.round((sum / count) * 10) / 10,
          count,
        };
      }

      return {
        id: entry.id,
        name: entry.name,
        calls: scored.length,
        avgScore,
        flagged: entry.flagged,
        trend,
        byType,
      };
    })
    .filter((rep) => {
      // When filtering by call type, hide reps with no matching calls
      if (callType && callType !== "all") return rep.calls > 0;
      return true;
    })
    .sort((a, b) => {
      if ((b.avgScore ?? -1) !== (a.avgScore ?? -1)) {
        return (b.avgScore ?? -1) - (a.avgScore ?? -1);
      }
      return a.name.localeCompare(b.name);
    });

  const totals = {
    representatives: reps.length,
    scoredCalls: calls.length,
    callTypeFilter: callType || "all",
  };

  return { reps, totals };
}
