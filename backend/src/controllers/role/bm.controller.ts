import { Response } from "express";
import { TaskStatus, RoleId, Priority, VisitStatus, ComplaintStatus } from "@prisma/client";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { recalcBranchStats, relativeTime } from "../../lib/stats";
import prisma from "../../lib/prisma";

// Helper: today's date in IST
const getTodayIST = (): string => {
  const options = { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" } as const;
  return new Intl.DateTimeFormat("en-CA", options).format(new Date());
};

/**
 * GET /api/bm/dashboard
 * Returns what BM home screen needs: branches, pending approvals, visits, notifications.
 */
export const bmDashboard = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    if (user.role !== RoleId.branchManager && user.role !== RoleId.aa) return res.status(403).json({ message: "Forbidden: BM only" });

    const scopedBranchIds = user.branchScope || [];

    const [branches, approvals, visits, notifications] = await Promise.all([
      // Branches in scope Ã¢â‚¬â€ only KPI fields BM home uses
      prisma.branch.findMany({
        where: { id: { in: scopedBranchIds } },
        select: {
          id: true,
          name: true,
          code: true,
          city: true,
          address: true,
          staffCount: true,
          criticalAlerts: true,
          sla: true,
          todayAttendance: true,
          openIssues: true,
          monthlyBudget: true,
          usedBudget: true,
          health: true,
          performance: true,
          nextVisit: true,
          lastVisit: true,
          auditScore: true,
          applianceRisk: true,
          revenueIndex: true,
          customerFootfall: true,
        },
        orderBy: { name: "asc" },
      }),

      // Approvals in scope Ã¢â‚¬â€ only fields BM approvals screen uses
      prisma.approval.findMany({
        where: { branchId: { in: scopedBranchIds } },
        select: {
          id: true,
          title: true,
          kind: true,
          amount: true,
          status: true,
          priority: true,
          branchId: true,
          requestedById: true,
          stage: true,
          age: true,
          note: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
      }),

      // Visits in scope Ã¢â‚¬â€ all fields (visits screen needs them)
      prisma.visit.findMany({
        where: { branchId: { in: scopedBranchIds } },
        select: {
          id: true,
          branchId: true,
          purpose: true,
          scheduledAt: true,
          status: true,
          agenda: true,
          report: true,
          managerId: true,
        },
        orderBy: { scheduledAt: "asc" },
      }),

      // Notifications scoped to BM role
      prisma.notification.findMany({
        where: { scope: { has: RoleId.branchManager } },
        select: {
          id: true,
          title: true,
          detail: true,
          priority: true,
          scope: true,
          read: true,
          bookmarked: true,
          branchId: true,
          time: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

    // Normalize approval fields for frontend compatibility
    const normalizedApprovals = approvals.map((a) => ({
      ...a,
      requestedBy: a.requestedById,
    }));

    const enrichedNotifications = notifications.map((n) => ({
      ...n,
      time: relativeTime(n.createdAt),
    }));

    return res.status(200).json({ branches, approvals: normalizedApprovals, visits, notifications: enrichedNotifications });
  } catch (error: any) {
    console.error("BM dashboard error:", error);
    return res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};

/**
 * GET /api/bm/attendance
 * Returns attendance for all users in scoped branches + their tasks for today.
 * This replaces the generic GET /attendance for BM role.
 */
export const bmAttendance = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    if (user.role !== RoleId.branchManager && user.role !== RoleId.aa) return res.status(403).json({ message: "Forbidden: BM only" });

    const scopedBranchIds = user.branchScope || [];
    const today = getTodayIST();

    const [attendanceLogs, staffUsers, scopedChecks] = await Promise.all([
      // Attendance logs for users in scoped branches Ã¢â‚¬â€  lean shape with weeklyTasks
      prisma.attendanceLog.findMany({
        where: {
          OR: [
            { user: { branchId: { in: scopedBranchIds } } },
            { userId: user.id }
          ]
        },
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
          remarks: true,
          photos: true,
          weeklyTasks: { select: { id: true, description: true, estimatedHours: true } },
        },
        orderBy: { date: "desc" },
        take: 500, // last 500 records is enough for BM calendar view
      }),

      // Users in scope Ã¢â‚¬â€ only fields BM attendance screen uses
      prisma.user.findMany({
        where: { branchId: { in: scopedBranchIds } },
        select: {
          id: true,
          name: true,
          role: true,
          branchId: true,
          status: true,
          attendancePct: true,
        },
        orderBy: { name: "asc" },
      }),

      // Weekly checks for scoped branches Ã¢â‚¬â€ for queue display
      prisma.check.findMany({
        where: {
          branchId: { in: scopedBranchIds },
          schedule: "Weekly",
          status: { in: [TaskStatus.Pending, TaskStatus.InProgress, TaskStatus.Completed] },
        },
        select: {
          id: true,
          title: true,
          status: true,
          assignedToId: true,
          branchId: true,
          schedule: true,
        },
        orderBy: { deadline: "asc" },
      }),
    ]);

    return res.status(200).json({
      attendance: attendanceLogs,
      users: staffUsers,
      checks: scopedChecks.map((t) => ({ ...t, assignedTo: t.assignedToId })),
    });
  } catch (error: any) {
    console.error("BM attendance error:", error);
    return res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};

/**
 * GET /api/bm/tasks
 * Returns weekly checks for branches in the BM's scope Ã¢â‚¬â€ lean fields only.
 */
export const bmTasks = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    if (user.role !== RoleId.branchManager && user.role !== RoleId.aa) return res.status(403).json({ message: "Forbidden: BM only" });

    const scopedBranchIds = user.branchScope || [];

    const checks = await prisma.check.findMany({
      where: { branchId: { in: scopedBranchIds }, schedule: "Weekly" },
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
  } catch (error: any) {
    console.error("BM tasks error:", error);
    return res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};

/**
 * GET /api/bm/approvals
 * Returns approvals for branches in BM scope.
 */
export const bmApprovals = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    if (user.role !== RoleId.branchManager && user.role !== RoleId.aa) return res.status(403).json({ message: "Forbidden: BM only" });

    const scopedBranchIds = user.branchScope || [];

    const approvals = await prisma.approval.findMany({
      where: { branchId: { in: scopedBranchIds } },
      select: {
        id: true,
        title: true,
        kind: true,
        amount: true,
        status: true,
        priority: true,
        branchId: true,
        requestedById: true,
        stage: true,
        age: true,
        note: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    return res.status(200).json(
      approvals.map((a) => ({ ...a, requestedBy: a.requestedById }))
    );
  } catch (error: any) {
    console.error("BM approvals error:", error);
    return res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};

/**
 * GET /api/bm/branches
 * Returns branches in scope with appliances and staff counts.
 */
export const bmBranches = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    if (user.role !== RoleId.branchManager && user.role !== RoleId.aa) return res.status(403).json({ message: "Forbidden: BM only" });

    const scopedBranchIds = user.branchScope || [];

    const [branches, appliances, users] = await Promise.all([
      prisma.branch.findMany({
        where: { id: { in: scopedBranchIds } },
        orderBy: { name: "asc" },
      }),

      prisma.appliance.findMany({
        where: { branchId: { in: scopedBranchIds } },
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
          imageUrl: true,
        },
        orderBy: { name: "asc" },
      }),

      prisma.user.findMany({
        where: { branchId: { in: scopedBranchIds } },
        select: {
          id: true,
          name: true,
          role: true,
          branchId: true,
          attendancePct: true,
          proofRate: true,
          rating: true,
          status: true,
          phone: true,
          position: true,
          tasksClosed: true,
          shift: true,
        },
        orderBy: { name: "asc" },
      }),
    ]);

    return res.status(200).json({ branches, appliances, users });
  } catch (error: any) {
    console.error("BM branches error:", error);
    return res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};

/**
 * GET /api/bm/complaints
 * Returns complaints for branches in BM scope.
 */
export const bmComplaints = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    if (user.role !== RoleId.branchManager && user.role !== RoleId.aa) return res.status(403).json({ message: "Forbidden: BM only" });

    const scopedBranchIds = user.branchScope || [];

    const complaints = await prisma.complaint.findMany({
      where: { branchId: { in: scopedBranchIds } },
      select: {
        complaintId: true,
        priority: true,
        status: true,
        branchId: true,
        description: true,
        vendorRemarks: true,
        raisedById: true,
        assetId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json(
      complaints.map((c) => ({
        ...c,
        reportedBy: c.raisedById,
        remarks: (() => {
          try {
            if (!c.vendorRemarks) return [];
            if (typeof c.vendorRemarks === "string") {
              const parsed = JSON.parse(c.vendorRemarks as any);
              return Array.isArray(parsed) ? parsed : [parsed];
            }
            return Array.isArray(c.vendorRemarks) ? c.vendorRemarks : [];
          } catch {
            return [];
          }
        })(),
      }))
    );
  } catch (error: any) {
    console.error("BM complaints error:", error);
    return res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};

/**
 * GET /api/bm/visits
 * Returns visits for branches in BM scope.
 */
export const bmVisits = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    if (user.role !== RoleId.branchManager && user.role !== RoleId.aa) return res.status(403).json({ message: "Forbidden: BM only" });

    const scopedBranchIds = user.branchScope || [];

    const visits = await prisma.visit.findMany({
      where: { branchId: { in: scopedBranchIds } },
      select: {
        id: true,
        branchId: true,
        purpose: true,
        scheduledAt: true,
        status: true,
        agenda: true,
        report: true,
        managerId: true,
      },
      orderBy: { scheduledAt: "asc" },
    });

    return res.status(200).json(visits);
  } catch (error: any) {
    console.error("BM visits error:", error);
    return res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};

/**
 * POST /api/bm/complaints/:id/reject
 * Rejects a complaint (sets status to Resolved with a rejection note in timeline).
 * Only BMs can reject complaints in their scoped branches.
 */
export const bmRejectComplaint = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    if (user.role !== RoleId.branchManager && user.role !== RoleId.aa) return res.status(403).json({ message: "Forbidden: BM only" });

    const { id } = req.params;
    const { reason } = req.body as { reason?: string };
    const scopedBranchIds = user.branchScope || [];

    const existing = await prisma.complaint.findUnique({
      where: { id },
      select: { id: true, branchId: true, status: true, resolutionNotes: true },
    });
    if (!existing) return res.status(404).json({ message: "Complaint not found" });
    if (!scopedBranchIds.includes(existing.branchId)) return res.status(403).json({ message: "Complaint is not within your scope" });
    if (existing.status === ComplaintStatus.RESOLVED) {
      return res.status(409).json({ message: "Complaint is already resolved or rejected" });
    }

    // Append a rejection entry to the timeline (JSON array of strings)
    const currentTimeline = (() => {
      try {
        const raw = existing.resolutionNotes;
        if (!raw) return [];
        if (typeof raw === "string") return JSON.parse(raw);
        if (Array.isArray(raw)) return raw;
        return [];
      } catch { return []; }
    })();
    const now = new Date();
    const ts = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const timelineArr = [...currentTimeline, `${ts} - Rejected by BM: ${reason || "No reason provided"}`];

    const updated = await prisma.complaint.update({
      where: { id },
      data: { status: ComplaintStatus.RESOLVED, resolutionNotes: `Rejected by BM: ${reason || "No reason provided"}` },
      select: { id: true, complaintId: true, status: true, branchId: true, resolutionNotes: true, vendorRemarks: true, updatedAt: true },
    });

    recalcBranchStats(existing.branchId).catch((err) => console.error("Failed to recalc branch stats after BM reject complaint:", err));

    return res.status(200).json({ complaint: updated });
  } catch (error: any) {
    console.error("BM reject complaint error:", error);
    return res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};

/**
 * PUT /api/bm/tasks/:id
 * Allows BM to edit a task (title, notes, deadline, priority, assignee, checklist total).
 */
export const bmEditTask = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    if (user.role !== RoleId.branchManager && user.role !== RoleId.aa) return res.status(403).json({ message: "Forbidden: BM only" });

    const { id } = req.params;
    const scopedBranchIds = user.branchScope || [];
    const { title, notes, deadline, priority, assignedToId, checklistTotal, proofRequired, zone, schedule } = req.body as {
      title?: string;
      notes?: string;
      deadline?: string;
      priority?: Priority;
      assignedToId?: string;
      checklistTotal?: number;
      proofRequired?: boolean;
      zone?: string;
      schedule?: string;
    };

    const existing = await prisma.check.findUnique({ where: { id }, select: { id: true, branchId: true, status: true } });
    if (!existing) return res.status(404).json({ message: "Check not found" });
    if (!scopedBranchIds.includes(existing.branchId)) return res.status(403).json({ message: "Task is not within your scope" });
    if (existing.status === TaskStatus.Revoked) return res.status(409).json({ message: "Cannot edit an archived (revoked) task" });

    const updated = await prisma.check.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(notes !== undefined && { notes }),
        ...(deadline !== undefined && { deadline: new Date(deadline) }),
        ...(priority !== undefined && { priority }),
        ...(assignedToId !== undefined && { assignedToId }),
        ...(checklistTotal !== undefined && { checklistTotal }),
        ...(proofRequired !== undefined && { proofRequired }),
        ...(zone !== undefined && { zone }),
        ...(schedule !== undefined && { schedule }),
      },
      select: {
        id: true, title: true, status: true, schedule: true, zone: true,
        deadline: true, assignedToId: true, assignedById: true, audience: true,
        priority: true, branchId: true, checklistTotal: true, notes: true, proofRequired: true,
      },
    });

    return res.status(200).json({ check: { ...updated, assignedTo: updated.assignedToId, assignedBy: updated.assignedById } });
  } catch (error: any) {
    console.error("BM edit task error:", error);
    return res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};

/**
 * PATCH /api/bm/tasks/:id/archive
 * Soft-archives a task by setting its status to Revoked.
 */
export const bmArchiveTask = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    if (user.role !== RoleId.branchManager && user.role !== RoleId.aa) return res.status(403).json({ message: "Forbidden: BM only" });

    const { id } = req.params;
    const scopedBranchIds = user.branchScope || [];

    const existing = await prisma.check.findUnique({ where: { id }, select: { id: true, branchId: true, status: true } });
    if (!existing) return res.status(404).json({ message: "Check not found" });
    if (!scopedBranchIds.includes(existing.branchId)) return res.status(403).json({ message: "Task is not within your scope" });
    if (existing.status === TaskStatus.Revoked) return res.status(409).json({ message: "Task is already archived" });

    const updated = await prisma.check.update({
      where: { id },
      data: { status: TaskStatus.Revoked },
      select: { id: true, title: true, status: true, branchId: true, updatedAt: true },
    });

    return res.status(200).json({ check: updated });
  } catch (error: any) {
    console.error("BM archive task error:", error);
    return res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};

