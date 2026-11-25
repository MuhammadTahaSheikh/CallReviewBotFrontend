/**
 * Import prisma/backups/sqlite-data-export.json into current DATABASE_URL (Postgres).
 * Uses createMany({ skipDuplicates: true }) so re-runs do not duplicate rows.
 */
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();
const inFile = path.join(process.cwd(), "prisma", "backups", "sqlite-data-export.json");

function reviveDates(rows, fields) {
  return rows.map((row) => {
    const next = { ...row };
    for (const field of fields) {
      if (next[field] != null) next[field] = new Date(next[field]);
    }
    return next;
  });
}

async function load(table, rows, dateFields = []) {
  if (!rows?.length) {
    console.log(`  ${table}: 0 (skip)`);
    return 0;
  }
  const data = reviveDates(rows, dateFields);
  const result = await prisma[table].createMany({
    data,
    skipDuplicates: true,
  });
  console.log(`  ${table}: attempted ${rows.length}, inserted ${result.count}`);
  return result.count;
}

async function main() {
  if (!fs.existsSync(inFile)) {
    throw new Error(`Missing export file: ${inFile}`);
  }
  const dump = JSON.parse(fs.readFileSync(inFile, "utf8"));
  console.log("Importing export from", dump.exportedAt);

  // Parent → child order for FKs
  await load("business", dump.business, ["createdAt", "updatedAt"]);
  await load("representative", dump.representative, ["createdAt", "updatedAt"]);
  await load("scoringProfile", dump.scoringProfile, ["createdAt", "updatedAt"]);
  await load("call", dump.call, ["occurredAt", "processedAt", "createdAt", "updatedAt"]);
  await load("transcript", dump.transcript, ["createdAt"]);
  await load("callAnalysis", dump.callAnalysis, ["createdAt", "updatedAt"]);
  await load("categoryScore", dump.categoryScore, []);
  await load("recommendation", dump.recommendation, []);
  await load("actionTask", dump.actionTask, ["createdAt", "updatedAt"]);
  await load("exceptionReview", dump.exceptionReview, ["createdAt", "updatedAt", "resolvedAt"]);
  await load("automationExecution", dump.automationExecution, ["createdAt"]);
  await load("auditLog", dump.auditLog, ["createdAt"]);
  await load("appSetting", dump.appSetting, ["updatedAt"]);
  await load("practiceSession", dump.practiceSession, ["startedAt", "endedAt", "createdAt", "updatedAt"]);
  await load("practiceMessage", dump.practiceMessage, ["createdAt"]);
  await load("practiceEvaluation", dump.practiceEvaluation, ["createdAt", "updatedAt"]);

  const counts = {
    business: await prisma.business.count(),
    representative: await prisma.representative.count(),
    scoringProfile: await prisma.scoringProfile.count(),
    call: await prisma.call.count(),
    transcript: await prisma.transcript.count(),
    callAnalysis: await prisma.callAnalysis.count(),
    categoryScore: await prisma.categoryScore.count(),
    recommendation: await prisma.recommendation.count(),
    actionTask: await prisma.actionTask.count(),
    exceptionReview: await prisma.exceptionReview.count(),
    automationExecution: await prisma.automationExecution.count(),
    auditLog: await prisma.auditLog.count(),
    appSetting: await prisma.appSetting.count(),
    practiceSession: await prisma.practiceSession.count(),
    practiceMessage: await prisma.practiceMessage.count(),
    practiceEvaluation: await prisma.practiceEvaluation.count(),
  };
  console.log("Supabase row counts after import:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
