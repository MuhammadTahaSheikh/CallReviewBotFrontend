import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
const call = await p.call.findFirst({
  where: { title: { contains: "sample_high_risk" } },
  include: { analysis: true, exceptionReviews: true },
  orderBy: { createdAt: "desc" },
});

if (!call) {
  console.log("NOT_FOUND");
} else {
  console.log(
    JSON.stringify(
      {
        title: call.title,
        status: call.status,
        riskLevel: call.riskLevel,
        score: call.overallScore,
        exceptions: call.exceptionReviews.length,
        risks: call.analysis ? JSON.parse(call.analysis.risks || "[]") : [],
      },
      null,
      2
    )
  );
}

await p.$disconnect();
