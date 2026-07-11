"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addVendorRemark = exports.escalateComplaint = exports.requestUpdate = exports.getComplaintDashboardStats = exports.resolveComplaint = exports.closeComplaint = exports.raiseToVendor = exports.updateComplaintStatus = exports.createComplaint = exports.getComplaintDetail = exports.getComplaints = void 0;
const client_1 = require("@prisma/client");
const notification_service_1 = require("../services/notification.service");
const stats_1 = require("../lib/stats");
const prisma_1 = __importDefault(require("../lib/prisma"));
const pdf_service_1 = require("../services/pdf.service");
const upload_service_1 = require("../services/upload.service");
const cloudinary_service_1 = require("../services/cloudinary.service");
/* ── helpers ─────────────────────────────────────────────────────────────── */
async function generateComplaintNumber() {
    const now = new Date();
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const prefix = `CMP-${datePart}-`;
    const lastComplaint = await prisma_1.default.complaint.findFirst({
        where: { complaintId: { startsWith: prefix } },
        orderBy: { complaintId: "desc" },
        select: { complaintId: true },
    });
    let seq = 1;
    if (lastComplaint) {
        const lastSeq = parseInt(lastComplaint.complaintId.split("-").pop() || "0", 10);
        seq = lastSeq + 1;
    }
    return `${prefix}${String(seq).padStart(4, "0")}`;
}
function verifyBranchScope(userContext, branchId) {
    if (userContext.role === client_1.RoleId.rm)
        return true;
    if (userContext.role === client_1.RoleId.lc)
        return userContext.branchId === branchId;
    return userContext.branchScope.includes(branchId);
}
/* ── GET /complaints ─────────────────────────────────────────────────────── */
const getComplaints = async (req, res) => {
    try {
        const userContext = req.user;
        if (!userContext)
            return res.status(401).json({ message: "Unauthorized" });
        const { status, branchId, priority, vendorName, assetId, fromDate, toDate } = req.query;
        const filters = {};
        if (userContext.role === client_1.RoleId.lc) {
            filters.branchId = userContext.branchId || "";
        }
        else if (userContext.role === client_1.RoleId.branchManager || userContext.role === client_1.RoleId.aa) {
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
            if (branchId)
                filters.branchId = String(branchId);
        }
        if (status)
            filters.status = status;
        if (priority)
            filters.priority = priority;
        if (vendorName)
            filters.vendorId = { contains: String(vendorName), mode: "insensitive" };
        if (assetId)
            filters.assetId = String(assetId);
        if (fromDate || toDate) {
            filters.createdAt = {};
            if (fromDate)
                filters.createdAt.gte = new Date(String(fromDate));
            if (toDate)
                filters.createdAt.lte = new Date(String(toDate));
        }
        const complaints = await prisma_1.default.complaint.findMany({
            where: filters,
            orderBy: { createdAt: "desc" },
            include: {
                raisedBy: { select: { id: true, name: true, email: true, role: true } },
                asset: { select: { id: true, name: true, category: true, brand: true } },
                branch: { select: { id: true, name: true } },
            },
        });
        return res.status(200).json(complaints);
    }
    catch (error) {
        console.error("Get complaints error:", error);
        return res.status(500).json({ message: "Server error listing complaints" });
    }
};
exports.getComplaints = getComplaints;
/* ── GET /complaints/:id ─────────────────────────────────────────────────── */
const getComplaintDetail = async (req, res) => {
    try {
        const userContext = req.user;
        if (!userContext)
            return res.status(401).json({ message: "Unauthorized" });
        const { id } = req.params;
        const complaint = await prisma_1.default.complaint.findUnique({
            where: { id },
            include: {
                raisedBy: { select: { id: true, name: true, email: true, role: true } },
                asset: { select: { id: true, name: true, category: true, brand: true, amcVendor: true } },
                branch: { select: { id: true, name: true } },
            },
        });
        if (!complaint)
            return res.status(404).json({ message: "Complaint not found" });
        if (!verifyBranchScope(userContext, complaint.branchId)) {
            return res.status(403).json({ message: "Forbidden: branch out of scope" });
        }
        return res.status(200).json(complaint);
    }
    catch (error) {
        console.error("Get complaint detail error:", error);
        return res.status(500).json({ message: "Server error fetching complaint" });
    }
};
exports.getComplaintDetail = getComplaintDetail;
/* ── POST /complaints ────────────────────────────────────────────────────── */
const createComplaint = async (req, res) => {
    try {
        const userContext = req.user;
        if (!userContext)
            return res.status(401).json({ message: "Unauthorized" });
        if (userContext.role === client_1.RoleId.rm) {
            return res.status(403).json({ message: "Forbidden: RM cannot raise complaints." });
        }
        const { assetId, priority, description, attachments, vendorName, vendorEmail } = req.body;
        if (!assetId)
            return res.status(400).json({ message: "Asset/Appliance selection is required" });
        // Handle uploaded file attachments if any
        const files = req.files;
        let uploadedUrls = [];
        if (files && files.length > 0) {
            for (const file of files) {
                try {
                    const url = await (0, cloudinary_service_1.uploadImageToCloudinary)(file.buffer, "complaint_photos");
                    uploadedUrls.push(url);
                }
                catch (err) {
                    console.error("Cloudinary upload failed for a complaint attachment:", err);
                }
            }
        }
        let bodyAttachments = [];
        if (attachments) {
            try {
                bodyAttachments = typeof attachments === "string"
                    ? JSON.parse(attachments)
                    : attachments;
            }
            catch (e) {
                bodyAttachments = [];
            }
        }
        const finalAttachmentUrls = [...bodyAttachments, ...uploadedUrls];
        if (!description || description.trim().length < 10) {
            return res.status(400).json({ message: "Description must be at least 10 characters" });
        }
        const branchId = userContext.role === client_1.RoleId.lc ? userContext.branchId : req.body.branchId;
        if (!branchId)
            return res.status(400).json({ message: "Branch selection is required" });
        if (!verifyBranchScope(userContext, branchId)) {
            return res.status(403).json({ message: "Forbidden: branch out of scope" });
        }
        const asset = await prisma_1.default.appliance.findUnique({
            where: { id: assetId },
            select: { id: true, name: true, branchId: true, amcVendor: true, vendorEmail: true },
        });
        if (!asset)
            return res.status(404).json({ message: "Asset not found" });
        if (asset.branchId !== branchId) {
            return res.status(400).json({ message: "Asset does not belong to the selected branch" });
        }
        const complaintId = await generateComplaintNumber();
        const result = await prisma_1.default.$transaction(async (tx) => {
            const newComplaint = await tx.complaint.create({
                data: {
                    complaintId,
                    branchId,
                    priority: priority || client_1.Priority.Medium,
                    status: client_1.ComplaintStatus.OPEN,
                    raisedById: userContext.id,
                    raisedByName: userContext.name,
                    raisedByRole: userContext.role,
                    assetId,
                    vendorId: vendorName || asset.amcVendor || "Not assigned",
                    vendorEmail: vendorEmail || asset.vendorEmail || "",
                    description: description.trim(),
                    attachmentUrls: finalAttachmentUrls,
                },
                include: {
                    raisedBy: { select: { id: true, name: true } },
                    branch: { select: { name: true } },
                    asset: { select: { name: true } },
                },
            });
            await tx.branch.update({
                where: { id: branchId },
                data: { openIssues: { increment: 1 } },
            });
            await tx.notification.create({
                data: {
                    title: `New Complaint: ${complaintId}`,
                    detail: `${asset.name} issue at ${newComplaint.branch.name}. Priority: ${priority || "Medium"}`,
                    scope: [client_1.RoleId.branchManager, client_1.RoleId.rm],
                    branchId,
                    priority: priority || client_1.Priority.Medium,
                },
            });
            return newComplaint;
        });
        // Generate Work Order PDF and upload
        try {
            const pdfBuffer = await (0, pdf_service_1.generateWorkOrderPDF)({
                complaintId: result.complaintId,
                branchName: result.branch.name,
                assetName: result.asset?.name,
                priority: result.priority,
                description: result.description,
                raisedByName: result.raisedByName,
                raisedByRole: result.raisedByRole,
            });
            let uploadUrl = null;
            try {
                uploadUrl = await (0, upload_service_1.uploadPdfToCloudinary)(pdfBuffer, `bajaj_operations/work_orders/${result.complaintId}`);
                await prisma_1.default.complaint.update({
                    where: { id: result.id },
                    data: { workOrderPdfUrl: uploadUrl }
                });
                result.workOrderPdfUrl = uploadUrl;
            }
            catch (uploadErr) {
                console.error("Failed to upload work order PDF to Cloudinary:", uploadErr);
            }
            // Email dispatch intentionally disabled for app-managed complaint flow.
        }
        catch (err) {
            console.error("Failed to generate or send work order PDF:", err);
        }
        (0, notification_service_1.notifyBranchManagers)(String(branchId), `New Complaint at ${result.branch.name}`, `${result.complaintId}: ${asset.name} issue reported.`).catch(console.error);
        (0, stats_1.recalcBranchStats)(String(branchId)).catch(console.error);
        return res.status(201).json({ message: "Complaint raised successfully", complaint: result });
    }
    catch (error) {
        console.error("Create complaint error:", error);
        return res.status(500).json({ message: "Server error creating complaint" });
    }
};
exports.createComplaint = createComplaint;
/* ── PATCH /complaints/:id/status ────────────────────────────────────────── */
const updateComplaintStatus = async (req, res) => {
    try {
        const userContext = req.user;
        if (!userContext)
            return res.status(401).json({ message: "Unauthorized" });
        const { id } = req.params;
        const { status } = req.body;
        if (!status)
            return res.status(400).json({ message: "Status is required" });
        const complaint = await prisma_1.default.complaint.findUnique({ where: { id } });
        if (!complaint)
            return res.status(404).json({ message: "Complaint not found" });
        if (!verifyBranchScope(userContext, complaint.branchId)) {
            return res.status(403).json({ message: "Forbidden: branch out of scope" });
        }
        const updateData = { status };
        if (status === client_1.ComplaintStatus.RESOLVED)
            updateData.resolvedAt = new Date();
        const result = await prisma_1.default.$transaction(async (tx) => {
            const updated = await tx.complaint.update({ where: { id }, data: updateData });
            if (status === client_1.ComplaintStatus.RESOLVED) {
                await tx.branch.update({
                    where: { id: complaint.branchId },
                    data: { openIssues: { decrement: 1 } },
                });
            }
            return updated;
        });
        return res.status(200).json({ message: "Status updated successfully", complaint: result });
    }
    catch (error) {
        console.error("Update complaint status error:", error);
        return res.status(500).json({ message: "Server error updating complaint status" });
    }
};
exports.updateComplaintStatus = updateComplaintStatus;
/* ── POST /complaints/:id/raise-to-vendor ────────────────────────────────── */
const raiseToVendor = async (req, res) => {
    try {
        const userContext = req.user;
        if (!userContext)
            return res.status(401).json({ message: "Unauthorized" });
        const { id } = req.params;
        const complaint = await prisma_1.default.complaint.findUnique({
            where: { id },
            include: {
                branch: { select: { name: true } },
                asset: { select: { name: true, category: true, brand: true } },
            },
        });
        if (!complaint)
            return res.status(404).json({ message: "Complaint not found" });
        if (!verifyBranchScope(userContext, complaint.branchId)) {
            return res.status(403).json({ message: "Forbidden: branch out of scope" });
        }
        const updated = await prisma_1.default.complaint.update({
            where: { id },
            data: { status: client_1.ComplaintStatus.VENDOR_PENDING },
        });
        return res.status(200).json({ message: "Complaint raised to vendor", complaint: updated });
    }
    catch (error) {
        console.error("Raise to vendor error:", error);
        return res.status(500).json({ message: "Server error raising to vendor" });
    }
};
exports.raiseToVendor = raiseToVendor;
/* ── POST /complaints/:id/close ──────────────────────────────────────────── */
const closeComplaint = async (req, res) => {
    try {
        const userContext = req.user;
        if (!userContext)
            return res.status(401).json({ message: "Unauthorized" });
        const { id } = req.params;
        const complaint = await prisma_1.default.complaint.findUnique({
            where: { id },
            include: { branch: { select: { name: true } } },
        });
        if (!complaint)
            return res.status(404).json({ message: "Complaint not found" });
        if (!verifyBranchScope(userContext, complaint.branchId)) {
            return res.status(403).json({ message: "Forbidden: branch out of scope" });
        }
        if (complaint.status === client_1.ComplaintStatus.RESOLVED) {
            return res.status(409).json({ message: "Complaint is already resolved/closed" });
        }
        const result = await prisma_1.default.$transaction(async (tx) => {
            const updated = await tx.complaint.update({
                where: { id },
                data: {
                    status: client_1.ComplaintStatus.RESOLVED,
                    resolvedAt: new Date(),
                    resolvedById: userContext.id,
                    resolvedByName: userContext.name,
                },
            });
            await tx.branch.update({
                where: { id: complaint.branchId },
                data: { openIssues: { decrement: 1 } },
            });
            return updated;
        });
        (0, stats_1.recalcBranchStats)(complaint.branchId).catch(console.error);
        return res.status(200).json({ message: "Complaint closed successfully", complaint: result });
    }
    catch (error) {
        console.error("Close complaint error:", error);
        return res.status(500).json({ message: "Server error closing complaint" });
    }
};
exports.closeComplaint = closeComplaint;
/* ── PATCH /complaints/:id/resolve (RM only) ─────────────────────────────── */
const resolveComplaint = async (req, res) => {
    try {
        const userContext = req.user;
        if (!userContext) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const { id } = req.params;
        const { resolutionNotes, vendorRemarks } = req.body;
        const complaint = await prisma_1.default.complaint.findUnique({
            where: { id },
            include: { branch: { select: { name: true } }, asset: { select: { name: true } } },
        });
        if (!complaint)
            return res.status(404).json({ message: "Complaint not found" });
        if (userContext.role !== client_1.RoleId.rm && complaint.raisedById !== userContext.id) {
            return res.status(403).json({ message: "Forbidden: Only RM or the person who raised the complaint can resolve it." });
        }
        const result = await prisma_1.default.$transaction(async (tx) => {
            const updated = await tx.complaint.update({
                where: { id },
                data: {
                    status: client_1.ComplaintStatus.RESOLVED,
                    resolutionNotes,
                    vendorRemarks,
                    resolvedAt: new Date(),
                    resolvedById: userContext.id,
                    resolvedByName: userContext.name,
                },
                include: { branch: { select: { name: true } }, asset: { select: { name: true } } }
            });
            if (complaint.status !== client_1.ComplaintStatus.RESOLVED) {
                await tx.branch.update({
                    where: { id: complaint.branchId },
                    data: { openIssues: { decrement: 1 } },
                });
            }
            return updated;
        });
        // Generate Completion PDF
        try {
            const pdfBuffer = await (0, pdf_service_1.generateCompletionPDF)({
                complaintId: result.complaintId,
                branchName: result.branch.name,
                assetName: result.asset?.name,
                resolvedByName: result.resolvedByName,
                resolutionNotes: result.resolutionNotes,
                vendorRemarks: result.vendorRemarks,
            });
            let uploadUrl = null;
            try {
                uploadUrl = await (0, upload_service_1.uploadPdfToCloudinary)(pdfBuffer, `bajaj_operations/completion_reports/${result.complaintId}`);
                await prisma_1.default.complaint.update({
                    where: { id: result.id },
                    data: { completionPdfUrl: uploadUrl }
                });
                result.completionPdfUrl = uploadUrl;
            }
            catch (uploadErr) {
                console.error("Failed to upload completion PDF to Cloudinary:", uploadErr);
            }
            // Email dispatch intentionally disabled for app-managed complaint flow.
        }
        catch (err) {
            console.error("Failed to generate/upload completion PDF:", err);
        }
        return res.status(200).json({ message: "Complaint resolved successfully", complaint: result });
    }
    catch (error) {
        console.error("Resolve complaint error:", error);
        return res.status(500).json({ message: "Server error resolving complaint" });
    }
};
exports.resolveComplaint = resolveComplaint;
/* ── GET /complaints/dashboard/stats (RM only) ───────────────────────────── */
const getComplaintDashboardStats = async (req, res) => {
    try {
        const userContext = req.user;
        if (!userContext || userContext.role !== client_1.RoleId.rm) {
            return res.status(403).json({ message: "Forbidden: Only RM can access dashboard stats" });
        }
        const [totalComplaints, openComplaints, criticalComplaints, vendorPending, resolvedComplaints] = await Promise.all([
            prisma_1.default.complaint.count(),
            prisma_1.default.complaint.count({ where: { status: client_1.ComplaintStatus.OPEN } }),
            prisma_1.default.complaint.count({ where: { priority: client_1.Priority.Critical } }),
            prisma_1.default.complaint.count({ where: { status: client_1.ComplaintStatus.VENDOR_PENDING } }),
            prisma_1.default.complaint.count({ where: { status: client_1.ComplaintStatus.RESOLVED } }),
        ]);
        return res.status(200).json({
            totalComplaints,
            openComplaints,
            criticalComplaints,
            vendorPending,
            resolvedComplaints,
        });
    }
    catch (error) {
        console.error("Dashboard stats error:", error);
        return res.status(500).json({ message: "Server error fetching dashboard stats" });
    }
};
exports.getComplaintDashboardStats = getComplaintDashboardStats;
/* ── POST /complaints/:id/request-update ───────────────────────────────────── */
const requestUpdate = async (req, res) => {
    try {
        const userContext = req.user;
        if (!userContext)
            return res.status(401).json({ message: "Unauthorized" });
        const { id } = req.params;
        const complaint = await prisma_1.default.complaint.findUnique({ where: { id } });
        if (!complaint)
            return res.status(404).json({ message: "Complaint not found" });
        return res.status(200).json({ message: "Update requested successfully", complaint });
    }
    catch (error) {
        console.error("Request update error:", error);
        return res.status(500).json({ message: "Server error requesting update" });
    }
};
exports.requestUpdate = requestUpdate;
/* ── POST /complaints/:id/escalate ─────────────────────────────────────────── */
const escalateComplaint = async (req, res) => {
    try {
        const userContext = req.user;
        if (!userContext)
            return res.status(401).json({ message: "Unauthorized" });
        const { id } = req.params;
        const { reason } = req.body;
        const complaint = await prisma_1.default.complaint.findUnique({ where: { id } });
        if (!complaint)
            return res.status(404).json({ message: "Complaint not found" });
        const updated = await prisma_1.default.complaint.update({
            where: { id },
            data: { priority: client_1.Priority.Critical }
        });
        return res.status(200).json({ message: "Complaint escalated successfully", complaint: updated });
    }
    catch (error) {
        console.error("Escalate complaint error:", error);
        return res.status(500).json({ message: "Server error escalating complaint" });
    }
};
exports.escalateComplaint = escalateComplaint;
/* ── POST /complaints/:id/vendorRemarks ────────────────────────────────────── */
const addVendorRemark = async (req, res) => {
    try {
        const userContext = req.user;
        if (!userContext)
            return res.status(401).json({ message: "Unauthorized" });
        const { id } = req.params;
        const { text } = req.body;
        const complaint = await prisma_1.default.complaint.findUnique({ where: { id } });
        if (!complaint)
            return res.status(404).json({ message: "Complaint not found" });
        const updated = await prisma_1.default.complaint.update({
            where: { id },
            data: { vendorRemarks: text }
        });
        return res.status(200).json({ message: "Vendor remark added", complaint: updated });
    }
    catch (error) {
        console.error("Vendor remark error:", error);
        return res.status(500).json({ message: "Server error adding vendor remark" });
    }
};
exports.addVendorRemark = addVendorRemark;
