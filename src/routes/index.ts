import { Router } from "express";
import authRoutes from "./auth.routes";
import attendanceRoutes from "./attendance.routes";
import taskRoutes from "./task.routes";
import cronRoutes from "./cron.routes";
import userRoutes from "./user.routes";
import branchRoutes from "./branch.routes";
import applianceRoutes from "./appliance.routes";
import complaintRoutes from "./complaint.routes";
import approvalRoutes from "./approval.routes";
import visitRoutes from "./visit.routes";
import notificationRoutes from "./notification.routes";
// Role-specific lean API routers (replaces old generic GET endpoints)
import lcRoutes from "./role/lc.routes";
import bmRoutes from "./role/bm.routes";
import rmRoutes from "./role/rm.routes";

const router = Router();

// ── Auth ──────────────────────────────────────────────────────────────────────
router.use("/auth", authRoutes);

// ── Attendance: POST (mark) + GET my-calendar kept; generic GET removed ───────
router.use("/attendance", attendanceRoutes);

// ── Tasks: POST (create/complete/proof/revoke) kept; generic GET removed ──────
router.use("/tasks", taskRoutes);

// ── DEPRECATED: /dashboard/metrics replaced by /lc, /bm, /rm dashboard routes
// router.use("/dashboard", dashboardRoutes);

// ── Cron jobs (internal) ──────────────────────────────────────────────────────
router.use("/cron", cronRoutes);

// ── Users: all CRUD routes kept ───────────────────────────────────────────────
router.use("/users", userRoutes);

// ── Branches: all routes kept (used by branch detail screens) ─────────────────
router.use("/branches", branchRoutes);

// ── Appliances: all routes kept ───────────────────────────────────────────────
router.use("/appliances", applianceRoutes);

// ── Complaints: POST + action routes kept; generic GET may be legacy ──────────
router.use("/complaints", complaintRoutes);

// ── Approvals: POST (create/approve/reject) kept; generic GET removed ─────────
router.use("/approvals", approvalRoutes);

// ── Visits: all routes kept ───────────────────────────────────────────────────
router.use("/visits", visitRoutes);

// ── Notifications: all routes kept ───────────────────────────────────────────
router.use("/notifications", notificationRoutes);

// ── Role-specific lean endpoints (single-call, field-projected) ───────────────
router.use("/lc", lcRoutes);   // LC: /lc/dashboard, /lc/tasks, /lc/attendance/calendar
router.use("/bm", bmRoutes);   // BM: /bm/dashboard, /bm/attendance, /bm/tasks, /bm/approvals, /bm/branches, /bm/complaints, /bm/visits
router.use("/rm", rmRoutes);   // RM: /rm/dashboard, /rm/attendance, /rm/finance, /rm/users, /rm/analytics, /rm/tasks

export default router;
