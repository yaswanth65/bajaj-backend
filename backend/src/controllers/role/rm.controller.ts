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
      // Branches Ã¢â‚¬â€ health/SLA KPI fields for dashboard tiles
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

      // Complaints Ã¢â‚¬â€ for watchlist and timeline
      prisma.complaint.findMany({
        select: {
          id: true,
          complaintId: true,
          priority: true,
          status: true,
          branchId: true,
          description: true,
          vendorRemarks: true,
          assetId: true,
          createdAt: true,
          updatedAt: true,
          raisedById: true,
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),

      // Approvals Ã¢â‚¬â€ for decision feed + capex summary
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

      // Notifications Ã¢â‚¬â€ RM scope
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
      reportedBy: c.raisedById,
      timeline: (() => {
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

    const [attendanceLogs, allUsers, scopedChecks] = await Promise.all([
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
          remarks: true,
          weeklyTasks: { select: { id: true, description: true, estimatedHours: true } },
        },
        orderBy: { date: "desc" },
        take: 1000,
      }),

      // Users Ã¢â‚¬â€ lean fields for roster display
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          role: true,
          branchId: true,
          status: true,
          attendancePct: true,
          branchScope: true,
        },
        orderBy: { name: "asc" },
      }),

      // Weekly checks in scope for RM attendance screen's queue
      prisma.check.findMany({
        where: {
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
        take: 2000,
      }),
    ]);

    return res.status(200).json({
      attendance: attendanceLogs,
      users: allUsers,
      checks: scopedChecks.map((t) => ({ ...t, assignedTo: t.assignedToId })),
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
      prisma.check.groupBy({
        by: ["branchId", "status"],
        _count: { id: true },
      }),

      // Complaint counts per branch
      prisma.complaint.groupBy({
        by: ["branchId", "status", "priority"],
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
      const openComplaints = branchComplaints.filter((c) => c.status !== "RESOLVED").reduce((s, c) => s + c._count.id, 0);
      const resolvedComplaints = branchComplaints.find((c) => c.status === "RESOLVED")?._count.id || 0;
      const criticalComplaints = branchComplaints.filter((c) => c.status !== "RESOLVED" && c.priority === "Critical").reduce((s, c) => s + c._count.id, 0);

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
        criticalComplaints,
        resolvedComplaints,
        approvedCapex,
        applianceRisk: b.applianceRisk,
        auditScore: b.auditScore,
      };
    });

    // 1. Filter by region if requested
    const region = req.query.region as string;
    let filteredAnalytics = analytics;
    if (region && region !== "all") {
      filteredAnalytics = analytics.filter(a => {
        let city = a.city || "";
        if (city.toLowerCase() === "chhatisgarh") city = "Chhattisgarh";
        return city === region;
      });
    }

    // 2. Compute aggregate region metrics
    const totalTasks = filteredAnalytics.reduce((s, a) => s + a.totalTasks, 0);
    const completedTasks = filteredAnalytics.reduce((s, a) => s + a.completedTasks, 0);
    const regionMetrics = {
      taskCompletionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      totalTasks,
      completedTasks,
      openComplaints: filteredAnalytics.reduce((s, a) => s + a.openComplaints, 0),
      criticalComplaints: filteredAnalytics.reduce((s, a) => s + a.criticalComplaints, 0),
      budgetBurnPct: filteredAnalytics.length > 0 ? Math.round((filteredAnalytics.reduce((s, a) => s + a.usedBudget, 0) / filteredAnalytics.reduce((s, a) => s + a.monthlyBudget, 0)) * 100) : 0,
    };

    // 3. Generate mock 6-month historical trends
    // In production, this would query historical snapshots or group by month.
    const currentMonth = new Date().getMonth();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const trends = {
      labels: Array.from({ length: 6 }).map((_, i) => months[(currentMonth - 5 + i + 12) % 12]),
      tasks: [75, 78, 80, regionMetrics.taskCompletionRate - 3, regionMetrics.taskCompletionRate - 1, regionMetrics.taskCompletionRate || 85]
    };

    // 4. Sort leaderboard (by completed tasks desc) and alerts (by Critical Alerts/Open Issues desc)
    const leaderboard = [...filteredAnalytics].sort((a, b) => b.completedTasks - a.completedTasks);
    const alerts = [...filteredAnalytics].filter(a => a.openComplaints > 0 || a.criticalAlerts > 0).sort((a, b) => {
      if (b.criticalAlerts !== a.criticalAlerts) return b.criticalAlerts - a.criticalAlerts;
      return b.openComplaints - a.openComplaints;
    });

    // 5. Fetch users for the filtered branches
    const filteredBranchIds = filteredAnalytics.map(b => b.branchId);
    const regionUsers = await prisma.user.findMany({
      where: {
        branchId: { in: filteredBranchIds }
      },
      select: {
        id: true,
        name: true,
        role: true,
        branchId: true,
        attendancePct: true,
        tasksClosed: true,
        proofRate: true,
        rating: true,
      }
    });

    // Map branch names to users
    const usersWithBranch = regionUsers.map(u => ({
      ...u,
      branchName: filteredAnalytics.find(b => b.branchId === u.branchId)?.branchName || "Unknown"
    }));

    return res.status(200).json({ 
      analytics: filteredAnalytics,
      regionMetrics,
      trends,
      leaderboard,
      alerts,
      users: usersWithBranch
    });
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

    const tasks = await prisma.check.findMany({
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
      checks: tasks.map((t) => ({
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

export const rmOperationalAlerts = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userContext = req.user;
    if (!userContext) return res.status(401).json({ message: "Unauthorized" });
    if (userContext.role !== RoleId.rm) return res.status(403).json({ message: "Forbidden: RM only" });

    const queryDateStr = (req.query.date as string) || new Date().toISOString().slice(0, 10);

    const [branches, users, attendanceLogs, complaints] = await Promise.all([
      prisma.branch.findMany({
        select: { id: true, name: true, code: true, shiftWindow: true }
      }),
      prisma.user.findMany({
        where: { role: { in: [RoleId.lc, RoleId.branchManager, RoleId.aa] } },
        select: { id: true, name: true, role: true, branchId: true, shift: true }
      }),
      prisma.attendanceLog.findMany({
        where: { date: queryDateStr },
        include: { user: { select: { id: true, name: true, role: true, branchId: true } } }
      }),
      prisma.complaint.findMany({
        where: {
          createdAt: { lte: new Date(`${queryDateStr}T23:59:59.999Z`) },
          status: { notIn: ["RESOLVED"] }
        },
        select: { id: true, complaintId: true, description: true, priority: true, status: true, branchId: true, createdAt: true }
      })
    ]);

    const alerts: any[] = [];
    const getIndiaTime = () => {
      const d = new Date();
      const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
      return new Date(utc + (3600000 * 5.5));
    };

    const nowIndia = getIndiaTime();
    const isToday = queryDateStr === nowIndia.toISOString().slice(0, 10);

    const getShiftStartMinutes = (window: string): number => {
      try {
        const startPart = window.split("-")[0].trim();
        const [h, m] = startPart.split(":").map(Number);
        return h * 60 + m;
      } catch {
        return 7 * 60;
      }
    };

    const currentMinutes = nowIndia.getHours() * 60 + nowIndia.getMinutes();

    // ── 1. Branch Not Opened Yet ──
    for (const branch of branches) {
      const shiftStartMinutes = getShiftStartMinutes(branch.shiftWindow);
      if (isToday && currentMinutes < shiftStartMinutes) {
        continue;
      }

      const lcCheckins = attendanceLogs.filter(
        (log) => log.user?.branchId === branch.id && log.user?.role === RoleId.lc
      );

      if (lcCheckins.length === 0) {
        alerts.push({
          id: `branch_not_opened_${branch.id}_${queryDateStr}`,
          type: "branch_not_opened",
          title: `Branch Not Opened Yet`,
          detail: `Branch "${branch.name}" (${branch.code}) has not opened yet. No LC marked attendance for shift start (${branch.shiftWindow.split("-")[0].trim()}).`,
          priority: "Critical",
          branchId: branch.id,
          branchName: branch.name,
          time: queryDateStr
        });
      }
    }

    // ── 2. Missing Staff Attendance ──
    for (const staff of users) {
      const log = attendanceLogs.find((l) => String(l.userId) === String(staff.id));
      const staffBranch = branches.find((b) => b.id === staff.branchId);
      const branchName = staffBranch?.name || "Unknown Branch";
      const shiftWindow = staff.shift || staffBranch?.shiftWindow || "09:00 - 18:00";
      const shiftStartMinutes = getShiftStartMinutes(shiftWindow);

      if (isToday && currentMinutes < shiftStartMinutes) {
        continue;
      }

      if (!log) {
        alerts.push({
          id: `missing_attendance_${staff.id}_${queryDateStr}`,
          type: "missing_attendance",
          title: `Missing Attendance`,
          detail: `Employee ${staff.name} (${staff.role.toUpperCase()}) at "${branchName}" did not check in for shift starting at ${shiftWindow.split("-")[0].trim()}.`,
          priority: "High",
          branchId: staff.branchId,
          branchName,
          entityId: staff.id,
          time: queryDateStr
        });
      }
    }

    // ── 3. Unresolved Complaints (SLA Breach) ──
    for (const cmp of complaints) {
      const cmpBranch = branches.find((b) => b.id === cmp.branchId);
      const branchName = cmpBranch?.name || "Unknown Branch";

      const createdTime = new Date(cmp.createdAt).getTime();
      const queryTime = new Date(`${queryDateStr}T23:59:59.999Z`).getTime();
      const ageHours = Math.floor((queryTime - createdTime) / (1000 * 60 * 60));

      if (ageHours >= 24) {
        const priority = cmp.priority === "Critical" ? "Critical" : "High";
        alerts.push({
          id: `unresolved_complaint_${cmp.id}_${queryDateStr}`,
          type: "unresolved_complaint",
          title: `Unresolved Complaint Breach`,
          detail: `Complaint ${cmp.complaintId} ("${cmp.description.substring(0, 40)}...") at "${branchName}" remains unresolved after ${Math.floor(ageHours / 24)} day(s) (Priority: ${cmp.priority}).`,
          priority,
          branchId: cmp.branchId,
          branchName,
          entityId: cmp.id,
          time: new Date(cmp.createdAt).toLocaleDateString()
        });
      }
    }

    // ── 4. Attendance Deviations / Early Checkouts ──
    for (const log of attendanceLogs) {
      const logBranchId = log.user?.branchId;
      if (!logBranchId) continue;
      
      const staffBranch = branches.find((b) => b.id === logBranchId);
      const branchName = staffBranch?.name || "Unknown Branch";

      if (log.location && log.location.toLowerCase().includes("deviation")) {
        alerts.push({
          id: `attendance_deviation_${log.id}_${queryDateStr}`,
          type: "attendance_deviation",
          title: `Attendance Geo-Deviation`,
          detail: `${log.user?.name} checked in at "${branchName}" with geo-location deviation warning: "${log.location}".`,
          priority: "Warning",
          branchId: logBranchId,
          branchName,
          entityId: log.userId,
          time: log.checkIn || queryDateStr
        });
      }

      if (log.checkIn && log.checkOut) {
        try {
          const [inH, inM] = log.checkIn.split(":").map(Number);
          const [outH, outM] = log.checkOut.split(":").map(Number);
          const durationHrs = (outH * 60 + outM - (inH * 60 + inM)) / 60;

          if (durationHrs > 0 && durationHrs < 5) {
            alerts.push({
              id: `attendance_halfday_${log.id}_${queryDateStr}`,
              type: "attendance_deviation",
              title: `Half-Day Warning`,
              detail: `${log.user?.name} checked out early at "${branchName}" after working only ${durationHrs.toFixed(1)} hours (Less than 5-hour half-day threshold).`,
              priority: "Warning",
              branchId: logBranchId,
              branchName,
              entityId: log.userId,
              time: log.checkOut
            });
          }
        } catch (err) {
          // ignore parsing error
        }
      }
    }

    return res.status(200).json({ alerts });
  } catch (error: any) {
    console.error("RM operational alerts error:", error);
    return res.status(500).json({
      message: "Server error generating operational exceptions",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};



