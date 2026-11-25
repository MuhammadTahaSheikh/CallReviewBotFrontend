import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const ids = ["cmwuyvm2p009f4azc41ofifzb", "cmwuyvmjc00a94azcdig11q7r"];
const calls = await p.call.findMany({
  where: { id: { in: ids } },
  select: { id: true, source: true, externalMeetingId: true, title: true, metadata: true },
});
console.log(JSON.stringify(calls, null, 2));
const recent = await p.call.findMany({
  orderBy: { createdAt: "desc" },
  take: 8,
  select: { id: true, source: true, externalMeetingId: true, title: true },
});
console.log("recent", recent);
await p.$disconnect();