/**
 * PUT /api/bm/visits/:id
 * Allows BM to reschedule a visit (update scheduledAt, purpose, agenda).
 */
export const bmEditVisit = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    if (user.role !== RoleId.branchManager && user.role !== RoleId.aa) return res.status(403).json({ message: "Forbidden: BM only" });

    const { id } = req.params;
    const scopedBranchIds = user.branchScope || [];
    const { scheduledAt, purpose, agenda } = req.body as {
      scheduledAt?: string;
      purpose?: string;
      agenda?: string;
    };

    const existing = await prisma.visit.findUnique({ where: { id }, select: { id: true, branchId: true, status: true } });
    if (!existing) return res.status(404).json({ message: "Visit not found" });
    if (!scopedBranchIds.includes(existing.branchId)) return res.status(403).json({ message: "Visit is not within your scope" });
    if (existing.status === VisitStatus.Completed || existing.status === VisitStatus.Cancelled) {
      return res.status(409).json({ message: "Cannot reschedule a completed or cancelled visit" });
    }

    const updated = await prisma.visit.update({
      where: { id },
      data: {
        ...(scheduledAt !== undefined && { scheduledAt: new Date(scheduledAt) }),
        ...(purpose !== undefined && { purpose }),
        ...(agenda !== undefined && { agenda }),
        status: VisitStatus.Scheduled, // reset to Scheduled on reschedule
      },
      select: { id: true, branchId: true, purpose: true, scheduledAt: true, status: true, agenda: true, report: true, managerId: true },
    });

    return res.status(200).json({ visit: updated });
  } catch (error: any) {
    console.error("BM edit visit error:", error);
    return res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};

