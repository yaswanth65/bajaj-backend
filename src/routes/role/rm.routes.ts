import { Router } from "express";
import { authenticateToken } from "../../middlewares/auth.middleware";
import {
  rmDashboard,
  rmAttendance,
  rmFinance,
  rmUsers,
  rmAnalytics,
  rmTasks,
  rmFinanceExport,
  rmUpdateUserStatus,
} from "../../controllers/role/rm.controller";

const router = Router();

// All RM routes require authentication
router.use(authenticateToken);

/** GET /api/rm/dashboard — branches + complaints + approvals + notifications */
router.get("/dashboard", rmDashboard);

/** GET /api/rm/attendance — all attendance + all users (RM scope) */
router.get("/attendance", rmAttendance);

/** GET /api/rm/finance — approvals financial data + branch budget summary */
router.get("/finance", rmFinance);

/** GET /api/rm/finance/export — download CSV of all approvals + branch budgets */
router.get("/finance/export", rmFinanceExport);

/** GET /api/rm/users — all users + branches for user management screen */
router.get("/users", rmUsers);

/** PATCH /api/rm/users/:id/status — lock or unlock a user account */
router.patch("/users/:id/status", rmUpdateUserStatus);

/** GET /api/rm/analytics — per-branch KPI aggregates */
router.get("/analytics", rmAnalytics);

/** GET /api/rm/tasks — all tasks (RM scope) with lean fields */
router.get("/tasks", rmTasks);

export default router;
