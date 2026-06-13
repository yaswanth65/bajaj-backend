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
  console.log("LCs count:", lcs.length);

  const todayDate = new Date();
  
  const attendanceIds = new Set<string>();
  const duplicateAttendanceIds: string[] = [];

  const attendanceLogsList: any[] = [];
  const weeklyTaskItems: any[] = [];

  for (const lc of lcs) {
    for (let dayOffset = 90; dayOffset >= 1; dayOffset--) {
      const logDate = new Date(todayDate);
      logDate.setDate(todayDate.getDate() - dayOffset);
      
      if (logDate.getDay() === 0) continue;

      const dateStr = getLocalDateString(logDate);
      const isMonday = logDate.getDay() === 1;

      const attendanceId = `att-log-${lc.id}-${dateStr}`;

      if (attendanceIds.has(attendanceId)) {
        duplicateAttendanceIds.push(attendanceId);
      } else {
        attendanceIds.add(attendanceId);
      }

      // We don't care about random status for diagnostics, let's just mock Present
      const status = AttStatus.Present;

      attendanceLogsList.push({
        id: attendanceId,
        userId: lc.id,
        date: dateStr,
        status: status,
      });

      if (isMonday) {
        weeklyTaskItems.push({
          id: `plan-item-${lc.id}-${dateStr}-0`,
          attendanceId: attendanceId,
          description: "Test description",
        });
      }
    }
  }

  console.log("Total attendance logs generated:", attendanceLogsList.length);
  console.log("Duplicate attendance IDs count:", duplicateAttendanceIds.length);
  if (duplicateAttendanceIds.length > 0) {
    console.log("First few duplicate attendance IDs:", duplicateAttendanceIds.slice(0, 5));
  }

  // Check if any weeklyTaskItems reference an attendanceId that is NOT in attendanceLogsList
  const missingAttendanceIds: string[] = [];
  for (const item of weeklyTaskItems) {
    if (!attendanceIds.has(item.attendanceId)) {
      missingAttendanceIds.push(item.attendanceId);
    }
  }
  console.log("Weekly plan items referencing missing attendance IDs count:", missingAttendanceIds.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());
