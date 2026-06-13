import { TaskStatus, RoleId, Priority, ApplianceStatus } from "@prisma/client";
import prisma from "./prisma";

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

const getISTDate = (): { year: number; month: number; day: number; dow: number } => {
  const ms = Date.now() + IST_OFFSET_MS;
  const d = new Date(ms);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth(),
    day: d.getUTCDate(),
    dow: d.getUTCDay(),
  };
};

const getWeekStartIST = (): Date => {
  const { year, month, day, dow } = getISTDate();
  const sundayDay = day - dow;
  // Sunday 00:00 IST = Saturday 18:30 UTC
  return new Date(Date.UTC(year, month, sundayDay - 1, 18, 30, 0, 0));
};

const getNextSundayIST = (): Date => {
  const { year, month, day, dow } = getISTDate();
  const daysUntil = (7 - dow) || 7;
  // Next Sunday 23:59:59 IST = next Sunday at 18:29:59 UTC
  return new Date(Date.UTC(year, month, day + daysUntil, 18, 29, 59, 999));
};

export interface GenerateResult {
  tasksCreated: number;
  totalAppliancesProcessed: number;
}

export const generateWeeklyApplianceTasks = async (): Promise<GenerateResult> => {
  const appliances = await prisma.appliance.findMany({
    include: {
      branch: {
        include: {
          users: {
            where: { role: RoleId.lc }
          }
        }
      }
    }
  });

  console.log(`Generating weekly verification tasks for ${appliances.length} appliances...`);

  const nextSunday = getNextSundayIST();

  let fallbackCreator = await prisma.user.findFirst({ where: { role: RoleId.rm } });
  if (!fallbackCreator) {
    fallbackCreator = await prisma.user.findFirst({ where: { role: RoleId.branchManager } });
  }
  if (!fallbackCreator) {
    fallbackCreator = await prisma.user.findFirst();
  }

  if (!fallbackCreator) {
    console.warn("No fallback creator found (no users exist in database). Skipping task generation.");
    return { tasksCreated: 0, totalAppliancesProcessed: appliances.length };
  }
  const fallbackCreatorId = fallbackCreator.id;

  const currentWeekStart = getWeekStartIST();

  const existingTasks = await prisma.task.findMany({
    where: {
      applianceId: { not: null },
      createdAt: { gte: currentWeekStart }
    },
    select: { applianceId: true }
  });
  const existingApplianceIds = new Set(existingTasks.map(t => t.applianceId));

  const tasksToCreate = [];

  for (const app of appliances) {
    if (existingApplianceIds.has(app.id)) {
      continue;
    }

    const lc = app.branch.users[0];
    let assignedToId = lc ? lc.id : null;
    if (!assignedToId) {
      const anyUser = await prisma.user.findFirst({
        where: { branchId: app.branchId, role: { in: [RoleId.lc, RoleId.aa, RoleId.branchManager] } },
        select: { id: true }
      });
      assignedToId = anyUser ? anyUser.id : null;
    }

    tasksToCreate.push({
      title: `Verify ${app.name} - ${app.category} (${app.brand})`,
      branchId: app.branchId,
      audience: RoleId.lc,
      schedule: "Weekly",
      priority: Priority.High,
      zone: app.zone || "Branch premises",
      deadline: nextSunday,
      assignedToId,
      assignedById: assignedToId || fallbackCreatorId,
      status: TaskStatus.Pending,
      checklistTotal: 1,
      proofRequired: true,
      proofLabel: "Working fine photo proof",
      notes: `Weekly appliance operation check. Upload photo showing it is working fine. Serial: ${app.serial}`,
      applianceId: app.id
    });
  }

  let tasksCreated = 0;
  if (tasksToCreate.length > 0) {
    await prisma.task.createMany({ data: tasksToCreate });
    tasksCreated = tasksToCreate.length;
  }

  const branches = await prisma.branch.findMany({
    include: {
      appliances: {
        where: { status: { not: ApplianceStatus.Operational } }
      }
    }
  });

  for (const b of branches) {
    await prisma.branch.update({
      where: { id: b.id },
      data: { applianceRisk: b.appliances.length }
    }).catch((err) => console.error("Failed to update branch applianceRisk:", err));
  }

  console.log(`Created ${tasksCreated} weekly appliance tasks.`);
  return { tasksCreated, totalAppliancesProcessed: appliances.length };
};
