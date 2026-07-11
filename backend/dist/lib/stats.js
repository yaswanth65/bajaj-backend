"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recalcUserStats = exports.recalcBranchStats = exports.relativeTime = void 0;
const prisma_1 = __importDefault(require("./prisma"));
const client_1 = require("@prisma/client");
const relativeTime = (date) => {
    const now = Date.now();
    const diffMs = now - date.getTime();
    const seconds = Math.floor(diffMs / 1000);
    if (seconds < 60)
        return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60)
        return `${minutes} min${minutes > 1 ? "s" : ""} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24)
        return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    const days = Math.floor(hours / 24);
    if (days < 30)
        return `${days} day${days > 1 ? "s" : ""} ago`;
    const months = Math.floor(days / 30);
    return `${months} month${months > 1 ? "s" : ""} ago`;
};
exports.relativeTime = relativeTime;
const getTodayIST = () => {
    const options = { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" };
    return new Intl.DateTimeFormat("en-CA", options).format(new Date());
};
const recalcBranchStats = async (branchId) => {
    const today = getTodayIST();
    const [openIssues, applianceRiskCount, branchUsers, totalUsers, attendanceToday] = await Promise.all([
        prisma_1.default.complaint.count({
            where: { branchId, status: { notIn: [client_1.ComplaintStatus.RESOLVED] } }
        }),
        prisma_1.default.appliance.count({
            where: { branchId, status: { not: client_1.ApplianceStatus.Operational } }
        }),
        prisma_1.default.user.count({ where: { branchId, status: { not: "Inactive" } } }),
        prisma_1.default.user.count({ where: { branchId } }),
        prisma_1.default.attendanceLog.count({
            where: {
                date: today,
                status: client_1.AttStatus.Present,
                user: { branchId }
            }
        }),
    ]);
    const todayAttendance = totalUsers > 0 ? Math.round((attendanceToday / totalUsers) * 100) : 100;
    const applianceHealthScores = await prisma_1.default.appliance.findMany({
        where: { branchId },
        select: { healthScore: true }
    });
    const avgApplianceHealth = applianceHealthScores.length > 0
        ? Math.round(applianceHealthScores.reduce((s, a) => s + a.healthScore, 0) / applianceHealthScores.length)
        : 100;
    const criticalAlerts = (await prisma_1.default.branch.findUnique({
        where: { id: branchId },
        select: { criticalAlerts: true }
    }))?.criticalAlerts || 0;
    const health = Math.max(0, Math.min(100, Math.round(avgApplianceHealth * 0.4 +
        (100 - openIssues * 3) * 0.3 +
        (100 - criticalAlerts * 10) * 0.3)));
    await prisma_1.default.branch.update({
        where: { id: branchId },
        data: { openIssues, applianceRisk: applianceRiskCount, todayAttendance, health }
    });
};
exports.recalcBranchStats = recalcBranchStats;
const recalcUserStats = async (userId) => {
    const totalLogs = await prisma_1.default.attendanceLog.count({ where: { userId } });
    const presentLogs = await prisma_1.default.attendanceLog.count({
        where: { userId, status: { in: [client_1.AttStatus.Present, client_1.AttStatus.Late] } }
    });
    const attendancePct = totalLogs > 0 ? Math.round((presentLogs / totalLogs) * 100) : 100;
    const completedTasks = await prisma_1.default.check.findMany({
        where: { completedById: userId, status: client_1.TaskStatus.Completed },
        select: { proofUrl: true }
    });
    const totalCompleted = completedTasks.length;
    const withProof = completedTasks.filter(t => t.proofUrl).length;
    const proofRate = totalCompleted > 0 ? Math.round((withProof / totalCompleted) * 100) : 100;
    const escalations = await prisma_1.default.complaint.count({
        where: { raisedById: userId, priority: "Critical" }
    });
    await prisma_1.default.user.update({
        where: { id: userId },
        data: { attendancePct, tasksClosed: totalCompleted, proofRate, escalations }
    });
};
exports.recalcUserStats = recalcUserStats;