/**
 * PATCH /api/bm/visits/:id/cancel
 * Soft-cancels a visit by marking it Completed and writing "Cancelled" in the report.
 * (VisitStatus has no Cancelled value; Completed + report note is the workaround.)
 */
export const bmCancelVisit = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    if (user.role !== RoleId.branchManager && user.role !== RoleId.aa) return res.status(403).json({ message: "Forbidden: BM only" });

    const { id } = req.params;
    const scopedBranchIds = user.branchScope || [];
    const { reason } = req.body as { reason?: string };

    const existing = await prisma.visit.findUnique({ where: { id }, select: { id: true, branchId: true, status: true } });
    if (!existing) return res.status(404).json({ message: "Visit not found" });
    if (!scopedBranchIds.includes(existing.branchId)) return res.status(403).json({ message: "Visit is not within your scope" });
    if (existing.status === VisitStatus.Completed || existing.status === VisitStatus.Cancelled) {
      return res.status(409).json({ message: "Visit is already completed or cancelled" });
    }

    const updated = await prisma.visit.update({
      where: { id },
      data: {
        status: VisitStatus.Cancelled,
        report: `Cancelled: ${reason || "No reason provided"} Ã¢â‚¬â€ ${new Date().toISOString()}`,
      },
      select: { id: true, branchId: true, purpose: true, scheduledAt: true, status: true, agenda: true, report: true, managerId: true },
    });

    return res.status(200).json({ visit: updated });
  } catch (error: any) {
    console.error("BM cancel visit error:", error);
    return res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};


