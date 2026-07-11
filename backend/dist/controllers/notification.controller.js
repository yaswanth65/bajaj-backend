"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.escalateAlert = exports.acknowledgeAlert = exports.toggleBookmark = exports.toggleRead = exports.getNotifications = void 0;
const client_1 = require("@prisma/client");
const notification_service_1 = require("../services/notification.service");
const stats_1 = require("../lib/stats");
const prisma_1 = __importDefault(require("../lib/prisma"));
const getNotifications = async (req, res) => {
    try {
        const userContext = req.user;
        if (!userContext) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const { branchId, read, bookmarked } = req.query;
        const filters = {};
        // Filter by role scope
        filters.scope = { has: userContext.role };
        // Filter by branch scope
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
        if (read !== undefined) {
            filters.read = read === "true";
        }
        if (bookmarked !== undefined) {
            filters.bookmarked = bookmarked === "true";
        }
        const notifications = await prisma_1.default.notification.findMany({
            where: filters,
            orderBy: { createdAt: "desc" }
        });
        const enriched = notifications.map((n) => ({
            ...n,
            time: n.createdAt ? (0, stats_1.relativeTime)(n.createdAt) : n.time,
        }));
        return res.status(200).json(enriched);
    }
    catch (error) {
        console.error("Get notifications error: ", error);
        return res.status(500).json({
            message: "Server error listing notifications",
            error: process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred"
        });
    }
};
exports.getNotifications = getNotifications;
const toggleRead = async (req, res) => {
    try {
        const userContext = req.user;
        if (!userContext) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const { id } = req.params;
        const notification = await prisma_1.default.notification.findUnique({ where: { id } });
        if (!notification) {
            return res.status(404).json({ message: "Notification not found" });
        }
        // IDOR Check
        if (userContext.role === client_1.RoleId.lc && notification.branchId !== userContext.branchId) {
            return res.status(403).json({ message: "Forbidden: Notification is outside your branch scope" });
        }
        if (userContext.role === client_1.RoleId.branchManager && !userContext.branchScope.includes(notification.branchId)) {
            return res.status(403).json({ message: "Forbidden: Notification is outside your branch scope" });
        }
        const updated = await prisma_1.default.notification.update({
            where: { id },
            data: { read: !notification.read }
        });
        return res.status(200).json(updated);
    }
    catch (error) {
        console.error("Toggle read error: ", error);
        return res.status(500).json({
            message: "Server error toggling read status",
            error: process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred"
        });
    }
};
exports.toggleRead = toggleRead;
const toggleBookmark = async (req, res) => {
    try {
        const userContext = req.user;
        if (!userContext) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const { id } = req.params;
        const notification = await prisma_1.default.notification.findUnique({ where: { id } });
        if (!notification) {
            return res.status(404).json({ message: "Notification not found" });
        }
        // IDOR Check
        if (userContext.role === client_1.RoleId.lc && notification.branchId !== userContext.branchId) {
            return res.status(403).json({ message: "Forbidden: Notification is outside your branch scope" });
        }
        if (userContext.role === client_1.RoleId.branchManager && !userContext.branchScope.includes(notification.branchId)) {
            return res.status(403).json({ message: "Forbidden: Notification is outside your branch scope" });
        }
        const updated = await prisma_1.default.notification.update({
            where: { id },
            data: { bookmarked: !notification.bookmarked }
        });
        return res.status(200).json(updated);
    }
    catch (error) {
        console.error("Toggle bookmark error: ", error);
        return res.status(500).json({
            message: "Server error toggling bookmark",
            error: process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred"
        });
    }
};
exports.toggleBookmark = toggleBookmark;
const acknowledgeAlert = async (req, res) => {
    try {
        const userContext = req.user;
        if (!userContext) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const { id } = req.params;
        const notification = await prisma_1.default.notification.findUnique({ where: { id } });
        if (!notification) {
            return res.status(404).json({ message: "Notification not found" });
        }
        // IDOR Check
        if (userContext.role === client_1.RoleId.lc && notification.branchId !== userContext.branchId) {
            return res.status(403).json({ message: "Forbidden: Notification is outside your branch scope" });
        }
        if (userContext.role === client_1.RoleId.branchManager && !userContext.branchScope.includes(notification.branchId)) {
            return res.status(403).json({ message: "Forbidden: Notification is outside your branch scope" });
        }
        const updated = await prisma_1.default.$transaction(async (tx) => {
            // Mark as read
            const result = await tx.notification.update({
                where: { id },
                data: { read: true }
            });
            // Decrement critical alerts count on the branch if it was a high/critical priority alert
            if (notification.priority === client_1.Priority.Critical || notification.priority === client_1.Priority.High) {
                await tx.branch.update({
                    where: { id: notification.branchId },
                    data: { criticalAlerts: { decrement: 1 } }
                });
            }
            return result;
        });
        return res.status(200).json({
            message: "Alert acknowledged successfully",
            notification: updated
        });
    }
    catch (error) {
        console.error("Acknowledge alert error: ", error);
        return res.status(500).json({
            message: "Server error acknowledging alert",
            error: process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred"
        });
    }
};
exports.acknowledgeAlert = acknowledgeAlert;
const escalateAlert = async (req, res) => {
    try {
        const userContext = req.user;
        if (!userContext) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const { id } = req.params;
        const notification = await prisma_1.default.notification.findUnique({
            where: { id },
            include: { branch: { select: { name: true } } }
        });
        if (!notification) {
            return res.status(404).json({ message: "Notification not found" });
        }
        // IDOR Check
        if (userContext.role === client_1.RoleId.lc && notification.branchId !== userContext.branchId) {
            return res.status(403).json({ message: "Forbidden: Notification is outside your branch scope" });
        }
        if (userContext.role === client_1.RoleId.branchManager && !userContext.branchScope.includes(notification.branchId)) {
            return res.status(403).json({ message: "Forbidden: Notification is outside your branch scope" });
        }
        // Add rm to scopes if not already present
        const currentScopes = notification.scope;
        if (!currentScopes.includes(client_1.RoleId.rm)) {
            currentScopes.push(client_1.RoleId.rm);
        }
        const updated = await prisma_1.default.$transaction(async (tx) => {
            const result = await tx.notification.update({
                where: { id },
                data: {
                    scope: currentScopes,
                    priority: client_1.Priority.Critical
                }
            });
            // Increment critical alerts count on the branch if it wasn't already critical
            if (notification.priority !== client_1.Priority.Critical) {
                await tx.branch.update({
                    where: { id: notification.branchId },
                    data: { criticalAlerts: { increment: 1 } }
                });
            }
            return result;
        });
        // Notify RM (outside transaction)
        await (0, notification_service_1.notifyRegionalManagers)(`Escalated Alert: ${notification.title}`, `Critical alert at ${notification.branch.name} has been escalated to Regional Management.`).catch((err) => console.error("Failed to notify RMs of escalated alert:", err));
        return res.status(200).json({
            message: "Alert escalated to RM successfully",
            notification: updated
        });
    }
    catch (error) {
        console.error("Escalate alert error: ", error);
        return res.status(500).json({
            message: "Server error escalating alert",
            error: process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred"
        });
    }
};
exports.escalateAlert = escalateAlert;
