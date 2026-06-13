import prisma from "./lib/prisma";
import { RoleId, AttStatus } from "@prisma/client";

const getLocalDateString = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

async function main() {
  const lcs = await prisma.user.findMany({
    where: { role: RoleId.lc }
  });
  const dbAttLogs = await prisma.attendanceLog.findMany({
    select: { id: true }
  });
  const dbAttIds = new Set(dbAttLogs.map(log => log.id));
  console.log("DB Attendance Logs count:", dbAttIds.size);

  const todayDate = new Date();
  const missingInDb: any[] = [];

  for (const lc of lcs) {
    for (let dayOffset = 90; dayOffset >= 1; dayOffset--) {
      const logDate = new Date(todayDate);
      logDate.setDate(todayDate.getDate() - dayOffset);
      
      if (logDate.getDay() === 0) continue;

      const dateStr = getLocalDateString(logDate);
      const isMonday = logDate.getDay() === 1;

      const attendanceId = `att-log-${lc.id}-${dateStr}`;

      // We only care if it would have been a Monday plan
      if (isMonday) {
        // Check if this attendanceId exists in dbAttIds
        if (!dbAttIds.has(attendanceId)) {
          missingInDb.push({
            lcName: lc.name,
            lcId: lc.id,
            dateStr,
            attendanceId
          });
        }
      }
    }
  }

  console.log("Total missing attendance records in DB for Mondays:", missingInDb.length);
  if (missingInDb.length > 0) {
    console.log("Sample missing:", missingInDb.slice(0, 5));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
