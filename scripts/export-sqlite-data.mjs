/**
 * Export all Prisma tables from the current DATABASE_URL (SQLite) to JSON.
 */
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();
const outDir = path.join(process.cwd(), "prisma", "backups");
const outFile = path.join(outDir, "sqlite-data-export.json");

async function main() {
  fs.mkdirSync(outDir, { recursive: true });

  const data = {
    exportedAt: new Date().toISOString(),
    business: await prisma.business.findMany(),
    representative: await prisma.representative.findMany(),
    scoringProfile: await prisma.scoringProfile.findMany(),
    call: await prisma.call.findMany(),
    transcript: await prisma.transcript.findMany(),
    callAnalysis: await prisma.callAnalysis.findMany(),
    categoryScore: await prisma.categoryScore.findMany(),
    recommendation: await prisma.recommendation.findMany(),
    actionTask: await prisma.actionTask.findMany(),
    exceptionReview: await prisma.exceptionReview.findMany(),
    automationExecution: await prisma.automationExecution.findMany(),
    auditLog: await prisma.auditLog.findMany(),
    appSetting: await prisma.appSetting.findMany(),
    practiceSession: await prisma.practiceSession.findMany(),
    practiceMessage: await prisma.practiceMessage.findMany(),
    practiceEvaluation: await prisma.practiceEvaluation.findMany(),
  };

  const counts = Object.fromEntries(
    Object.entries(data)
      .filter(([, v]) => Array.isArray(v))
      .map(([k, v]) => [k, v.length])
  );

  fs.writeFileSync(outFile, JSON.stringify(data, null, 2), "utf8");
  console.log("Exported to", outFile);
  console.log("Counts:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
