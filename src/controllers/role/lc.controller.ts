import { Response } from "express";
import { TaskStatus, RoleId, Priority } from "@prisma/client";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import prisma from "../../lib/prisma";

// Helper: today's date in IST
const getTodayIST = (): string => {
  const options = { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" } as const;
  return new Intl.DateTimeFormat("en-CA", options).format(new Date());
};

/**
 * GET /api/lc/dashboard
 * Returns everything the LC home screen needs in a single query.
 * Shape: { branch, tasks, complaints, appliances, todayAttendance }
 */
export const lcDashboard = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    if (user.role !== RoleId.lc) return res.status(403).json({ message: "Forbidden: LC only" });

    const branchId = user.branchId;
    if (!branchId) return res.status(400).json({ message: "LC has no branch assigned" });

    const today = getTodayIST();

    const [branch, tasks, complaints, appliances, todayAttendance] = await Promise.all([
      // Branch — only the KPI fields the LC screen uses
      prisma.branch.findUnique({
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

      // Tasks — my branch, only fields needed for home + tasks screens
      prisma.task.findMany({
        where: { branchId },
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
          checklistTotal: true,
          notes: true,
          proofRequired: true,
        },
        orderBy: { deadline: "asc" },
      }),

      // Complaints — my branch, lean
      prisma.complaint.findMany({
        where: { branchId },
        select: {
          id: true,
          title: true,
          type: true,
          impact: true,
          priority: true,
          status: true,
          branchId: true,
          estimatedCost: true,
          description: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),

      // Appliances — my branch, lean
      prisma.appliance.findMany({
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
      prisma.attendanceLog.findFirst({
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
    const normalizedTasks = tasks.map((t) => ({
      ...t,
      assignedTo: t.assignedToId,
      assignedBy: t.assignedById,
    }));

    return res.status(200).json({
      branch,
      tasks: normalizedTasks,
      complaints,
      appliances,
      todayAttendance,
    });
  } catch (error: any) {
    console.error("LC dashboard error:", error);
    return res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};

/**
 * GET /api/lc/tasks
 * Returns only tasks assigned to or visible by this LC.
 */
export const lcTasks = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    if (user.role !== RoleId.lc) return res.status(403).json({ message: "Forbidden: LC only" });

    const branchId = user.branchId;
    if (!branchId) return res.status(400).json({ message: "LC has no branch" });

    const { status } = req.query;

    const tasks = await prisma.task.findMany({
      where: {
        branchId,
        ...(status ? { status: status as TaskStatus } : {}),
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
        checklistTotal: true,
        notes: true,
        proofRequired: true,
        completedById: true,
        completedAt: true,
      },
      orderBy: [{ status: "asc" }, { deadline: "asc" }],
    });

    return res.status(200).json({
      tasks: tasks.map((t) => ({
        ...t,
        assignedTo: t.assignedToId,
        assignedBy: t.assignedById,
        completedBy: t.completedById,
      })),
    });
  } catch (error: any) {
    console.error("LC tasks error:", error);
    return res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};

/**
 * PUT /api/lc/attendance/:id/checkout
 * Registers the check-out timestamp for the LC's own attendance record.
 * Only the owner of the record can check out.
 */
export const lcCheckout = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    if (user.role !== RoleId.lc) return res.status(403).json({ message: "Forbidden: LC only" });

    const { id } = req.params;
    const { checkOut } = req.body as { checkOut?: string };

    if (!checkOut) return res.status(400).json({ message: "checkOut time is required (HH:MM)" });

    // Security: LC can only check out their own record
    const existing = await prisma.attendanceLog.findUnique({ where: { id }, select: { id: true, userId: true, checkOut: true } });
    if (!existing) return res.status(404).json({ message: "Attendance record not found" });
    if (existing.userId !== user.id) return res.status(403).json({ message: "You can only check out your own record" });
    if (existing.checkOut) return res.status(409).json({ message: "Already checked out" });

    const updated = await prisma.attendanceLog.update({
      where: { id },
      data: { checkOut },
      select: { id: true, userId: true, date: true, checkIn: true, checkOut: true, status: true },
    });

    return res.status(200).json({ attendance: updated });
  } catch (error: any) {
    console.error("LC checkout error:", error);
    return res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};

/**
 * PUT /api/lc/complaints/:id
 * Allows LC to edit their own complaint — ONLY if it has not yet been assigned to a vendor.
 */
export const lcEditComplaint = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    if (user.role !== RoleId.lc) return res.status(403).json({ message: "Forbidden: LC only" });

    const { id } = req.params;
    const { title, description, impact, priority, estimatedCost } = req.body as {
      title?: string;
      description?: string;
      impact?: string;
      priority?: Priority;
      estimatedCost?: number;
    };

    const existing = await prisma.complaint.findUnique({
      where: { id },
      select: { id: true, reportedById: true, assignedVendor: true },
    });
    if (!existing) return res.status(404).json({ message: "Complaint not found" });
    if (existing.reportedById !== user.id) return res.status(403).json({ message: "You can only edit your own complaints" });
    if (existing.assignedVendor && existing.assignedVendor !== "Not assigned") {
      return res.status(409).json({ message: "Complaint cannot be edited after vendor assignment" });
    }

    const updated = await prisma.complaint.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(impact !== undefined && { impact }),
        ...(priority !== undefined && { priority }),
        ...(estimatedCost !== undefined && { estimatedCost }),
      },
      select: {
        id: true, title: true, type: true, impact: true, priority: true,
        status: true, branchId: true, estimatedCost: true, description: true, createdAt: true, updatedAt: true,
      },
    });

    return res.status(200).json({ complaint: updated });
  } catch (error: any) {
    console.error("LC edit complaint error:", error);
    return res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};
