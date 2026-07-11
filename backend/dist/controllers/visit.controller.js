"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitVisitReport = exports.createVisit = exports.getVisits = void 0;
const client_1 = require("@prisma/client");
const notification_service_1 = require("../services/notification.service");
const prisma_1 = __importDefault(require("../lib/prisma"));
const getTodayIST = () => {
    const options = { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" };
    return new Intl.DateTimeFormat("en-CA", options).format(new Date());
};
const getVisits = async (req, res) => {
    try {
        const userContext = req.user;
        if (!userContext) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const { branchId, status } = req.query;
        const filters = {};
        if (userContext.role === client_1.RoleId.lc) {
            filters.branchId = userContext.branchId || "";
        }
        else if (userContext.role === client_1.RoleId.branchManager) {
            if (branchId) {
                if (userContext.branchScope.includes(String(branchId))) {
                    filters.branchId = String(branchId);
                }
                else {
                    return res.status(403).json({ message: "Forbidden: branch out of scope" });
                }
            }
            else {
                filters.branchId = { in: userContext.branchScope };
            }
        }
        else if (userContext.role === client_1.RoleId.rm) {
            if (branchId) {
                filters.branchId = String(branchId);
            }
        }
        if (status) {
            filters.status = status;
        }
        const visits = await prisma_1.default.visit.findMany({
            where: filters,
            orderBy: { scheduledAt: "asc" },
            include: {
                manager: { select: { id: true, name: true, role: true, position: true } },
                branch: { select: { name: true } }
            }
        });
        return res.status(200).json(visits);
    }
    catch (error) {
        console.error("Get visits error: ", error);
        return res.status(500).json({
            message: "Server error listing visits",
            error: process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred"
        });
    }
};
exports.getVisits = getVisits;
const createVisit = async (req, res) => {
    try {
        const userContext = req.user;
        if (!userContext || userContext.role === client_1.RoleId.lc) {
            return res.status(403).json({ message: "Forbidden: Location Controllers cannot schedule visits" });
        }
        const { branchId, scheduledAt, purpose, agenda } = req.body;
        if (!branchId || !scheduledAt || !purpose) {
            return res.status(400).json({ message: "BranchId, scheduledAt, and purpose are required" });
        }
        // Verify scope
        if (userContext.role === client_1.RoleId.branchManager && !userContext.branchScope.includes(branchId)) {
            return res.status(403).json({ message: "Forbidden: branch out of scope" });
        }
        const parsedDate = new Date(scheduledAt);
        if (isNaN(parsedDate.getTime())) {
            return res.status(400).json({ message: "Invalid date format for scheduledAt" });
        }
        const visit = await prisma_1.default.visit.create({
            data: {
                branchId,
                managerId: userContext.id,
                scheduledAt: parsedDate,
                purpose,
                agenda: agenda || "Branch review",
                status: client_1.VisitStatus.Scheduled
            },
            include: {
                branch: { select: { name: true } }
            }
        });
        // Update Branch nextVisit field
        const options = { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" };
        const dateString = new Intl.DateTimeFormat("en-CA", options).format(parsedDate);
        await prisma_1.default.branch.update({
            where: { id: branchId },
            data: { nextVisit: dateString }
        }).catch((err) => console.error("Failed to update branch nextVisit:", err));
        // Notify LC(s) at this branch
        const lcs = await prisma_1.default.user.findMany({
            where: { branchId, role: client_1.RoleId.lc },
            select: { id: true }
        });
        const lcIds = lcs.map(u => u.id);
        if (lcIds.length > 0) {
            await (0, notification_service_1.sendPushNotification)(lcIds, `Manager Visit Scheduled`, `${userContext.name} scheduled a branch visit to ${visit.branch.name} on ${dateString} for: ${purpose}`).catch((err) => console.error("Failed to send push notification to LCs:", err));
        }
        // Create system notification
        await prisma_1.default.notification.create({
            data: {
                title: `Branch Visit Scheduled`,
                detail: `${userContext.name} is visiting ${visit.branch.name} branch on ${dateString}.`,
                scope: [client_1.RoleId.lc, client_1.RoleId.branchManager, client_1.RoleId.rm],
                branchId,
                priority: client_1.Priority.Medium
            }
        }).catch((err) => console.error("Failed to create system notification for visit:", err));
        return res.status(201).json({
            message: "Visit scheduled successfully",
            visit
        });
    }
    catch (error) {
        console.error("Create visit error: ", error);
        return res.status(500).json({
            message: "Server error scheduling visit",
            error: process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred"
        });
    }
};
exports.createVisit = createVisit;
const submitVisitReport = async (req, res) => {
    try {
        const userContext = req.user;
        if (!userContext || userContext.role === client_1.RoleId.lc) {
            return res.status(403).json({ message: "Forbidden: LCs cannot submit visit reports" });
        }
        const { id } = req.params;
        const { report } = req.body;
        if (!report) {
            return res.status(400).json({ message: "Report text is required" });
        }
        const visit = await prisma_1.default.visit.findUnique({ where: { id } });
        if (!visit) {
            return res.status(404).json({ message: "Visit not found" });
        }
        // Verify scope
        if (userContext.role === client_1.RoleId.branchManager && !userContext.branchScope.includes(visit.branchId)) {
            return res.status(403).json({ message: "Forbidden: branch out of scope" });
        }
        const updated = await prisma_1.default.visit.update({
            where: { id },
            data: {
                status: client_1.VisitStatus.Completed,
                report
            },
            include: {
                branch: { select: { name: true } }
            }
        });
        const todayDate = getTodayIST();
        // Update branch table fields (lastVisit and reset nextVisit)
        await prisma_1.default.branch.update({
            where: { id: visit.branchId },
            data: {
                lastVisit: todayDate,
                nextVisit: "Pending"
            }
        }).catch((err) => console.error("Failed to update branch lastVisit/nextVisit:", err));
        // Create system notification
        await prisma_1.default.notification.create({
            data: {
                title: `Branch Visit Completed`,
                detail: `${userContext.name} completed visit and filed report for ${updated.branch.name} branch.`,
                scope: [client_1.RoleId.lc, client_1.RoleId.branchManager, client_1.RoleId.rm],
                branchId: visit.branchId,
                priority: client_1.Priority.Low
            }
        }).catch((err) => console.error("Failed to create system notification for completed visit:", err));
        return res.status(200).json({
            message: "Visit report submitted successfully",
            visit: updated
        });
    }
    catch (error) {
        console.error("Submit visit report error: ", error);
        return res.status(500).json({
            message: "Server error submitting visit report",
            error: process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred"
        });
    }
};
exports.submitVisitReport = submitVisitReport;
