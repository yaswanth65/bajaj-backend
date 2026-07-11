"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.amUpdateUserStatus = exports.amFinanceExport = exports.amTasks = exports.amAnalytics = exports.amUsers = exports.amFinance = exports.amAttendance = exports.amDashboard = void 0;
const client_1 = require("@prisma/client");
const stats_1 = require("../../lib/stats");
const prisma_1 = __importDefault(require("../../lib/prisma"));
/**
 * GET /api/rm/dashboard
 * Returns everything the RM dashboard needs: branches, complaints, approvals, notifications.
 */
const amDashboard = async (req, res) => {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ message: "Unauthorized" });
        if (user.role !== client_1.RoleId.am)
            return res.status(403).json({ message: "Forbidden: AM only" });
        const branchScopeFilter = { id: { in: user.branchScope || [] } };
        const relScopeFilter = { branchId: { in: user.branchScope || [] } };
        const userScopeFilter = { OR: [{ branchId: { in: user.branchScope || [] } }, { managerId: user.id }] };
        const [branches, complaints, approvals, notifications] = await Promise.all([
            // Branches Ã¢â‚¬â€ health/SLA KPI fields for dashboard tiles
            prisma_1.default.branch.findMany({
                where: branchScopeFilter,
                select: {
                    id: true,
                    name: true,
                    code: true,
                    city: true,
                    address: true,
                    health: true,
                    sla: true,
                    criticalAlerts: true,
                    todayAttendance: true,
                    openIssues: true,
                    monthlyBudget: true,
                    usedBudget: true,
                    staffCount: true,
                    nextVisit: true,
                    lastVisit: true,
                    applianceRisk: true,
                    auditScore: true,
                    performance: true,
                    revenueIndex: true,
                    customerFootfall: true,
                },
                orderBy: { name: "asc" },
            }),
            // Complaints Ã¢â‚¬â€ for watchlist and timeline
            prisma_1.default.complaint.findMany({
                where: relScopeFilter,
                select: {
                    id: true,
                    complaintId: true,
                    priority: true,
                    status: true,
                    branchId: true,
                    description: true,
                    vendorRemarks: true,
                    assetId: true,
                    createdAt: true,
                    updatedAt: true,
                    raisedById: true,
                },
                orderBy: { createdAt: "desc" },
                take: 200,
            }),
            // Approvals Ã¢â‚¬â€ for decision feed + capex summary
            prisma_1.default.approval.findMany({
                where: relScopeFilter,
                select: {
                    id: true,
                    title: true,
                    kind: true,
                    amount: true,
                    status: true,
                    priority: true,
                    branchId: true,
                    requestedById: true,
                    stage: true,
                    age: true,
                    note: true,
                    updatedAt: true,
                },
                orderBy: { updatedAt: "desc" },
            }),
            // Notifications Ã¢â‚¬â€ RM scope
            prisma_1.default.notification.findMany({
                where: { scope: { has: client_1.RoleId.am } },
                select: {
                    id: true,
                    title: true,
                    detail: true,
                    priority: true,
                    scope: true,
                    read: true,
                    bookmarked: true,
                    branchId: true,
                    time: true,
                    createdAt: true,
                },
                orderBy: { createdAt: "desc" },
                take: 50,
            }),
        ]);
        const normalizedComplaints = complaints.map((c) => ({
            ...c,
            reportedBy: c.raisedById,
            timeline: (() => {
                try {
                    if (!c.vendorRemarks)
                        return [];
                    if (typeof c.vendorRemarks === "string") {
                        const parsed = JSON.parse(c.vendorRemarks);
                        return Array.isArray(parsed) ? parsed : [parsed];
                    }
                    return Array.isArray(c.vendorRemarks) ? c.vendorRemarks : [];
                }
                catch {
                    return [];
                }
            })(),
        }));
        const normalizedApprovals = approvals.map((a) => ({
            ...a,
            requestedBy: a.requestedById,
        }));
        const enrichedNotifications = notifications.map((n) => ({
            ...n,
            time: (0, stats_1.relativeTime)(n.createdAt),
        }));
        return res.status(200).json({ branches, complaints: normalizedComplaints, approvals: normalizedApprovals, notifications: enrichedNotifications });
    }
    catch (error) {
        console.error("AM dashboard error:", error);
        return res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
    }
};
exports.amDashboard = amDashboard;
/**
 * GET /api/rm/attendance
 * Returns all attendance records + minimal user context for the RM attendance screen.
 */
