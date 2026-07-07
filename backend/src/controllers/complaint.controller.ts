import { Response } from "express";
import { RoleId, Priority, ComplaintStatus } from "@prisma/client";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { sendPushNotification, notifyBranchManagers, notifyRegionalManagers } from "../services/notification.service";
import { recalcBranchStats } from "../lib/stats";
import prisma from "../lib/prisma";
import { generateWorkOrderPDF, generateCompletionPDF } from "../services/pdf.service";
import { uploadPdfToCloudinary } from "../services/upload.service";

/* ── helpers ─────────────────────────────────────────────────────────────── */

async function generateComplaintNumber(): Promise<string> {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const prefix = `CMP-${datePart}-`;

  const lastComplaint = await prisma.complaint.findFirst({
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

function verifyBranchScope(userContext: NonNullable<AuthenticatedRequest["user"]>, branchId: string): boolean {
  if (userContext.role === RoleId.rm) return true;
  if (userContext.role === RoleId.lc) return userContext.branchId === branchId;
  return userContext.branchScope.includes(branchId);
}

/* ── GET /complaints ─────────────────────────────────────────────────────── */

export const getComplaints = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userContext = req.user;
    if (!userContext) return res.status(401).json({ message: "Unauthorized" });

    const { status, branchId, priority, vendorName, assetId, fromDate, toDate } = req.query;
    const filters: any = {};

    if (userContext.role === RoleId.lc) {
      filters.branchId = userContext.branchId || "";
    } else if (userContext.role === RoleId.branchManager || userContext.role === RoleId.aa) {
      if (branchId) {
        if (userContext.branchScope.includes(String(branchId))) {
          filters.branchId = String(branchId);
        } else {
          return res.status(403).json({ message: "Forbidden: branch out of scope" });
        }
      } else {
        filters.branchId = { in: userContext.branchScope };
      }
    } else if (userContext.role === RoleId.rm) {
      if (branchId) filters.branchId = String(branchId);
    }

    if (status) filters.status = status as ComplaintStatus;
    if (priority) filters.priority = priority as Priority;
    if (vendorName) filters.vendorId = { contains: String(vendorName), mode: "insensitive" };
    if (assetId) filters.assetId = String(assetId);
    if (fromDate || toDate) {
      filters.createdAt = {};
      if (fromDate) filters.createdAt.gte = new Date(String(fromDate));
      if (toDate) filters.createdAt.lte = new Date(String(toDate));
    }

    const complaints = await prisma.complaint.findMany({
      where: filters,
      orderBy: { createdAt: "desc" },
      include: {
        raisedBy: { select: { id: true, name: true, email: true, role: true } },
        asset: { select: { id: true, name: true, category: true, brand: true } },
        branch: { select: { id: true, name: true } },
      },
    });

    return res.status(200).json(complaints);
  } catch (error: any) {
    console.error("Get complaints error:", error);
    return res.status(500).json({ message: "Server error listing complaints" });
  }
};

/* ── GET /complaints/:id ─────────────────────────────────────────────────── */

export const getComplaintDetail = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userContext = req.user;
    if (!userContext) return res.status(401).json({ message: "Unauthorized" });

    const { id } = req.params;
    const complaint = await prisma.complaint.findUnique({
      where: { id },
      include: {
        raisedBy: { select: { id: true, name: true, email: true, role: true } },
        asset: { select: { id: true, name: true, category: true, brand: true, amcVendor: true } },
        branch: { select: { id: true, name: true } },
      },
    });

    if (!complaint) return res.status(404).json({ message: "Complaint not found" });

    if (!verifyBranchScope(userContext, complaint.branchId)) {
      return res.status(403).json({ message: "Forbidden: branch out of scope" });
    }

    return res.status(200).json(complaint);
  } catch (error: any) {
    console.error("Get complaint detail error:", error);
    return res.status(500).json({ message: "Server error fetching complaint" });
  }
};

/* ── POST /complaints ────────────────────────────────────────────────────── */

