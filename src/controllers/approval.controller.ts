import { Response } from "express";
import { RoleId, ApprovalStatus, Priority } from "@prisma/client";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { notifyBranchManagers, notifyRegionalManagers, sendPushNotification } from "../services/notification.service";
import { relativeTime } from "../lib/stats";
import prisma from "../lib/prisma";

export const getApprovals = async (req: AuthenticatedRequest, res: Response) => {
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
      filters.status = status as ApprovalStatus;
    }

    const approvals = await prisma.approval.findMany({
      where: filters,
      orderBy: { createdAt: "desc" },
      include: {
        requestedBy: { select: { id: true, name: true, email: true, role: true } },
        branch: { select: { name: true } }
      }
    });

    return res.status(200).json(approvals);
  } catch (error: any) {
    console.error("Get approvals error: ", error);
    return res.status(500).json({ 
      message: "Server error listing approvals", 
      error: process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred" 
    });
  }
};

export const createApproval = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userContext = req.user;
    if (!userContext) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { title, kind, amount, note } = req.body;

    if (!title || !kind || amount === undefined) {
      return res.status(400).json({ message: "Title, kind, and amount are required" });
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ message: "Amount must be a valid positive number" });
    }

    // Resolve branch
    const branchId = userContext.role === RoleId.lc ? userContext.branchId : req.body.branchId;
    if (!branchId) {
      return res.status(400).json({ message: "Branch assignment is required" });
    }

    if (userContext.role === RoleId.branchManager && !userContext.branchScope.includes(branchId)) {
      return res.status(403).json({ message: "Forbidden: branch out of scope" });
    }

    const priority = numericAmount > 25000 ? Priority.Critical : Priority.High;
    const stage = userContext.role === RoleId.rm ? "RM" : "Branch Manager";

    const result = await prisma.$transaction(async (tx) => {
      const newApproval = await tx.approval.create({
        data: {
          title,
          kind,
          branchId,
          amount: numericAmount,
          requestedById: userContext.id,
          status: ApprovalStatus.Pending,
          stage,
          priority,
          age: "Just now", // placeholder — computed via relativeTime in responses
          note: note || ""
        },
        include: {
          requestedBy: { select: { name: true } },
          branch: { select: { name: true } }
        }
      });

      // Create system notification
      await tx.notification.create({
        data: {
          title: `New Approval Request: ${title}`,
          detail: `${userContext.name} requested approval for ₹${numericAmount} at ${newApproval.branch.name}.`,
          scope: [RoleId.branchManager, RoleId.rm],
          branchId,
          priority
        }
      });

      return newApproval;
    });

    // Trigger push notification (outside transaction)
    if (stage === "RM") {
      await notifyRegionalManagers(
        `Approval Requested (RM Stage)`,
        `₹${numericAmount} approval requested for: "${title}" by ${userContext.name}.`
      ).catch((err) => console.error("Failed to send push notification to RMs:", err));
    } else {
      await notifyBranchManagers(
        branchId,
        `Approval Requested`,
        `₹${numericAmount} approval requested for: "${title}" by ${userContext.name}.`
      ).catch((err) => console.error("Failed to send push notification to BMs:", err));
    }

    return res.status(201).json({
      message: "Approval request created successfully",
      approval: { ...result, age: relativeTime(result.createdAt) }
    });
  } catch (error: any) {
    console.error("Create approval error: ", error);
    return res.status(500).json({ 
      message: "Server error creating approval", 
      error: process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred" 
    });
  }
};

