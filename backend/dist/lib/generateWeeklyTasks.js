"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateWeeklyApplianceTasks = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("./prisma"));
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const getISTDate = () => {
    const ms = Date.now() + IST_OFFSET_MS;
    const d = new Date(ms);
    return {
        year: d.getUTCFullYear(),
        month: d.getUTCMonth(),
        day: d.getUTCDate(),
        dow: d.getUTCDay(),
    };
};
const getWeekStartIST = () => {
    const { year, month, day, dow } = getISTDate();
    const sundayDay = day - dow;
    // Sunday 00:00 IST = Saturday 18:30 UTC
    return new Date(Date.UTC(year, month, sundayDay - 1, 18, 30, 0, 0));
};
const getNextSundayIST = () => {
    const { year, month, day, dow } = getISTDate();
    const daysUntil = (7 - dow) || 7;
    // Next Sunday 23:59:59 IST = next Sunday at 18:29:59 UTC
    return new Date(Date.UTC(year, month, day + daysUntil, 18, 29, 59, 999));
};
const generateWeeklyApplianceTasks = async () => {
    const appliances = await prisma_1.default.appliance.findMany({
        include: {
            branch: {
                include: {
                    users: {
                        where: { role: client_1.RoleId.lc }
                    }
                }
            }
        }
    });
    console.log(`Generating weekly verification tasks for ${appliances.length} appliances...`);
    const nextSunday = getNextSundayIST();
    let fallbackCreator = await prisma_1.default.user.findFirst({ where: { role: client_1.RoleId.rm } });
    if (!fallbackCreator) {
        fallbackCreator = await prisma_1.default.user.findFirst({ where: { role: client_1.RoleId.branchManager } });
    }
    if (!fallbackCreator) {
        fallbackCreator = await prisma_1.default.user.findFirst();
    }
    if (!fallbackCreator) {
        console.warn("No fallback creator found (no users exist in database). Skipping task generation.");
        return { tasksCreated: 0, totalAppliancesProcessed: appliances.length };
    }
    const fallbackCreatorId = fallbackCreator.id;
    const currentWeekStart = getWeekStartIST();
    const existingTasks = await prisma_1.default.check.findMany({
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
            const anyUser = await prisma_1.default.user.findFirst({
                where: { branchId: app.branchId, role: { in: [client_1.RoleId.lc, client_1.RoleId.aa, client_1.RoleId.branchManager] } },
                select: { id: true }
            });
            assignedToId = anyUser ? anyUser.id : null;
        }
        tasksToCreate.push({
            title: `Verify ${app.name} - ${app.category} (${app.brand})`,
            branchId: app.branchId,
            audience: client_1.RoleId.lc,
            schedule: "Weekly",
            priority: client_1.Priority.High,
            zone: app.zone || "Branch premises",
            deadline: nextSunday,
            assignedToId,
            assignedById: assignedToId || fallbackCreatorId,
            status: client_1.TaskStatus.Pending,
            checklistTotal: 1,
            proofRequired: true,
            proofLabel: "Working fine photo proof",
            notes: `Weekly appliance operation check. Upload photo showing it is working fine. Serial: ${app.serial}`,
            applianceId: app.id
        });
    }
    let tasksCreated = 0;
    if (tasksToCreate.length > 0) {
        await prisma_1.default.check.createMany({ data: tasksToCreate });
        tasksCreated = tasksToCreate.length;
    }
    const branches = await prisma_1.default.branch.findMany({
        include: {
            appliances: {
                where: { status: { not: client_1.ApplianceStatus.Operational } }
            }
        }
    });
    for (const b of branches) {
        await prisma_1.default.branch.update({
            where: { id: b.id },
            data: { applianceRisk: b.appliances.length }
        }).catch((err) => console.error("Failed to update branch applianceRisk:", err));
    }
    console.log(`Created ${tasksCreated} weekly appliance tasks.`);
    return { tasksCreated, totalAppliancesProcessed: appliances.length };
};
exports.generateWeeklyApplianceTasks = generateWeeklyApplianceTasks;
