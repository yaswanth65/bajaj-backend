import { Response } from "express";
import { RoleId, Priority, ComplaintStatus } from "@prisma/client";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { notifyBranchManagers, notifyRegionalManagers, sendPushNotification } from "../services/notification.service";
import { recalcBranchStats, recalcUserStats } from "../lib/stats";
import prisma from "../lib/prisma";

const getTimestamp = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export const getComplaints = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userContext = req.user;
    if (!userContext) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { status, branchId } = req.query;
    const filters: any = {};

    if (userContext.role === RoleId.lc) {
      filters.branchId = userContext.branchId || "";
    } else if (userContext.role === RoleId.branchManager) {
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
      if (branchId) {
        filters.branchId = String(branchId);
      }
    }

    if (status) {
      filters.status = status as ComplaintStatus;
    }

    const complaints = await prisma.complaint.findMany({
      where: filters,
      orderBy: { createdAt: "desc" },
      include: {
        reportedBy: { select: { id: true, name: true, email: true, role: true } },
        asset: { select: { id: true, name: true, category: true, brand: true } }
      }
    });

    return res.status(200).json(complaints);
  } catch (error: any) {
    console.error("Get complaints error: ", error);
    return res.status(500).json({ 
      message: "Server error listing complaints", 
      error: process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred" 
    });
  }
};

export const createComplaint = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userContext = req.user;
    if (!userContext) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { title, type, priority, assetId, estimatedCost, impact, description } = req.body;

    if (!title || !type) {
      return res.status(400).json({ message: "Title and type are required" });
    }

    if (estimatedCost !== undefined) {
      const numericCost = Number(estimatedCost);
      if (isNaN(numericCost) || numericCost < 0) {
        return res.status(400).json({ message: "Estimated cost must be a valid positive number" });
      }
    }

    // Resolve branch
    const branchId = userContext.role === RoleId.lc ? userContext.branchId : req.body.branchId;
    if (!branchId) {
      return res.status(400).json({ message: "Branch assignment is required" });
    }

    // Verify scope
    if (userContext.role === RoleId.branchManager && !userContext.branchScope.includes(branchId)) {
      return res.status(403).json({ message: "Forbidden: branch out of scope" });
    }

    const timeLog = `${getTimestamp()} - Complaint submitted by ${userContext.name}`;

    const result = await prisma.$transaction(async (tx) => {
      const newComplaint = await tx.complaint.create({
        data: {
          title,
          branchId,
          type,
          priority: (priority as Priority) || Priority.Medium,
          status: ComplaintStatus.Pending,
          reportedById: userContext.id,
          assetId: assetId || null,
          estimatedCost: estimatedCost ? Number(estimatedCost) : 0.0,
          impact: impact || "Operational impact",
          description: description || "",
          escalationStage: userContext.role === RoleId.lc ? "LC" : "Branch Manager",
          timeline: [timeLog]
        },
        include: {
          reportedBy: { select: { id: true, name: true } },
          branch: { select: { name: true } }
        }
      });

      // Increment branch openIssues
      await tx.branch.update({
        where: { id: branchId },
        data: { openIssues: { increment: 1 } }
      });

      // Create system notification
      const systemNotif = await tx.notification.create({
        data: {
          title: `New Issue Raised: ${title}`,
          detail: `Raised at ${newComplaint.branch.name} branch. Priority: ${priority || "Medium"}`,
          scope: [RoleId.branchManager, RoleId.rm],
          branchId: branchId,
          priority: (priority as Priority) || Priority.Medium
        }
      });

      return { newComplaint, systemNotif };
    });

    // Notify Supervising Managers (outside transaction)
    await notifyBranchManagers(
      branchId,
      `New Issue at ${result.newComplaint.branch.name}`,
      `"${title}" has been reported by ${userContext.name}.`
    ).catch((err) => console.error("Failed to notify branch managers:", err));

    recalcBranchStats(branchId).catch((err) => console.error("Failed to recalc branch stats after complaint creation:", err));
    recalcUserStats(userContext.id).catch((err) => console.error("Failed to recalc user stats after complaint creation:", err));

    return res.status(201).json({
      message: "Complaint registered successfully",
      complaint: result.newComplaint,
      notification: result.systemNotif
    });
  } catch (error: any) {
    console.error("Create complaint error: ", error);
    return res.status(500).json({ 
      message: "Server error creating complaint", 
      error: process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred" 
    });
  }
};