export const approveRequest = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userContext = req.user;
    if (!userContext) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const approval = await prisma.approval.findUnique({
      where: { id },
      include: { branch: { select: { name: true } } }
    });

    if (!approval) {
      return res.status(404).json({ message: "Approval request not found" });
    }

    // Role permissions check
    if (userContext.role === RoleId.lc) {
      return res.status(403).json({ message: "Forbidden: Location Controllers cannot approve requests" });
    }
    if (userContext.role === RoleId.branchManager && !userContext.branchScope.includes(approval.branchId)) {
      return res.status(403).json({ message: "Forbidden: branch out of scope" });
    }
    if (userContext.role === RoleId.branchManager && approval.stage === "RM") {
      return res.status(403).json({ message: "Forbidden: Only Regional Managers can approve requests at the RM stage" });
    }
    if (approval.status !== ApprovalStatus.Pending) {
      return res.status(400).json({ message: `Request is already ${approval.status.toLowerCase()}` });
    }

    const needsEscalation = approval.amount > 25000 && userContext.role === RoleId.branchManager;

    let updated;
    if (needsEscalation) {
      // Escalate to RM stage
      updated = await prisma.$transaction(async (tx) => {
        const result = await tx.approval.update({
          where: { id },
          data: {
            stage: "RM"
          }
        });

        // Create system notification for escalation
        await tx.notification.create({
          data: {
            title: `Approval Request Escalated to RM: ${approval.title}`,
            detail: `Escalated by BM ${userContext.name} for ₹${approval.amount} at ${approval.branch.name}.`,
            scope: [RoleId.rm],
            branchId: approval.branchId,
            priority: Priority.High
          }
        });

        return result;
      });

      // Trigger push notification to RMs (outside transaction)
      await notifyRegionalManagers(
        `Approval Escalated (RM Stage)`,
        `₹${approval.amount} approval request for "${approval.title}" at ${approval.branch.name} escalated to RM stage by ${userContext.name}.`
      ).catch((err) => console.error("Failed to send push notification for escalation:", err));

      return res.status(200).json({
        message: "Request escalated to Regional Manager for final approval",
        approval: updated
      });
    } else {
      // Final approval (amount <= 25000 OR RM approves)
      updated = await prisma.$transaction(async (tx) => {
        const result = await tx.approval.update({
          where: { id },
          data: {
            status: ApprovalStatus.Approved,
            stage: "Closed"
          }
        });

        // Deduct/track budget in branch usedBudget
        await tx.branch.update({
          where: { id: approval.branchId },
          data: { usedBudget: { increment: approval.amount } }
        });

        // Create system notification
        await tx.notification.create({
          data: {
            title: `Approval Request Approved: ${approval.title}`,
            detail: `Approved by ${userContext.name} for ₹${approval.amount} at ${approval.branch.name}.`,
            scope: [RoleId.lc, RoleId.branchManager, RoleId.rm],
            branchId: approval.branchId,
            priority: Priority.Medium
          }
        });

        return result;
      });

      // Notify requester (outside transaction)
      await sendPushNotification(
        approval.requestedById,
        `Request Approved!`,
        `Your approval request for "${approval.title}" (₹${approval.amount}) was approved by ${userContext.name}.`
      ).catch((err) => console.error("Failed to send push notification to requester:", err));

      return res.status(200).json({
        message: "Request approved successfully",
        approval: updated
      });
    }
  } catch (error: any) {
    console.error("Approve request error: ", error);
    return res.status(500).json({ 
      message: "Server error approving request", 
      error: process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred" 
    });
  }
};

export const rejectRequest = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userContext = req.user;
    if (!userContext) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const approval = await prisma.approval.findUnique({
      where: { id },
      include: { branch: { select: { name: true } } }
    });

    if (!approval) {
      return res.status(404).json({ message: "Approval request not found" });
    }

    if (userContext.role === RoleId.lc) {
      return res.status(403).json({ message: "Forbidden: LCs cannot reject requests" });
    }
    if (userContext.role === RoleId.branchManager && !userContext.branchScope.includes(approval.branchId)) {
      return res.status(403).json({ message: "Forbidden: branch out of scope" });
    }
    if (userContext.role === RoleId.branchManager && approval.stage === "RM") {
      return res.status(403).json({ message: "Forbidden: Only Regional Managers can reject requests at the RM stage" });
    }
    if (approval.status !== ApprovalStatus.Pending) {
      return res.status(400).json({ message: `Request is already ${approval.status.toLowerCase()}` });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.approval.update({
        where: { id },
        data: {
          status: ApprovalStatus.Rejected,
          stage: "Closed"
        }
      });

      // Create system notification
      await tx.notification.create({
        data: {
          title: `Approval Request Rejected: ${approval.title}`,
          detail: `Rejected by ${userContext.name} for ₹${approval.amount} at ${approval.branch.name}.`,
          scope: [RoleId.lc, RoleId.branchManager, RoleId.rm],
          branchId: approval.branchId,
          priority: Priority.Medium
        }
      });

      return result;
    });

    // Notify requester (outside transaction)
    await sendPushNotification(
      approval.requestedById,
      `Request Rejected`,
      `Your approval request for "${approval.title}" (₹${approval.amount}) was rejected by ${userContext.name}.`
    ).catch((err) => console.error("Failed to send push notification to requester:", err));

    return res.status(200).json({
      message: "Request rejected successfully",
      approval: updated
    });
  } catch (error: any) {
    console.error("Reject request error: ", error);
    return res.status(500).json({ 
      message: "Server error rejecting request", 
      error: process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred" 
    });
  }
};