export const createComplaint = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userContext = req.user;
    if (!userContext) return res.status(401).json({ message: "Unauthorized" });

    if (userContext.role === RoleId.rm) {
      return res.status(403).json({ message: "Forbidden: RM cannot raise complaints." });
    }

    const { assetId, priority, description, attachments, vendorName, vendorEmail } = req.body;

    if (!assetId) return res.status(400).json({ message: "Asset/Appliance selection is required" });
    if (!description || description.trim().length < 10) {
      return res.status(400).json({ message: "Description must be at least 10 characters" });
    }

    const branchId = userContext.role === RoleId.lc ? userContext.branchId : req.body.branchId;
    if (!branchId) return res.status(400).json({ message: "Branch selection is required" });

    if (!verifyBranchScope(userContext, branchId)) {
      return res.status(403).json({ message: "Forbidden: branch out of scope" });
    }

    const asset = await prisma.appliance.findUnique({
      where: { id: assetId },
      select: { id: true, name: true, branchId: true, amcVendor: true, vendorEmail: true },
    });

    if (!asset) return res.status(404).json({ message: "Asset not found" });
    if (asset.branchId !== branchId) {
      return res.status(400).json({ message: "Asset does not belong to the selected branch" });
    }

    const complaintId = await generateComplaintNumber();

    const result = await prisma.$transaction(async (tx) => {
      const newComplaint = await tx.complaint.create({
        data: {
          complaintId,
          branchId,
          priority: (priority as Priority) || Priority.Medium,
          status: ComplaintStatus.OPEN,
          raisedById: userContext.id,
          raisedByName: userContext.name,
          raisedByRole: userContext.role,
          assetId,
          vendorId: vendorName || asset.amcVendor || "Not assigned",
          vendorEmail: vendorEmail || asset.vendorEmail || "",
          description: description.trim(),
          attachmentUrls: attachments || [],
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
          scope: [RoleId.branchManager, RoleId.rm],
          branchId,
          priority: (priority as Priority) || Priority.Medium,
        },
      });

      return newComplaint;
    });

    // Generate Work Order PDF and upload
    try {
      const pdfBuffer = await generateWorkOrderPDF({
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
        uploadUrl = await uploadPdfToCloudinary(pdfBuffer, `bajaj_operations/work_orders/${result.complaintId}`);
        await prisma.complaint.update({
          where: { id: result.id },
          data: { workOrderPdfUrl: uploadUrl }
        });
        result.workOrderPdfUrl = uploadUrl;
      } catch (uploadErr) {
        console.error("Failed to upload work order PDF to Cloudinary:", uploadErr);
      }

      // Email dispatch intentionally disabled for app-managed complaint flow.
    } catch (err) {
      console.error("Failed to generate or send work order PDF:", err);
    }

    notifyBranchManagers(String(branchId), `New Complaint at ${result.branch.name}`, `${result.complaintId}: ${asset.name} issue reported.`).catch(console.error);
    recalcBranchStats(String(branchId)).catch(console.error);

    return res.status(201).json({ message: "Complaint raised successfully", complaint: result });
  } catch (error: any) {
    console.error("Create complaint error:", error);
    return res.status(500).json({ message: "Server error creating complaint" });
  }
};

/* ── PATCH /complaints/:id/status ────────────────────────────────────────── */

export const updateComplaintStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userContext = req.user;
    if (!userContext) return res.status(401).json({ message: "Unauthorized" });

    const { id } = req.params;
    const { status } = req.body;

    if (!status) return res.status(400).json({ message: "Status is required" });

    const complaint = await prisma.complaint.findUnique({ where: { id } });
    if (!complaint) return res.status(404).json({ message: "Complaint not found" });

    if (!verifyBranchScope(userContext, complaint.branchId)) {
      return res.status(403).json({ message: "Forbidden: branch out of scope" });
    }

    const updateData: any = { status };

    if (status === ComplaintStatus.RESOLVED) updateData.resolvedAt = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.complaint.update({ where: { id }, data: updateData });

      if (status === ComplaintStatus.RESOLVED) {
        await tx.branch.update({
          where: { id: complaint.branchId },
          data: { openIssues: { decrement: 1 } },
        });
      }

      return updated;
    });

    return res.status(200).json({ message: "Status updated successfully", complaint: result });
  } catch (error: any) {
    console.error("Update complaint status error:", error);
    return res.status(500).json({ message: "Server error updating complaint status" });
  }
};

