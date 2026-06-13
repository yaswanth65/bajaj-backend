import prisma from "./lib/prisma";

async function main() {
  const lcUser = await prisma.user.findUnique({
    where: { email: "shitaldevnath@gmail.com" }
  });
  if (!lcUser) {
    console.log("User not found!");
    return;
  }
  console.log("User found:", lcUser.name, lcUser.id);

  const logs = await prisma.attendanceLog.findMany({
    where: { userId: lcUser.id },
    orderBy: { date: "desc" },
    take: 5
  });
  console.log("Recent attendance logs:", logs);

  const allLogsToday = await prisma.attendanceLog.findMany({
    where: { date: { in: ["2026-06-08", "2026-06-09"] } }
  });
  console.log("All attendance logs for June 8 and 9:", allLogsToday);
}

main().catch(console.error).finally(() => prisma.$disconnect());
