import prisma from "./prisma";
import { RoleId, ComplaintStatus, TaskStatus, ApplianceStatus, AttStatus } from "@prisma/client";

export const relativeTime = (date: Date): string => {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes > 1 ? "s" : ""} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days > 1 ? "s" : ""} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months > 1 ? "s" : ""} ago`;
};

const getTodayIST = (): string => {
  const options = { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" } as const;
  return new Intl.DateTimeFormat("en-CA", options).format(new Date());
};

export const recalcBranchStats = async (branchId: string) => {
  const today = getTodayIST();

  const [openIssues, applianceRiskCount, branchUsers, totalUsers, attendanceToday] = await Promise.all([
    prisma.complaint.count({
      where: { branchId, status: { notIn: [ComplaintStatus.Resolved, ComplaintStatus.Rejected] } }
    }),
    prisma.appliance.count({
      where: { branchId, status: { not: ApplianceStatus.Operational } }
    }),
    prisma.user.count({ where: { branchId, status: { not: "Inactive" } } }),
    prisma.user.count({ where: { branchId } }),
    prisma.attendanceLog.count({
      where: {
        date: today,
        status: AttStatus.Present,
        user: { branchId }
      }
    }),
  ]);

  const todayAttendance = totalUsers > 0 ? Math.round((attendanceToday / totalUsers) * 100) : 100;
  const applianceHealthScores = await prisma.appliance.findMany({
    where: { branchId },
    select: { healthScore: true }
  });
  const avgApplianceHealth = applianceHealthScores.length > 0
    ? Math.round(applianceHealthScores.reduce((s, a) => s + a.healthScore, 0) / applianceHealthScores.length)
    : 100;

  const criticalAlerts = (await prisma.branch.findUnique({
    where: { id: branchId },
    select: { criticalAlerts: true }
  }))?.criticalAlerts || 0;

  const health = Math.max(0, Math.min(100,
    Math.round(
      avgApplianceHealth * 0.4 +
      (100 - openIssues * 3) * 0.3 +
      (100 - criticalAlerts * 10) * 0.3
    )
  ));

  await prisma.branch.update({
    where: { id: branchId },
    data: { openIssues, applianceRisk: applianceRiskCount, todayAttendance, health }
  });
};

export const recalcUserStats = async (userId: string) => {
  const totalLogs = await prisma.attendanceLog.count({ where: { userId } });
  const presentLogs = await prisma.attendanceLog.count({
    where: { userId, status: { in: [AttStatus.Present, AttStatus.Late] } }
  });
  const attendancePct = totalLogs > 0 ? Math.round((presentLogs / totalLogs) * 100) : 100;

  const completedTasks = await prisma.task.findMany({
    where: { completedById: userId, status: TaskStatus.Completed },
    select: { proofUrl: true }
  });
  const totalCompleted = completedTasks.length;
  const withProof = completedTasks.filter(t => t.proofUrl).length;
  const proofRate = totalCompleted > 0 ? Math.round((withProof / totalCompleted) * 100) : 100;

  const escalations = await prisma.complaint.count({
    where: { reportedById: userId, escalationStage: { not: "LC" } }
  });

  await prisma.user.update({
    where: { id: userId },
    data: { attendancePct, tasksClosed: totalCompleted, proofRate, escalations }
  });
};
