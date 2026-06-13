import { Response } from "express";
import { TaskStatus, RoleId } from "@prisma/client";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { relativeTime } from "../../lib/stats";
import prisma from "../../lib/prisma";

/**
 * GET /api/rm/dashboard
 * Returns everything the RM dashboard needs: branches, complaints, approvals, notifications.
 */
export const rmDashboard = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    if (user.role !== RoleId.rm) return res.status(403).json({ message: "Forbidden: RM only" });

    const [branches, complaints, approvals, notifications] = await Promise.all([
      // Branches — health/SLA KPI fields for dashboard tiles
      prisma.branch.findMany({
        select: {
          id: true,
          name: true,
          code: true,
          city: true,
          address: true,
          health: true,
          sla: true,
          criticalAlerts: true,
          todayAttendance: true,
          openIssues: true,
          monthlyBudget: true,
          usedBudget: true,
          staffCount: true,
          nextVisit: true,
          lastVisit: true,
          applianceRisk: true,
          auditScore: true,
          performance: true,
          revenueIndex: true,
          customerFootfall: true,
        },
        orderBy: { name: "asc" },
      }),

      // Complaints — for watchlist and timeline
      prisma.complaint.findMany({
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          priority: true,
          estimatedCost: true,
          branchId: true,
          description: true,
          impact: true,
          assignedVendor: true,
          assetId: true,
          escalationStage: true,
          createdAt: true,
          updatedAt: true,
          timeline: true,
          reportedById: true,
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),

      // Approvals — for decision feed + capex summary
      prisma.approval.findMany({
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

      // Notifications — RM scope
      prisma.notification.findMany({
        where: { scope: { has: RoleId.rm } },
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

    const normalizedComplaints = complaints.map((c) => ({
      ...c,
      reportedBy: c.reportedById,
      timeline: (() => {
        try {
          if (!c.timeline) return [];
          if (typeof c.timeline === "string") {
            const parsed = JSON.parse(c.timeline as any);
            return Array.isArray(parsed) ? parsed : [parsed];
          }
          return Array.isArray(c.timeline) ? c.timeline : [];
        } catch {
          return [];
        }
      })(),
    }));

    const normalizedApprovals = approvals.map((a) => ({
      ...a,
      requestedBy: a.requestedById,
    }));

    const enrichedNotifications = notifications.map((n) => ({
      ...n,
      time: relativeTime(n.createdAt),
    }));

    return res.status(200).json({ branches, complaints: normalizedComplaints, approvals: normalizedApprovals, notifications: enrichedNotifications });
  } catch (error: any) {
    console.error("RM dashboard error:", error);
    return res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};

/**
 * GET /api/rm/attendance
 * Returns all attendance records + minimal user context for the RM attendance screen.
 */
export const rmAttendance = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    if (user.role !== RoleId.rm) return res.status(403).json({ message: "Forbidden: RM only" });

    const [attendanceLogs, allUsers, scopedTasks] = await Promise.all([
      prisma.attendanceLog.findMany({
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
        orderBy: { date: "desc" },
        take: 1000,
      }),

      // Users — lean fields for roster display
      prisma.user.findMany({
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

      // Tasks in scope for RM attendance screen's "Today's Queue"
      prisma.task.findMany({
        where: {
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
        take: 2000,
      }),
    ]);

    return res.status(200).json({
      attendance: attendanceLogs,
      users: allUsers,
      tasks: scopedTasks.map((t) => ({ ...t, assignedTo: t.assignedToId })),
    });
  } catch (error: any) {
    console.error("RM attendance error:", error);
    return res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};

/**
 * GET /api/rm/finance
 * Returns approval financial data + branch budget summary.
 */
export const rmFinance = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    if (user.role !== RoleId.rm) return res.status(403).json({ message: "Forbidden: RM only" });

    const [approvals, branches] = await Promise.all([
      prisma.approval.findMany({
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

      prisma.branch.findMany({
        select: {
          id: true,
          name: true,
          monthlyBudget: true,
          usedBudget: true,
          city: true,
          code: true,
          revenueIndex: true,
          customerFootfall: true,
          performance: true,
          lastVisit: true,
          address: true,
        },
        orderBy: { name: "asc" },
      }),
    ]);

    return res.status(200).json({
      approvals: approvals.map((a) => ({ ...a, requestedBy: a.requestedById })),
      branches,
    });
  } catch (error: any) {
    console.error("RM finance error:", error);
    return res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};

/**
 * GET /api/rm/users
 * Returns all users with branch context for RM user management screen.
 */
export const rmUsers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    if (user.role !== RoleId.rm) return res.status(403).json({ message: "Forbidden: RM only" });

    const [users, branches] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          branchId: true,
          status: true,
          rating: true,
          attendancePct: true,
          proofRate: true,
          phone: true,
          position: true,
          tasksClosed: true,
          shift: true,
          branchScope: true,
        },
        orderBy: { name: "asc" },
      }),

      prisma.branch.findMany({
        select: { id: true, name: true, city: true, code: true },
        orderBy: { name: "asc" },
      }),
    ]);

    return res.status(200).json({ users, branches });
  } catch (error: any) {
    console.error("RM users error:", error);
    return res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};

/**
 * GET /api/rm/analytics
 * Returns per-branch KPI aggregates for RM analytics screen.
 */
export const rmAnalytics = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    if (user.role !== RoleId.rm) return res.status(403).json({ message: "Forbidden: RM only" });

    const [branches, taskStats, complaintStats, approvalStats] = await Promise.all([
      prisma.branch.findMany({
        select: {
          id: true,
          name: true,
          code: true,
          city: true,
          address: true,
          health: true,
          sla: true,
          criticalAlerts: true,
          todayAttendance: true,
          openIssues: true,
          monthlyBudget: true,
          usedBudget: true,
          staffCount: true,
          applianceRisk: true,
          auditScore: true,
          performance: true,
          revenueIndex: true,
          customerFootfall: true,
          lastVisit: true,
        },
        orderBy: { name: "asc" },
      }),

      // Task completion rates per branch
      prisma.task.groupBy({
        by: ["branchId", "status"],
        _count: { id: true },
      }),

      // Complaint counts per branch
      prisma.complaint.groupBy({
        by: ["branchId", "status"],
        _count: { id: true },
      }),

      // Approval amounts per branch
      prisma.approval.groupBy({
        by: ["branchId", "status"],
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

    // Build branch-level analytics object
    const analytics = branches.map((b) => {
      const branchTasks = taskStats.filter((t) => t.branchId === b.id);
      const totalTasks = branchTasks.reduce((s, t) => s + t._count.id, 0);
      const completedTasks = branchTasks.find((t) => t.status === "Completed")?._count.id || 0;

      const branchComplaints = complaintStats.filter((c) => c.branchId === b.id);
      const openComplaints = branchComplaints.filter((c) => c.status !== "Resolved").reduce((s, c) => s + c._count.id, 0);
      const resolvedComplaints = branchComplaints.find((c) => c.status === "Resolved")?._count.id || 0;

      const branchApprovals = approvalStats.filter((a) => a.branchId === b.id);
      const approvedCapex = branchApprovals.find((a) => a.status === "Approved")?._sum.amount || 0;

      return {
        branchId: b.id,
        branchName: b.name,
        branchCode: b.code,
        city: b.city,
        health: b.health,
        sla: b.sla,
        criticalAlerts: b.criticalAlerts,
        todayAttendance: b.todayAttendance,
        staffCount: b.staffCount,
        monthlyBudget: b.monthlyBudget,
        usedBudget: b.usedBudget,
        budgetBurnPct: b.monthlyBudget > 0 ? Math.round((b.usedBudget / b.monthlyBudget) * 100) : 0,
        taskCompletionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        totalTasks,
        completedTasks,
        openComplaints,
        resolvedComplaints,
        approvedCapex,
        applianceRisk: b.applianceRisk,
        auditScore: b.auditScore,
      };
    });

    return res.status(200).json({ analytics });
  } catch (error: any) {
    console.error("RM analytics error:", error);
    return res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};

/**
 * GET /api/rm/tasks
 * Returns all tasks (RM scope) with lean fields.
 */
export const rmTasks = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    if (user.role !== RoleId.rm) return res.status(403).json({ message: "Forbidden: RM only" });

    const { status, branchId } = req.query;

    const tasks = await prisma.task.findMany({
      where: {
        ...(status ? { status: status as TaskStatus } : {}),
        ...(branchId ? { branchId: String(branchId) } : {}),
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
    console.error("RM tasks error:", error);
    return res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};

/**
 * GET /api/rm/finance/export
 * Streams a CSV file containing all approvals and branch budget summary.
 */
export const rmFinanceExport = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    if (user.role !== RoleId.rm) return res.status(403).json({ message: "Forbidden: RM only" });

    const [approvals, branches] = await Promise.all([
      prisma.approval.findMany({
        select: { id: true, title: true, kind: true, amount: true, status: true, priority: true, branchId: true, stage: true, note: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.branch.findMany({
        select: { id: true, name: true, city: true, code: true, monthlyBudget: true, usedBudget: true },
        orderBy: { name: "asc" },
      }),
    ]);

    // Build CSV in-memory
    const branchMap = new Map(branches.map((b) => [b.id, b]));
    const rows: string[] = [
      "ID,Title,Kind,Amount,Status,Priority,Branch,City,Stage,Note,UpdatedAt",
      ...approvals.map((a) => {
        const b = branchMap.get(a.branchId);
        const cols = [
          a.id,
          `"${a.title.replace(/"/g, '""')}"`,
          a.kind,
          a.amount.toFixed(2),
          a.status,
          a.priority,
          b ? `"${b.name}"` : a.branchId,
          b ? b.city : "",
          a.stage,
          `"${a.note.replace(/"/g, '""')}"`,
          a.updatedAt.toISOString(),
        ];
        return cols.join(",");
      }),
      "",
      "--- BRANCH BUDGET SUMMARY ---",
      "BranchID,Name,City,Code,MonthlyBudget,UsedBudget,BurnPct",
      ...branches.map((b) => {
        const burnPct = b.monthlyBudget > 0 ? ((b.usedBudget / b.monthlyBudget) * 100).toFixed(1) : "0.0";
        return [b.id, `"${b.name}"`, b.city, b.code, b.monthlyBudget.toFixed(2), b.usedBudget.toFixed(2), burnPct].join(",");
      }),
    ];

    const csv = rows.join("\n");
    const filename = `finance-export-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.status(200).send(csv);
  } catch (error: any) {
    console.error("RM finance export error:", error);
    return res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};

/**
 * PATCH /api/rm/users/:id/status
 * Locks or unlocks a user account. Body: { status: "Active" | "Locked" }
 */
export const rmUpdateUserStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    if (user.role !== RoleId.rm) return res.status(403).json({ message: "Forbidden: RM only" });

    const { id } = req.params;
    const { status } = req.body as { status?: string };

    if (!status || !["Active", "Locked"].includes(status)) {
      return res.status(400).json({ message: 'status must be "Active" or "Locked"' });
    }

    // Prevent RM from locking themselves
    if (id === user.id) return res.status(400).json({ message: "Cannot change your own account status" });

    const target = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true, role: true, status: true } });
    if (!target) return res.status(404).json({ message: "User not found" });

    const updated = await prisma.user.update({
      where: { id },
      data: { status },
      select: { id: true, name: true, email: true, role: true, status: true, branchId: true },
    });

    return res.status(200).json({ user: updated });
  } catch (error: any) {
    console.error("RM update user status error:", error);
    return res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};