/* ── POST /complaints/:id/raise-to-vendor ────────────────────────────────── */

export const raiseToVendor = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userContext = req.user;
    if (!userContext) return res.status(401).json({ message: "Unauthorized" });

    const { id } = req.params;

    const complaint = await prisma.complaint.findUnique({
      where: { id },
      include: {
        branch: { select: { name: true } },
        asset: { select: { name: true, category: true, brand: true } },
      },
    });

    if (!complaint) return res.status(404).json({ message: "Complaint not found" });
    if (!verifyBranchScope(userContext, complaint.branchId)) {
      return res.status(403).json({ message: "Forbidden: branch out of scope" });
    }

    const updated = await prisma.complaint.update({
      where: { id },
      data: { status: ComplaintStatus.VENDOR_PENDING },
    });

    return res.status(200).json({ message: "Complaint raised to vendor", complaint: updated });
  } catch (error: any) {
    console.error("Raise to vendor error:", error);
    return res.status(500).json({ message: "Server error raising to vendor" });
  }
};

/* ── POST /complaints/:id/close ──────────────────────────────────────────── */

export const closeComplaint = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userContext = req.user;
    if (!userContext) return res.status(401).json({ message: "Unauthorized" });

    const { id } = req.params;
    const complaint = await prisma.complaint.findUnique({
      where: { id },
      include: { branch: { select: { name: true } } },
    });

    if (!complaint) return res.status(404).json({ message: "Complaint not found" });
    if (!verifyBranchScope(userContext, complaint.branchId)) {
      return res.status(403).json({ message: "Forbidden: branch out of scope" });
    }

    if (complaint.status === ComplaintStatus.RESOLVED) {
      return res.status(409).json({ message: "Complaint is already resolved/closed" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.complaint.update({
        where: { id },
        data: {
          status: ComplaintStatus.RESOLVED,
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

    recalcBranchStats(complaint.branchId).catch(console.error);

    return res.status(200).json({ message: "Complaint closed successfully", complaint: result });
  } catch (error: any) {
    console.error("Close complaint error:", error);
    return res.status(500).json({ message: "Server error closing complaint" });
  }
};

/* ── PATCH /complaints/:id/resolve (RM only) ─────────────────────────────── */

export const resolveComplaint = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userContext = req.user;
    if (!userContext) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const { resolutionNotes, vendorRemarks } = req.body;

    const complaint = await prisma.complaint.findUnique({
      where: { id },
      include: { branch: { select: { name: true } }, asset: { select: { name: true } } },
    });

    if (!complaint) return res.status(404).json({ message: "Complaint not found" });

    if (userContext.role !== RoleId.rm && complaint.raisedById !== userContext.id) {
      return res.status(403).json({ message: "Forbidden: Only RM or the person who raised the complaint can resolve it." });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.complaint.update({
        where: { id },
        data: {
          status: ComplaintStatus.RESOLVED,
          resolutionNotes,
          vendorRemarks,
          resolvedAt: new Date(),
          resolvedById: userContext.id,
          resolvedByName: userContext.name,
        },
        include: { branch: { select: { name: true } }, asset: { select: { name: true } } }
      });

      if (complaint.status !== ComplaintStatus.RESOLVED) {
        await tx.branch.update({
          where: { id: complaint.branchId },
          data: { openIssues: { decrement: 1 } },
        });
      }

      return updated;
    });

    // Generate Completion PDF
    try {
      const pdfBuffer = await generateCompletionPDF({
        complaintId: result.complaintId,
        branchName: result.branch.name,
        assetName: result.asset?.name,
        resolvedByName: result.resolvedByName,
        resolutionNotes: result.resolutionNotes,
        vendorRemarks: result.vendorRemarks,
      });

      let uploadUrl = null;
      try {
        uploadUrl = await uploadPdfToCloudinary(pdfBuffer, `bajaj_operations/completion_reports/${result.complaintId}`);
        await prisma.complaint.update({
          where: { id: result.id },
          data: { completionPdfUrl: uploadUrl }
        });
        result.completionPdfUrl = uploadUrl;
      } catch (uploadErr) {
        console.error("Failed to upload completion PDF to Cloudinary:", uploadErr);
      }

      // Email dispatch intentionally disabled for app-managed complaint flow.
    } catch (err) {
      console.error("Failed to generate/upload completion PDF:", err);
    }

    return res.status(200).json({ message: "Complaint resolved successfully", complaint: result });
  } catch (error: any) {
    console.error("Resolve complaint error:", error);
    return res.status(500).json({ message: "Server error resolving complaint" });
  }
};

/* ── GET /complaints/dashboard/stats (RM only) ───────────────────────────── */

export const getComplaintDashboardStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userContext = req.user;
    if (!userContext || userContext.role !== RoleId.rm) {
      return res.status(403).json({ message: "Forbidden: Only RM can access dashboard stats" });
    }

    const [
      totalComplaints,
      openComplaints,
      criticalComplaints,
      vendorPending,
      resolvedComplaints
    ] = await Promise.all([
      prisma.complaint.count(),
      prisma.complaint.count({ where: { status: ComplaintStatus.OPEN } }),
      prisma.complaint.count({ where: { priority: Priority.Critical } }),
      prisma.complaint.count({ where: { status: ComplaintStatus.VENDOR_PENDING } }),
      prisma.complaint.count({ where: { status: ComplaintStatus.RESOLVED } }),
    ]);

    return res.status(200).json({
      totalComplaints,
      openComplaints,
      criticalComplaints,
      vendorPending,
      resolvedComplaints,
    });
  } catch (error: any) {
    console.error("Dashboard stats error:", error);
    return res.status(500).json({ message: "Server error fetching dashboard stats" });
  }
};

