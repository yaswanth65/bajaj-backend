"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.lcEditComplaint = exports.lcCheckout = exports.lcTasks = exports.lcDashboard = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../../lib/prisma"));
// Helper: today's date in IST
const getTodayIST = () => {
    const options = { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" };
    return new Intl.DateTimeFormat("en-CA", options).format(new Date());
};
/**
 * GET /api/lc/dashboard
 * Returns everything the LC home screen needs in a single query.
 * Shape: { branch, tasks, complaints, appliances, todayAttendance }
 */
const lcDashboard = async (req, res) => {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ message: "Unauthorized" });
        if (user.role !== client_1.RoleId.lc)
            return res.status(403).json({ message: "Forbidden: LC only" });
        const branchId = user.branchId;
        if (!branchId)
            return res.status(400).json({ message: "LC has no branch assigned" });
        const today = getTodayIST();
        const [branch, checks, complaints, appliances, todayAttendance] = await Promise.all([
            // Branch Ã¢â‚¬â€ only the KPI fields the LC screen uses
            prisma_1.default.branch.findUnique({
                where: { id: branchId },
                select: {
                    id: true,
                    name: true,
                    code: true,
                    city: true,
                    health: true,
                    sla: true,
                    criticalAlerts: true,
                    openIssues: true,
                    monthlyBudget: true,
                    usedBudget: true,
                    staffCount: true,
                    todayAttendance: true,
                    applianceRisk: true,
                    nextVisit: true,
                    auditScore: true,
                },
            }),
            // Checks Ã¢â‚¬â€ my branch, only weekly items needed for home + checks screens
            prisma_1.default.check.findMany({
                where: { branchId, schedule: "Weekly" },
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
                },
                orderBy: { deadline: "asc" },
            }),
            // Complaints Ã¢â‚¬â€ my branch, lean
            prisma_1.default.complaint.findMany({
                where: { branchId },
                select: {
                    id: true,
                    complaintId: true,
                    priority: true,
                    status: true,
                    branchId: true,
                    description: true,
                    createdAt: true,
                },
                orderBy: { createdAt: "desc" },
            }),
            // Appliances Ã¢â‚¬â€ my branch, lean
            prisma_1.default.appliance.findMany({
                where: { branchId },
                select: {
                    id: true,
                    name: true,
                    category: true,
                    brand: true,
                    zone: true,
                    status: true,
                    healthScore: true,
                    approvalStatus: true,
                    branchId: true,
                    amcVendor: true,
                    nextService: true,
                    pendingParts: true,
                },
                orderBy: { name: "asc" },
            }),
            // Today's attendance for this LC only
            prisma_1.default.attendanceLog.findFirst({
                where: { userId: user.id, date: today },
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
                    weeklyTasks: { select: { id: true, description: true, estimatedHours: true } },
                },
            }),
        ]);
        // Normalize task fields for frontend compatibility
        const normalizedChecks = checks.map((t) => ({
            ...t,
            assignedTo: t.assignedToId,
            assignedBy: t.assignedById,
        }));
        return res.status(200).json({
            branch,
            checks: normalizedChecks,
            complaints,
            appliances,
            todayAttendance,
        });
    }
    catch (error) {
        console.error("LC dashboard error:", error);
        return res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
    }
};
exports.lcDashboard = lcDashboard;
/**
 * GET /api/lc/tasks
 * Returns only weekly checks visible by this LC.
 */
const lcTasks = async (req, res) => {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ message: "Unauthorized" });
        if (user.role !== client_1.RoleId.lc)
            return res.status(403).json({ message: "Forbidden: LC only" });
        const branchId = user.branchId;
        if (!branchId)
            return res.status(400).json({ message: "LC has no branch" });
        const { status } = req.query;
        const checks = await prisma_1.default.check.findMany({
            where: {
                branchId,
                schedule: "Weekly",
                ...(status ? { status: status } : {}),
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
            checks: checks.map((t) => ({
                ...t,
                assignedTo: t.assignedToId,
                assignedBy: t.assignedById,
                completedBy: t.completedById,
            })),
        });
    }
    catch (error) {
        console.error("LC tasks error:", error);
        return res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
    }
};
exports.lcTasks = lcTasks;
/**
 * PUT /api/lc/attendance/:id/checkout
 * Registers the check-out timestamp for the LC's own attendance record.
 * Only the owner of the record can check out.
 */
const lcCheckout = async (req, res) => {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ message: "Unauthorized" });
        if (user.role !== client_1.RoleId.lc)
            return res.status(403).json({ message: "Forbidden: LC only" });
        const { id } = req.params;
        const { checkOut } = req.body;
        if (!checkOut)
            return res.status(400).json({ message: "checkOut time is required (HH:MM)" });
        // Security: LC can only check out their own record
        const existing = await prisma_1.default.attendanceLog.findUnique({ where: { id }, select: { id: true, userId: true, checkOut: true } });
        if (!existing)
            return res.status(404).json({ message: "Attendance record not found" });
        if (existing.userId !== user.id)
            return res.status(403).json({ message: "You can only check out your own record" });
        if (existing.checkOut)
            return res.status(409).json({ message: "Already checked out" });
        const updated = await prisma_1.default.attendanceLog.update({
            where: { id },
            data: { checkOut },
            select: { id: true, userId: true, date: true, checkIn: true, checkOut: true, status: true },
        });
        return res.status(200).json({ attendance: updated });
    }
    catch (error) {
        console.error("LC checkout error:", error);
        return res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
    }
};
exports.lcCheckout = lcCheckout;
/**
 * PUT /api/lc/complaints/:id
 * Allows LC to edit their own complaint Ã¢â‚¬â€ ONLY if it has not yet been assigned to a vendor.
 */
const lcEditComplaint = async (req, res) => {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ message: "Unauthorized" });
        if (user.role !== client_1.RoleId.lc)
            return res.status(403).json({ message: "Forbidden: LC only" });
        const { id } = req.params;
        const { title, description, impact, priority, estimatedCost } = req.body;
        const existing = await prisma_1.default.complaint.findUnique({
            where: { id },
            select: { id: true, raisedById: true, vendorId: true },
        });
        if (!existing)
            return res.status(404).json({ message: "Complaint not found" });
        if (existing.raisedById !== user.id)
            return res.status(403).json({ message: "You can only edit your own complaints" });
        if (existing.vendorId && existing.vendorId !== "Not assigned") {
            return res.status(409).json({ message: "Complaint cannot be edited after vendor assignment" });
        }
        const updated = await prisma_1.default.complaint.update({
            where: { id },
            data: {
                ...(description !== undefined && { description }),
                ...(priority !== undefined && { priority }),
            },
            select: {
                id: true, complaintId: true, priority: true,
                status: true, branchId: true, description: true, createdAt: true, updatedAt: true,
            },
        });
        return res.status(200).json({ complaint: updated });
    }
    catch (error) {
        console.error("LC edit complaint error:", error);
        return res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
    }
};
exports.lcEditComplaint = lcEditComplaint;