const amAttendance = async (req, res) => {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ message: "Unauthorized" });
        if (user.role !== client_1.RoleId.am)
            return res.status(403).json({ message: "Forbidden: AM only" });
        const branchScopeFilter = { id: { in: user.branchScope || [] } };
        const relScopeFilter = { branchId: { in: user.branchScope || [] } };
        const userScopeFilter = { OR: [{ branchId: { in: user.branchScope || [] } }, { managerId: user.id }] };
        const [attendanceLogs, allUsers, scopedChecks] = await Promise.all([
            prisma_1.default.attendanceLog.findMany({
                select: {
                    id: true,
                    userId: true,
                    date: true,
                    status: true,
                    checkIn: true,
                    checkOut: true,
                    location: true,
                    proof: true,
                    deviation: true,
                    remarks: true,
                    photos: true,
                    weeklyTasks: { select: { id: true, description: true, estimatedHours: true } },
                },
                orderBy: { date: "desc" },
                take: 1000,
            }),
            // Users Ã¢â‚¬â€ lean fields for roster display
            prisma_1.default.user.findMany({
                where: userScopeFilter,
                select: {
                    id: true,
                    name: true,
                    role: true,
                    branchId: true,
                    status: true,
                    attendancePct: true,
                },
                orderBy: { name: "asc" },
            }),
            // Weekly checks in scope for RM attendance screen's queue
            prisma_1.default.check.findMany({
                where: {
                    schedule: "Weekly",
                    status: { in: [client_1.TaskStatus.Pending, client_1.TaskStatus.InProgress, client_1.TaskStatus.Completed] },
                },
                select: {
                    id: true,
                    title: true,
                    status: true,
                    assignedToId: true,
                    branchId: true,
                    schedule: true,
                },
                orderBy: { deadline: "asc" },
                take: 2000,
            }),
        ]);
        return res.status(200).json({
            attendance: attendanceLogs,
            users: allUsers,
            checks: scopedChecks.map((t) => ({ ...t, assignedTo: t.assignedToId })),
        });
    }
    catch (error) {
        console.error("AM attendance error:", error);
        return res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
    }
};
exports.amAttendance = amAttendance;
/**
 * GET /api/rm/finance
 * Returns approval financial data + branch budget summary.
 */
const amFinance = async (req, res) => {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ message: "Unauthorized" });
        if (user.role !== client_1.RoleId.am)
            return res.status(403).json({ message: "Forbidden: AM only" });
        const branchScopeFilter = { id: { in: user.branchScope || [] } };
        const relScopeFilter = { branchId: { in: user.branchScope || [] } };
        const userScopeFilter = { OR: [{ branchId: { in: user.branchScope || [] } }, { managerId: user.id }] };
        const [approvals, branches] = await Promise.all([
            prisma_1.default.approval.findMany({
                where: relScopeFilter,
                select: {
                    id: true,
                    title: true,
                    kind: true,
                    amount: true,
                    status: true,
                    priority: true,
                    branchId: true,
                    requestedById: true,
                    stage: true,
                    age: true,
                    note: true,
                    updatedAt: true,
                },
                orderBy: { updatedAt: "desc" },
            }),
            prisma_1.default.branch.findMany({
                where: branchScopeFilter,
                select: {
                    id: true,
                    name: true,
                    monthlyBudget: true,
                    usedBudget: true,
                    city: true,
                    code: true,
                    revenueIndex: true,
                    customerFootfall: true,
                    performance: true,
                    lastVisit: true,
                    address: true,
                },
                orderBy: { name: "asc" },
            }),
        ]);
        return res.status(200).json({
            approvals: approvals.map((a) => ({ ...a, requestedBy: a.requestedById })),
            branches,
        });
    }
    catch (error) {
        console.error("AM finance error:", error);
        return res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
    }
};
exports.amFinance = amFinance;
/**
 * GET /api/rm/users
 * Returns all users with branch context for RM user management screen.
 */
const amUsers = async (req, res) => {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ message: "Unauthorized" });
        if (user.role !== client_1.RoleId.am)
            return res.status(403).json({ message: "Forbidden: AM only" });
        const branchScopeFilter = { id: { in: user.branchScope || [] } };
        const relScopeFilter = { branchId: { in: user.branchScope || [] } };
        const userScopeFilter = { OR: [{ branchId: { in: user.branchScope || [] } }, { managerId: user.id }] };
        const [users, branches] = await Promise.all([
            prisma_1.default.user.findMany({
                where: userScopeFilter,
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    branchId: true,
                    status: true,
                    rating: true,
                    attendancePct: true,
                    proofRate: true,
                    phone: true,
                    position: true,
                    tasksClosed: true,
                    shift: true,
                    branchScope: true,
                },
                orderBy: { name: "asc" },
            }),
            prisma_1.default.branch.findMany({
                where: branchScopeFilter,
                select: { id: true, name: true, city: true, code: true },
                orderBy: { name: "asc" },
            }),
        ]);
        return res.status(200).json({ users, branches });
    }
    catch (error) {
        console.error("AM users error:", error);
        return res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
    }
};
exports.amUsers = amUsers;
/**
 * GET /api/rm/analytics
 * Returns per-branch KPI aggregates for RM analytics screen.
 */