/* ── POST /complaints/:id/request-update ───────────────────────────────────── */
export const requestUpdate = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userContext = req.user;
    if (!userContext) return res.status(401).json({ message: "Unauthorized" });

    const { id } = req.params;
    const complaint = await prisma.complaint.findUnique({ where: { id } });
    if (!complaint) return res.status(404).json({ message: "Complaint not found" });

    return res.status(200).json({ message: "Update requested successfully", complaint });
  } catch (error: any) {
    console.error("Request update error:", error);
    return res.status(500).json({ message: "Server error requesting update" });
  }
};

/* ── POST /complaints/:id/escalate ─────────────────────────────────────────── */
export const escalateComplaint = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userContext = req.user;
    if (!userContext) return res.status(401).json({ message: "Unauthorized" });

    const { id } = req.params;
    const { reason } = req.body;

    const complaint = await prisma.complaint.findUnique({ where: { id } });
    if (!complaint) return res.status(404).json({ message: "Complaint not found" });

    const updated = await prisma.complaint.update({
      where: { id },
      data: { priority: Priority.Critical }
    });

    return res.status(200).json({ message: "Complaint escalated successfully", complaint: updated });
  } catch (error: any) {
    console.error("Escalate complaint error:", error);
    return res.status(500).json({ message: "Server error escalating complaint" });
  }
};

/* ── POST /complaints/:id/vendorRemarks ────────────────────────────────────── */
export const addVendorRemark = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userContext = req.user;
    if (!userContext) return res.status(401).json({ message: "Unauthorized" });

    const { id } = req.params;
    const { text } = req.body;

    const complaint = await prisma.complaint.findUnique({ where: { id } });
    if (!complaint) return res.status(404).json({ message: "Complaint not found" });

    const updated = await prisma.complaint.update({
      where: { id },
      data: { vendorRemarks: text }
    });

    return res.status(200).json({ message: "Vendor remark added", complaint: updated });
  } catch (error: any) {
    console.error("Vendor remark error:", error);
    return res.status(500).json({ message: "Server error adding vendor remark" });
  }
};