export const resolveComplaint = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userContext = req.user;
    if (!userContext) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const complaint = await prisma.complaint.findUnique({
      where: { id },
      include: { branch: { select: { name: true } } }
    });

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    // Verify scope
    if (userContext.role === RoleId.lc && userContext.branchId !== complaint.branchId) {
      return res.status(403).json({ message: "Forbidden: branch out of scope" });
    }
    if (userContext.role === RoleId.branchManager && !userContext.branchScope.includes(complaint.branchId)) {
      return res.status(403).json({ message: "Forbidden: branch out of scope" });
    }

    const logMsg = `${getTimestamp()} - Marked resolved by ${userContext.name}`;
    const currentTimeline = (complaint.timeline as any[]) || [];
    const updatedTimeline = [...currentTimeline, logMsg];

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.complaint.update({
        where: { id },
        data: {
          status: ComplaintStatus.Resolved,
          escalationStage: "Closed",
          timeline: updatedTimeline
        }
      });

      // Decrement branch open issues
      await tx.branch.update({
        where: { id: complaint.branchId },
        data: { openIssues: { decrement: 1 } }
      });

      // Create system notification
      await tx.notification.create({
        data: {
          title: `Issue Resolved: ${complaint.title}`,
          detail: `Resolved by ${userContext.name} at ${complaint.branch.name} branch.`,
          scope: [RoleId.lc, RoleId.branchManager, RoleId.rm],
          branchId: complaint.branchId,
          priority: Priority.Low
        }
      });

      return updated;
    });

    // Notify the reporter (outside transaction)
    await sendPushNotification(
      complaint.reportedById,
      `Issue Resolved!`,
      `Your reported issue "${complaint.title}" at ${complaint.branch.name} has been resolved.`
    ).catch((err) => console.error("Failed to notify reporter:", err));

    recalcBranchStats(complaint.branchId).catch((err) => console.error("Failed to recalc branch stats after complaint resolve:", err));

    return res.status(200).json({
      message: "Complaint resolved successfully",
      complaint: result
    });
  } catch (error: any) {
    console.error("Resolve complaint error: ", error);
    return res.status(500).json({ 
      message: "Server error resolving complaint", 
      error: process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred" 
    });
  }
};

export const escalateComplaint = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userContext = req.user;
    if (!userContext) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const complaint = await prisma.complaint.findUnique({
      where: { id },
      include: { branch: { select: { name: true } } }
    });

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    // Verify scope
    if (userContext.role === RoleId.lc && userContext.branchId !== complaint.branchId) {
      return res.status(403).json({ message: "Forbidden: branch out of scope" });
    }
    if (userContext.role === RoleId.branchManager && !userContext.branchScope.includes(complaint.branchId)) {
      return res.status(403).json({ message: "Forbidden: branch out of scope" });
    }

    const nextStage = complaint.escalationStage === "LC" ? "Branch Manager" : "RM";
    const logMsg = `${getTimestamp()} - Escalated to ${nextStage} by ${userContext.name}`;
    const currentTimeline = (complaint.timeline as any[]) || [];
    const updatedTimeline = [...currentTimeline, logMsg];

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.complaint.update({
        where: { id },
        data: {
          status: ComplaintStatus.Escalated,
          escalationStage: nextStage,
          timeline: updatedTimeline
        }
      });

      // Increment branch critical alerts count if escalated to RM
      if (nextStage === "RM") {
        await tx.branch.update({
          where: { id: complaint.branchId },
          data: { criticalAlerts: { increment: 1 } }
        });
      }

      // Create system notification
      await tx.notification.create({
        data: {
          title: `Issue Escalated to ${nextStage}`,
          detail: `Issue "${complaint.title}" at ${complaint.branch.name} is now at ${nextStage} stage.`,
          scope: nextStage === "RM" ? [RoleId.rm] : [RoleId.branchManager, RoleId.rm],
          branchId: complaint.branchId,
          priority: Priority.High
        }
      });

      return updated;
    });

    // Trigger push notifications (outside transaction)
    if (nextStage === "RM") {
      await notifyRegionalManagers(
        `CRITICAL: Escalation to RM`,
        `Complaint "${complaint.title}" from ${complaint.branch.name} has been escalated to RM.`
      ).catch((err) => console.error("Failed to notify RMs of escalation:", err));
    } else {
      await notifyBranchManagers(
        complaint.branchId,
        `Escalated to Branch Manager`,
        `Complaint "${complaint.title}" from ${complaint.branch.name} has been escalated.`
      ).catch((err) => console.error("Failed to notify BMs of escalation:", err));
    }

    recalcBranchStats(complaint.branchId).catch((err) => console.error("Failed to recalc branch stats after complaint escalate:", err));
    recalcUserStats(complaint.reportedById).catch((err) => console.error("Failed to recalc user stats after complaint escalate:", err));

    return res.status(200).json({
      message: "Complaint escalated successfully",
      complaint: result
    });
  } catch (error: any) {
    console.error("Escalate complaint error: ", error);
    return res.status(500).json({ 
      message: "Server error escalating complaint", 
      error: process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred" 
    });
  }
};