const amAnalytics = async (req, res) => {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ message: "Unauthorized" });
        if (user.role !== client_1.RoleId.am)
            return res.status(403).json({ message: "Forbidden: AM only" });
        const branchScopeFilter = { id: { in: user.branchScope || [] } };
        const relScopeFilter = { branchId: { in: user.branchScope || [] } };
        const userScopeFilter = { OR: [{ branchId: { in: user.branchScope || [] } }, { managerId: user.id }] };
        const [branches, taskStats, complaintStats, approvalStats] = await Promise.all([
            prisma_1.default.branch.findMany({
                where: branchScopeFilter,
                select: {
                    id: true,
                    name: true,
                    code: true,
                    city: true,
                    address: true,
                    health: true,
                    sla: true,
                    criticalAlerts: true,
                    todayAttendance: true,
                    openIssues: true,
                    monthlyBudget: true,
                    usedBudget: true,
                    staffCount: true,
                    applianceRisk: true,
                    auditScore: true,
                    performance: true,
                    revenueIndex: true,
                    customerFootfall: true,
                    lastVisit: true,
                },
                orderBy: { name: "asc" },
            }),
            // Task completion rates per branch
            prisma_1.default.check.groupBy({
                by: ["branchId", "status"],
                _count: { id: true },
            }),
            // Complaint counts per branch
            prisma_1.default.complaint.groupBy({
                by: ["branchId", "status", "priority"],
                _count: { id: true },
            }),
            // Approval amounts per branch
            prisma_1.default.approval.groupBy({
                by: ["branchId", "status"],
                _sum: { amount: true },
                _count: { id: true },
            }),
        ]);
        // Build branch-level analytics object
        const analytics = branches.map((b) => {
            const branchTasks = taskStats.filter((t) => t.branchId === b.id);
            const totalTasks = branchTasks.reduce((s, t) => s + t._count.id, 0);
            const completedTasks = branchTasks.find((t) => t.status === "Completed")?._count.id || 0;
            const branchComplaints = complaintStats.filter((c) => c.branchId === b.id);
            const openComplaints = branchComplaints.filter((c) => c.status !== "RESOLVED").reduce((s, c) => s + c._count.id, 0);
            const resolvedComplaints = branchComplaints.find((c) => c.status === "RESOLVED")?._count.id || 0;
            const criticalComplaints = branchComplaints.filter((c) => c.status !== "RESOLVED" && c.priority === "Critical").reduce((s, c) => s + c._count.id, 0);
            const branchApprovals = approvalStats.filter((a) => a.branchId === b.id);
            const approvedCapex = branchApprovals.find((a) => a.status === "Approved")?._sum.amount || 0;
            return {
                branchId: b.id,
                branchName: b.name,
                branchCode: b.code,
                city: b.city,
                health: b.health,
                sla: b.sla,
                criticalAlerts: b.criticalAlerts,
                todayAttendance: b.todayAttendance,
                staffCount: b.staffCount,
                monthlyBudget: b.monthlyBudget,
                usedBudget: b.usedBudget,
                budgetBurnPct: b.monthlyBudget > 0 ? Math.round((b.usedBudget / b.monthlyBudget) * 100) : 0,
                taskCompletionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
                totalTasks,
                completedTasks,
                openComplaints,
                criticalComplaints,
                resolvedComplaints,
                approvedCapex,
                applianceRisk: b.applianceRisk,
                auditScore: b.auditScore,
            };
        });
        return res.status(200).json({ analytics });
    }
    catch (error) {
        console.error("AM analytics error:", error);
        return res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
    }
};
exports.amAnalytics = amAnalytics;
/**
 * GET /api/rm/tasks
 * Returns all tasks (RM scope) with lean fields.
 */
const amTasks = async (req, res) => {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ message: "Unauthorized" });
        if (user.role !== client_1.RoleId.am)
            return res.status(403).json({ message: "Forbidden: AM only" });
        const branchScopeFilter = { id: { in: user.branchScope || [] } };
        const relScopeFilter = { branchId: { in: user.branchScope || [] } };
        const userScopeFilter = { OR: [{ branchId: { in: user.branchScope || [] } }, { managerId: user.id }] };
        const { status, branchId } = req.query;
        const tasks = await prisma_1.default.check.findMany({
            where: {
                ...(status ? { status: status } : {}),
                ...(branchId ? { branchId: String(branchId) } : {}),
            },
            select: {
                id: true,
                title: true,
                status: true,
                schedule: true,
                zone: true,
                deadline: true,
                assignedToId: true,
                assignedById: true,
                audience: true,
                applianceId: true,
                priority: true,
                branchId: true,
                checklistDone: true,
                checklistTotal: true,
                notes: true,
                escalation: true,
                proofRequired: true,
                proofLabel: true,
                redoReason: true,
                proofUrl: true,
                completedById: true,
                completedAt: true,
            },
            orderBy: [{ status: "asc" }, { deadline: "asc" }],
        });
        return res.status(200).json({
            checks: tasks.map((t) => ({
                ...t,
                assignedTo: t.assignedToId,
                assignedBy: t.assignedById,
                completedBy: t.completedById,
            })),
        });
    }
    catch (error) {
        console.error("AM tasks error:", error);
        return res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
    }
};
exports.amTasks = amTasks;
/**
 * GET /api/rm/finance/export
 * Streams a CSV file containing all approvals and branch budget summary.
 */
