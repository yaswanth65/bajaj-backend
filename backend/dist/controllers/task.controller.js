"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.revokeTask = exports.createTask = exports.submitProof = exports.markComplete = exports.getTasks = void 0;
const client_1 = require("@prisma/client");
const cloudinary_service_1 = require("../services/cloudinary.service");
const notification_service_1 = require("../services/notification.service");
const stats_1 = require("../lib/stats");
const prisma_1 = __importDefault(require("../lib/prisma"));
const getTasks = async (req, res) => {
    try {
        const userContext = req.user;
        if (!userContext) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const { status, branchId, assignedToId, limit = "10000", offset = "0" } = req.query;
        // Build query filters based on permissions
        const filters = {};
        if (userContext.role === client_1.RoleId.lc) {
            // LCs only see their own branch's tasks
            filters.branchId = userContext.branchId || "";
        }
        else if (userContext.role === client_1.RoleId.branchManager) {
            // BAMs see tasks for branches inside their branchScope
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
            // RMs see everything
            if (branchId) {
                filters.branchId = String(branchId);
            }
        }
        if (status) {
            filters.status = status;
        }
        if (assignedToId) {
            filters.assignedToId = String(assignedToId);
        }
        const checks = await prisma_1.default.check.findMany({
            where: filters,
            orderBy: { deadline: "asc" },
            take: Number(limit),
            skip: Number(offset),
            include: {
                assignedTo: { select: { id: true, name: true, email: true, role: true } },
                completedBy: { select: { id: true, name: true, email: true, role: true } },
            }
        });
        const total = await prisma_1.default.check.count({ where: filters });
        return res.status(200).json({
            checks,
            pagination: {
                total,
                limit: Number(limit),
                offset: Number(offset)
            }
        });
    }
    catch (error) {
        console.error("Get tasks error: ", error);
        return res.status(500).json({
            message: "Server error retrieving tasks",
            error: process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred"
        });
    }
};
exports.getTasks = getTasks;
const markComplete = async (req, res) => {
    try {
        const userContext = req.user;
        if (!userContext) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const { id } = req.params;
        const { checklistDone, notes } = req.body;
        const check = await prisma_1.default.check.findUnique({ where: { id } });
        if (!check) {
            return res.status(404).json({ message: "Check not found" });
        }
        // Verify ownership/permission (LC can only complete tasks in their branch)
        if (userContext.role === client_1.RoleId.lc && check.branchId !== userContext.branchId) {
            return res.status(403).json({ message: "Forbidden: Task is outside your branch scope" });
        }
        const result = await prisma_1.default.$transaction(async (tx) => {
            const updatedCheck = await tx.check.update({
                where: { id },
                data: {
                    status: client_1.TaskStatus.Completed,
                    checklistDone: checklistDone !== undefined ? Number(checklistDone) : check.checklistTotal,
                    completedById: userContext.id,
                    completedAt: new Date(),
                    notes: notes || check.notes,
                }
            });
            // Update user stats
            await tx.user.update({
                where: { id: userContext.id },
                data: { tasksClosed: { increment: 1 } }
            });
            return updatedCheck;
        });
        (0, stats_1.recalcBranchStats)(check.branchId).catch((err) => console.error("Failed to recalc branch stats after check completion:", err));
        (0, stats_1.recalcUserStats)(userContext.id).catch((err) => console.error("Failed to recalc user stats after task completion:", err));
        return res.status(200).json({
            message: "Check completed successfully",
            check: result,
        });
    }
    catch (error) {
        console.error("Mark task complete error: ", error);
        return res.status(500).json({
            message: "Server error completing task",
            error: process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred"
        });
    }
};
exports.markComplete = markComplete;
const submitProof = async (req, res) => {
    try {
        const userContext = req.user;
        if (!userContext) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const { id } = req.params;
        const file = req.file;
        const { imageUrl: bodyImageUrl } = req.body;
        let imageUrl;
        if (file) {
            try {
                console.log(`Uploading proof image to Cloudinary for task ${id}...`);
                imageUrl = await (0, cloudinary_service_1.uploadImageToCloudinary)(file.buffer, "task_proofs");
                console.log(`Uploaded successfully: ${imageUrl}`);
            }
            catch (cloudErr) {
                console.error("Cloudinary upload failed, falling back to body imageUrl:", cloudErr);
                if (bodyImageUrl) {
                    imageUrl = bodyImageUrl;
                }
                else {
                    return res.status(400).json({ message: "Cloudinary upload failed and no fallback imageUrl provided" });
                }
            }
        }
        else if (bodyImageUrl) {
            imageUrl = bodyImageUrl;
        }
        else {
            return res.status(400).json({ message: "No image file or imageUrl provided" });
        }
        const check = await prisma_1.default.check.findUnique({ where: { id } });
        if (!check) {
            return res.status(404).json({ message: "Check not found" });
        }
        if (userContext.role === client_1.RoleId.lc && check.branchId !== userContext.branchId) {
            return res.status(403).json({ message: "Forbidden: Task is outside your branch scope" });
        }
        const result = await prisma_1.default.$transaction(async (tx) => {
            const updatedCheck = await tx.check.update({
                where: { id },
                data: {
                    status: client_1.TaskStatus.Completed,
                    proofUrl: imageUrl,
                    checklistDone: check.checklistTotal,
                    completedById: userContext.id,
                    completedAt: new Date(),
                    notes: req.body.notes ? `${check.notes}\nProof Remark: ${req.body.notes}` : check.notes,
                }
            });
            // Increment tasks closed
            await tx.user.update({
                where: { id: userContext.id },
                data: { tasksClosed: { increment: 1 } }
            });
            return updatedCheck;
        });
        (0, stats_1.recalcBranchStats)(check.branchId).catch((err) => console.error("Failed to recalc branch stats after proof submit:", err));
        (0, stats_1.recalcUserStats)(userContext.id).catch((err) => console.error("Failed to recalc user stats after proof submit:", err));
        return res.status(200).json({
            message: "Check proof submitted and verified",
            check: result,
        });
    }
    catch (error) {
        console.error("Submit proof error: ", error);
        return res.status(500).json({
            message: "Server error submitting task proof",
            error: process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred"
        });
    }
};
exports.submitProof = submitProof;
const createTask = async (req, res) => {
    try {
        const userContext = req.user;
        if (!userContext) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const { title, branchId, audience, schedule, priority, zone, deadline, assignedToId, proofRequired, proofLabel, notes, applianceId } = req.body;
        if (!title) {
            return res.status(400).json({ message: "Title is required" });
        }
        // Resolve branchId
        let resolvedBranchId = branchId;
        if (userContext.role === client_1.RoleId.lc) {
            resolvedBranchId = userContext.branchId;
        }
        if (!resolvedBranchId) {
            return res.status(400).json({ message: "Branch ID is required" });
        }
        // Verify branch scope/ownership
        if (userContext.role === client_1.RoleId.lc) {
            if (String(resolvedBranchId) !== String(userContext.branchId)) {
                return res.status(403).json({ message: "Forbidden: LCs can only create tasks for their own branch" });
            }
        }
        else if (userContext.role === client_1.RoleId.branchManager) {
            if (!userContext.branchScope.includes(String(resolvedBranchId))) {
                return res.status(403).json({ message: "Forbidden: branch out of scope" });
            }
        }
        // Safe deadline parser with defaults
        let parsedDeadline;
        if (!deadline || String(deadline).trim() === "") {
            const optionsDate = { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" };
            const formatterDate = new Intl.DateTimeFormat("en-CA", optionsDate);
            const todayStr = formatterDate.format(new Date());
            parsedDeadline = new Date(`${todayStr}T23:59:59+05:30`);
        }
        else {
            parsedDeadline = new Date(deadline);
            if (isNaN(parsedDeadline.getTime())) {
                const optionsDate = { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" };
                const formatterDate = new Intl.DateTimeFormat("en-CA", optionsDate);
                const todayStr = formatterDate.format(new Date());
                parsedDeadline = new Date(`${todayStr}T23:59:59+05:30`);
            }
        }
        const result = await prisma_1.default.$transaction(async (tx) => {
            const newCheck = await tx.check.create({
                data: {
                    title,
                    branchId: String(resolvedBranchId),
                    audience: userContext.role === client_1.RoleId.lc ? client_1.RoleId.lc : (audience || client_1.RoleId.lc),
                    schedule: "Weekly",
                    priority: priority || client_1.Priority.High,
                    zone: zone || "Branch premises",
                    deadline: parsedDeadline,
                    assignedToId: userContext.role === client_1.RoleId.lc ? userContext.id : (assignedToId || null),
                    assignedById: userContext.id,
                    status: client_1.TaskStatus.Pending,
                    checklistDone: 0,
                    checklistTotal: 1,
                    proofRequired: proofRequired === true || proofRequired === "true",
                    proofLabel: proofLabel || "Photo proof",
                    notes: notes || "",
                    applianceId: applianceId || null,
                },
                include: {
                    branch: { select: { name: true } }
                }
            });
            // Create system notification
            await tx.notification.create({
                data: {
                    title: `New Check: ${title}`,
                    detail: `New check assigned at ${newCheck.branch.name} branch for ${newCheck.audience}. Priority: ${newCheck.priority}`,
                    scope: [newCheck.audience, client_1.RoleId.branchManager, client_1.RoleId.rm],
                    branchId: String(resolvedBranchId),
                    priority: newCheck.priority
                }
            });
            return newCheck;
        });
        // Notify assigned user if any (run outside transaction to avoid blocking DB if push server is slow)
        if (assignedToId) {
            await (0, notification_service_1.sendPushNotification)(assignedToId, `New Check Assigned`, `Check "${title}" at ${result.branch.name} has been assigned to you. Deadline: ${parsedDeadline.toDateString()}`).catch((err) => console.error("Failed to send push notification to LC:", err));
        }
        else {
            // Notify all LCs at the branch if audience is LC
            if (result.audience === client_1.RoleId.lc) {
                const lcs = await prisma_1.default.user.findMany({
                    where: { branchId, role: client_1.RoleId.lc },
                    select: { id: true }
                });
                const lcIds = lcs.map(u => u.id);
                if (lcIds.length > 0) {
                    await (0, notification_service_1.sendPushNotification)(lcIds, `New Branch Check`, `A new check "${title}" is available for ${result.branch.name} branch.`).catch((err) => console.error("Failed to send push notifications to branch LCs:", err));
                }
            }
        }
        return res.status(201).json({
            message: "Check created successfully",
            check: result
        });
    }
    catch (error) {
        console.error("Create task error: ", error);
        return res.status(500).json({
            message: "Server error creating check",
            error: process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred"
        });
    }
};
exports.createTask = createTask;
const revokeTask = async (req, res) => {
    try {
        const userContext = req.user;
        if (!userContext || userContext.role === client_1.RoleId.lc) {
            return res.status(403).json({ message: "Forbidden: LCs cannot revoke/re-open checks" });
        }
        const { id } = req.params;
        const { redoReason } = req.body;
        const check = await prisma_1.default.check.findUnique({ where: { id } });
        if (!check) {
            return res.status(404).json({ message: "Check not found" });
        }
        if (userContext.role === client_1.RoleId.branchManager && !userContext.branchScope.includes(check.branchId)) {
            return res.status(403).json({ message: "Forbidden: branch out of scope" });
        }
        const updatedCheck = await prisma_1.default.$transaction(async (tx) => {
            const result = await tx.check.update({
                where: { id },
                data: {
                    status: client_1.TaskStatus.Revoked,
                    redoReason: redoReason || "Revision requested on checklist items.",
                    completedById: null,
                    completedAt: null,
                },
                include: {
                    branch: { select: { name: true } }
                }
            });
            // Decrement tasksClosed if the task was previously completed
            if (check.status === client_1.TaskStatus.Completed && check.completedById) {
                await tx.user.update({
                    where: { id: check.completedById },
                    data: { tasksClosed: { decrement: 1 } }
                });
            }
            return result;
        });
        // Notify assigned employee (outside transaction)
        if (check.assignedToId) {
            await (0, notification_service_1.sendPushNotification)(check.assignedToId, `Check Sent Back for Revision`, `Your check "${check.title}" at ${updatedCheck.branch.name} was sent back for revision: "${redoReason || "Check notes"}"`).catch((err) => console.error("Failed to send push notification to assigned employee:", err));
        }
        (0, stats_1.recalcBranchStats)(check.branchId).catch((err) => console.error("Failed to recalc branch stats after check revoke:", err));
        if (check.completedById) {
            (0, stats_1.recalcUserStats)(check.completedById).catch((err) => console.error("Failed to recalc user stats after check revoke:", err));
        }
        if (check.assignedToId) {
            (0, stats_1.recalcUserStats)(check.assignedToId).catch((err) => console.error("Failed to recalc user stats for assignee after check revoke:", err));
        }
        return res.status(200).json({
            message: "Check revoked for revision successfully",
            check: updatedCheck
        });
    }
    catch (error) {
        console.error("Revoke task error: ", error);
        return res.status(500).json({
            message: "Server error revoking check",
            error: process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred"
        });
    }
};
exports.revokeTask = revokeTask;