export const assignVendor = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userContext = req.user;
    if (!userContext) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const { assignedVendor } = req.body;

    if (!assignedVendor) {
      return res.status(400).json({ message: "Vendor name is required" });
    }

    const complaint = await prisma.complaint.findUnique({ where: { id } });
    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    if (userContext.role === RoleId.lc && userContext.branchId !== complaint.branchId) {
      return res.status(403).json({ message: "Forbidden: branch out of scope" });
    }
    if (userContext.role === RoleId.branchManager && !userContext.branchScope.includes(complaint.branchId)) {
      return res.status(403).json({ message: "Forbidden: branch out of scope" });
    }

    const logMsg = `${getTimestamp()} - Vendor ${assignedVendor} assigned by ${userContext.name}`;
    const currentTimeline = (complaint.timeline as any[]) || [];
    const updatedTimeline = [...currentTimeline, logMsg];

    const updated = await prisma.complaint.update({
      where: { id },
      data: {
        assignedVendor,
        timeline: updatedTimeline
      }
    });

    return res.status(200).json({
      message: "Vendor assigned successfully",
      complaint: updated
    });
  } catch (error: any) {
    console.error("Assign vendor error: ", error);
    return res.status(500).json({ 
      message: "Server error assigning vendor", 
      error: process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred" 
    });
  }
};

export const approveHighCost = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userContext = req.user;
    if (!userContext || userContext.role !== RoleId.rm) {
      return res.status(403).json({ message: "Forbidden: Only Regional Managers can approve high cost expenditures" });
    }

    const { id } = req.params;
    const complaint = await prisma.complaint.findUnique({ where: { id } });
    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    const logMsg = `${getTimestamp()} - RM approved high-cost decision`;
    const currentTimeline = (complaint.timeline as any[]) || [];
    const updatedTimeline = [...currentTimeline, logMsg];

    const updated = await prisma.complaint.update({
      where: { id },
      data: {
        timeline: updatedTimeline
      }
    });

    return res.status(200).json({
      message: "High cost decision approved successfully",
      complaint: updated
    });
  } catch (error: any) {
    console.error("Approve high cost error: ", error);
    return res.status(500).json({ 
      message: "Server error approving high cost decision", 
      error: process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred" 
    });
  }
};

export const deleteComplaint = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userContext = req.user;
    if (!userContext || userContext.role === RoleId.lc) {
      return res.status(403).json({ message: "Forbidden: Location Controllers cannot remove complaints" });
    }

    const { id } = req.params;
    const complaint = await prisma.complaint.findUnique({ where: { id } });
    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    if (userContext.role === RoleId.branchManager && !userContext.branchScope.includes(complaint.branchId)) {
      return res.status(403).json({ message: "Forbidden: branch out of scope" });
    }

    if (complaint.status === ComplaintStatus.Resolved || complaint.status === ComplaintStatus.Rejected) {
      return res.status(409).json({ message: "Complaint is already resolved or rejected" });
    }

    const logMsg = `${new Date().toISOString()} - Removed by ${userContext.name}`;
    const currentTimeline = (complaint.timeline as any[]) || [];

    await prisma.$transaction(async (tx) => {
      await tx.complaint.update({
        where: { id },
        data: {
          status: ComplaintStatus.Rejected,
          escalationStage: "Closed",
          timeline: [...currentTimeline, logMsg]
        }
      });

      // Decrement open issues
      if (complaint.status !== ComplaintStatus.Resolved && complaint.status !== ComplaintStatus.Rejected) {
        await tx.branch.update({
          where: { id: complaint.branchId },
          data: { openIssues: { decrement: 1 } }
        });
      }
    });

    recalcBranchStats(complaint.branchId).catch((err) => console.error("Failed to recalc branch stats after complaint reject:", err));

    return res.status(200).json({ message: "Complaint rejected successfully" });
  } catch (error: any) {
    console.error("Delete complaint error: ", error);
    return res.status(500).json({ 
      message: "Server error removing complaint", 
      error: process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred" 
    });
  }
};
