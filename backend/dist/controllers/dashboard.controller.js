"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardMetrics = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../lib/prisma"));
const getDashboardMetrics = async (req, res) => {
    try {
        const userContext = req.user;
        if (!userContext) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const { role, branchId, branchScope = [] } = userContext;
        if (role === client_1.RoleId.lc) {
            // 1. Local Coordinator Dashboard Metrics
            if (!branchId) {
                return res.status(400).json({ message: "LC user has no branch assignment" });
            }
            const branch = await prisma_1.default.branch.findUnique({
                where: { id: branchId },
            });
            if (!branch) {
                return res.status(404).json({ message: "Branch not found" });
            }
            // Fetch task stats
            const tasks = await prisma_1.default.check.findMany({ where: { branchId } });
            const pendingTasksCount = tasks.filter(t => t.status === client_1.TaskStatus.Pending).length;
            const activeTasksCount = tasks.filter(t => t.status === client_1.TaskStatus.Pending || t.status === client_1.TaskStatus.InProgress).length;
            const completedTasksCount = tasks.filter(t => t.status === client_1.TaskStatus.Completed).length;
            const closureRate = tasks.length ? Math.round((completedTasksCount / tasks.length) * 100) : 0;
            // Fetch open issues count
            const openComplaintsCount = await prisma_1.default.complaint.count({
                where: { branchId, status: { notIn: [client_1.ComplaintStatus.RESOLVED] } }
            });
            // Fetch branch appliances
            const appliances = await prisma_1.default.appliance.findMany({
                where: { branchId }
            });
            const totalAppliances = appliances.length;
            const riskyAppliances = appliances.filter(a => a.status !== "Operational" || a.approvalStatus.includes("Pending"));
            // Fetch active tasks for action queue
            const activeTasks = await prisma_1.default.check.findMany({
                where: { branchId, status: { in: [client_1.TaskStatus.Pending, client_1.TaskStatus.InProgress] } },
                orderBy: { deadline: "asc" },
                take: 4
            });
            return res.status(200).json({
                role,
                branch: {
                    id: branch.id,
                    name: branch.name,
                    city: branch.city,
                    health: branch.health,
                    sla: branch.sla,
                    usedBudget: branch.usedBudget,
                    monthlyBudget: branch.monthlyBudget,
                    criticalAlerts: branch.criticalAlerts,
                    auditScore: branch.auditScore,
                },
                stats: {
                    pendingTasks: pendingTasksCount,
                    activeTasks: activeTasksCount,
                    openIssues: openComplaintsCount,
                    closureRate,
                    totalAppliances,
                    riskyAppliances: riskyAppliances.length,
                },
                actionQueue: activeTasks.map(t => ({
                    id: t.id,
                    title: t.title,
                    zone: t.zone,
                    schedule: t.schedule,
                    status: t.status,
                })),
                appliances: appliances.map(a => ({
                    id: a.id,
                    name: a.name,
                    category: a.category,
                    zone: a.zone,
                    status: a.status,
                    healthScore: a.healthScore,
                    brand: a.brand,
                    model: a.model,
                    serial: a.serial,
                })),
                riskyAppliances: riskyAppliances.map(a => ({
                    id: a.id,
                    name: a.name,
                    category: a.category,
                    zone: a.zone,
                    status: a.status,
                }))
            });
        }
        else if (role === client_1.RoleId.branchManager) {
            // 2. Branch Manager (BAM, AM, AA) Dashboard Metrics
            // Scope branches based on BM/AA scope
            const branches = await prisma_1.default.branch.findMany({
                where: { id: { in: branchScope } }
            });
            const totalBranches = branches.length;
            const totalStaff = branches.reduce((sum, b) => sum + b.staffCount, 0);
            const totalIssues = branches.reduce((sum, b) => sum + b.openIssues, 0);
            const totalCriticalAlerts = branches.reduce((sum, b) => sum + b.criticalAlerts, 0);
            const totalBudget = branches.reduce((sum, b) => sum + b.monthlyBudget, 0);
            const totalUsed = branches.reduce((sum, b) => sum + b.usedBudget, 0);
            // Pending approvals
            const pendingApprovals = await prisma_1.default.approval.findMany({
                where: { branchId: { in: branchScope }, status: client_1.ApprovalStatus.Pending },
                include: { requestedBy: { select: { name: true } } },
                take: 3
            });
            // Visits scoped to BM
            const visits = await prisma_1.default.visit.findMany({
                where: { branchId: { in: branchScope } },
                orderBy: { scheduledAt: "asc" }
            });
            const incompleteVisitsCount = visits.filter(v => v.status !== client_1.VisitStatus.Completed && v.status !== client_1.VisitStatus.Cancelled).length;
            // Watchlist derivation
            const watchlistItems = branches.flatMap(b => {
                const items = [];
                if (b.criticalAlerts > 0) {
                    items.push({
                        title: b.name,
                        detail: `${b.criticalAlerts} critical alert${b.criticalAlerts > 1 ? "s" : ""} need immediate attention`,
                        tone: "error",
                        badgeLabel: "At Risk",
                        badgeType: "At Risk",
                    });
                }
                if (b.usedBudget / b.monthlyBudget > 0.75) {
                    const pct = Math.round((b.usedBudget / b.monthlyBudget) * 100);
                    items.push({
                        title: `${b.name} budget burn`,
                        detail: `Already at ${pct}% of monthly budget`,
                        tone: "warning",
                        badgeLabel: "Warning",
                        badgeType: "Warning",
                    });
                }
                if (b.sla < 90) {
                    items.push({
                        title: `${b.name} SLA drop`,
                        detail: `SLA at ${b.sla}%, below 90% threshold`,
                        tone: "info",
                        badgeLabel: "Monitor",
                        badgeType: "Info",
                    });
                }
                return items;
            }).slice(0, 4);
            return res.status(200).json({
                role,
                stats: {
                    totalBranches,
                    totalStaff,
                    totalIssues,
                    totalCriticalAlerts,
                    totalBudget,
                    totalUsed,
                    incompleteVisits: incompleteVisitsCount,
                    pendingApprovalsCount: pendingApprovals.length,
                },
                branches: branches.map(b => ({
                    id: b.id,
                    code: b.code,
                    name: b.name,
                    city: b.city,
                    staffCount: b.staffCount,
                    criticalAlerts: b.criticalAlerts,
                    todayAttendance: b.todayAttendance,
                    sla: b.sla,
                    openIssues: b.openIssues,
                    nextVisit: b.nextVisit,
                })),
                watchlist: watchlistItems,
                upcomingVisits: visits.slice(0, 5).map(v => {
                    const br = branches.find(b => b.id === v.branchId);
                    return {
                        id: v.id,
                        branchName: br?.name || "Unknown Branch",
                        purpose: v.purpose,
                        scheduledAt: v.scheduledAt.toISOString().slice(0, 16).replace("T", " "),
                        status: v.status,
                    };
                }),
                pendingApprovals: pendingApprovals.map(a => {
                    const br = branches.find(b => b.id === a.branchId);
                    return {
                        id: a.id,
                        title: a.title,
                        kind: a.kind,
                        branchName: br?.name || "Unknown Branch",
                        amount: a.amount,
                        priority: a.priority,
                        requestedBy: a.requestedBy.name,
                        note: a.note,
                    };
                })
            });
        }
        else if (role === client_1.RoleId.rm) {
            // 3. Regional Manager Dashboard Metrics (RM views all branches)
            const branches = await prisma_1.default.branch.findMany();
            const approvals = await prisma_1.default.approval.findMany({ include: { requestedBy: { select: { name: true } } } });
            const complaints = await prisma_1.default.complaint.findMany();
            const totalBranches = branches.length;
            const avgHealth = totalBranches
                ? Math.round(branches.reduce((sum, b) => sum + b.health, 0) / totalBranches)
                : 100;
            const avgAttendance = totalBranches
                ? Math.round(branches.reduce((sum, b) => sum + b.todayAttendance, 0) / totalBranches)
                : 100;
            const criticalAlerts = branches.reduce((sum, b) => sum + b.criticalAlerts, 0);
            const pendingApprovalsCount = approvals.filter(a => a.status === client_1.ApprovalStatus.Pending).length;
            // Decision feed: high-cost complaints (>20k) and pending approvals at RM stage
            const decisionFeed = [];
            complaints
                .filter(c => 0 > 20000 && c.status !== client_1.ComplaintStatus.RESOLVED)
                .forEach(c => {
                const br = branches.find(b => b.id === c.branchId);
                decisionFeed.push({
                    text: `Approve ${0 > 40000 ? "capex" : "repair"} for ${br?.name || "branch"} â€” ${c.complaintId}.`,
                    priority: c.priority,
                });
            });
            approvals
                .filter(a => a.status === client_1.ApprovalStatus.Pending && a.stage === "RM")
                .forEach(a => {
                const br = branches.find(b => b.id === a.branchId);
                decisionFeed.push({
                    text: `${a.title} at ${br?.name || "branch"} is awaiting RM approval.`,
                    priority: a.priority,
                });
            });
            branches
                .filter(b => b.sla < 90)
                .forEach(b => {
                decisionFeed.push({
                    text: `${b.name} SLA at ${b.sla}% â€” push visit report within 24 hrs.`,
                    priority: "High",
                });
            });
            // Watchlist items: critical approvals, high budget usage, escalated complaints, low health branches
            const watchlistItems = [];
            approvals
                .filter(a => a.status === client_1.ApprovalStatus.Pending && a.priority === client_1.Priority.Critical)
                .forEach(a => {
                const br = branches.find(b => b.id === a.branchId);
                watchlistItems.push(`${br?.name || "Branch"}: ${a.title} needs approval now.`);
            });
            branches
                .filter(b => b.usedBudget / b.monthlyBudget > 0.75)
                .forEach(b => {
                const pct = Math.round((b.usedBudget / b.monthlyBudget) * 100);
                watchlistItems.push(`${b.name} crossed ${pct}% monthly budget already.`);
            });
            complaints
                .filter(c => c.status === client_1.ComplaintStatus.VENDOR_PENDING)
                .forEach(c => {
                const br = branches.find(b => b.id === c.branchId);
                watchlistItems.push(`${br?.name || "Branch"}: ${c.complaintId} is escalated.`);
            });
            branches
                .filter(b => b.health < 80)
                .forEach(b => {
                watchlistItems.push(`${b.name} health score at ${b.health}% â€” review needed.`);
            });
            return res.status(200).json({
                role,
                stats: {
                    avgHealth,
                    avgAttendance,
                    criticalAlerts,
                    pendingApprovals: pendingApprovalsCount,
                },
                branches: branches.map(b => ({
                    id: b.id,
                    code: b.code,
                    name: b.name,
                    city: b.city,
                    revenueIndex: b.revenueIndex,
                    criticalAlerts: b.criticalAlerts,
                    auditScore: b.auditScore,
                    health: b.health,
                    todayAttendance: b.todayAttendance,
                    sla: b.sla,
                    usedBudget: b.usedBudget,
                    monthlyBudget: b.monthlyBudget,
                })),
                watchlist: watchlistItems.slice(0, 5),
                decisionFeed: decisionFeed.slice(0, 4)
            });
        }
    }
    catch (error) {
        console.error("Get dashboard metrics error: ", error);
        return res.status(500).json({
            message: "Server error generating metrics",
            error: process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred"
        });
    }
};
exports.getDashboardMetrics = getDashboardMetrics;