const amFinanceExport = async (req, res) => {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ message: "Unauthorized" });
        if (user.role !== client_1.RoleId.am)
            return res.status(403).json({ message: "Forbidden: AM only" });
        const branchScopeFilter = { id: { in: user.branchScope || [] } };
        const relScopeFilter = { branchId: { in: user.branchScope || [] } };
        const userScopeFilter = { OR: [{ branchId: { in: user.branchScope || [] } }, { managerId: user.id }] };
        const [approvals, branches] = await Promise.all([
            prisma_1.default.approval.findMany({
                where: relScopeFilter,
                select: { id: true, title: true, kind: true, amount: true, status: true, priority: true, branchId: true, stage: true, note: true, updatedAt: true },
                orderBy: { updatedAt: "desc" },
            }),
            prisma_1.default.branch.findMany({
                where: branchScopeFilter,
                select: { id: true, name: true, city: true, code: true, monthlyBudget: true, usedBudget: true },
                orderBy: { name: "asc" },
            }),
        ]);
        // Build CSV in-memory
        const branchMap = new Map(branches.map((b) => [b.id, b]));
        const rows = [
            "ID,Title,Kind,Amount,Status,Priority,Branch,City,Stage,Note,UpdatedAt",
            ...approvals.map((a) => {
                const b = branchMap.get(a.branchId);
                const cols = [
                    a.id,
                    `"${a.title.replace(/"/g, '""')}"`,
                    a.kind,
                    a.amount.toFixed(2),
                    a.status,
                    a.priority,
                    b ? `"${b.name}"` : a.branchId,
                    b ? b.city : "",
                    a.stage,
                    `"${a.note.replace(/"/g, '""')}"`,
                    a.updatedAt.toISOString(),
                ];
                return cols.join(",");
            }),
            "",
            "--- BRANCH BUDGET SUMMARY ---",
            "BranchID,Name,City,Code,MonthlyBudget,UsedBudget,BurnPct",
            ...branches.map((b) => {
                const burnPct = b.monthlyBudget > 0 ? ((b.usedBudget / b.monthlyBudget) * 100).toFixed(1) : "0.0";
                return [b.id, `"${b.name}"`, b.city, b.code, b.monthlyBudget.toFixed(2), b.usedBudget.toFixed(2), burnPct].join(",");
            }),
        ];
        const csv = rows.join("\n");
        const filename = `finance-export-${new Date().toISOString().slice(0, 10)}.csv`;
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        return res.status(200).send(csv);
    }
    catch (error) {
        console.error("AM finance export error:", error);
        return res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
    }
};
exports.amFinanceExport = amFinanceExport;
/**
 * PATCH /api/rm/users/:id/status
 * Locks or unlocks a user account. Body: { status: "Active" | "Locked" }
 */
const amUpdateUserStatus = async (req, res) => {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ message: "Unauthorized" });
        if (user.role !== client_1.RoleId.am)
            return res.status(403).json({ message: "Forbidden: AM only" });
        const branchScopeFilter = { id: { in: user.branchScope || [] } };
        const relScopeFilter = { branchId: { in: user.branchScope || [] } };
        const userScopeFilter = { OR: [{ branchId: { in: user.branchScope || [] } }, { managerId: user.id }] };
        const { id } = req.params;
        const { status } = req.body;
        if (!status || !["Active", "Locked"].includes(status)) {
            return res.status(400).json({ message: 'status must be "Active" or "Locked"' });
        }
        // Prevent RM from locking themselves
        if (id === user.id)
            return res.status(400).json({ message: "Cannot change your own account status" });
        const target = await prisma_1.default.user.findUnique({ where: { id }, select: { id: true, name: true, role: true, status: true } });
        if (!target)
            return res.status(404).json({ message: "User not found" });
        const updated = await prisma_1.default.user.update({
            where: { id },
            data: { status },
            select: { id: true, name: true, email: true, role: true, status: true, branchId: true },
        });
        return res.status(200).json({ user: updated });
    }
    catch (error) {
        console.error("AM update user status error:", error);
        return res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
    }
};
exports.amUpdateUserStatus = amUpdateUserStatus;
