import { Router } from "express";
import { authenticateToken } from "../../middlewares/auth.middleware";
import { lcDashboard, lcTasks, lcCheckout, lcEditComplaint } from "../../controllers/role/lc.controller";
import { markAttendance, getMyCalendar } from "../../controllers/attendance.controller";

const router = Router();

// All LC routes require authentication
router.use(authenticateToken);

/**
 * GET /api/lc/dashboard
 * Single call — returns branch, tasks, complaints, appliances, today's attendance.
 */
router.get("/dashboard", lcDashboard);

/**
 * GET /api/lc/tasks
 * Tasks visible to this LC (their branch, assigned to them or audience=lc).
 */
router.get("/tasks", lcTasks);

/**
 * GET /api/lc/attendance/calendar?month=MM&year=YYYY
 * LC's personal attendance calendar + completed tasks (reuses existing controller).
 */
router.get("/attendance/calendar", getMyCalendar);

/**
 * POST /api/lc/attendance
 * Mark attendance + submit daily task plan (reuses existing controller).
 */
router.post("/attendance", markAttendance);

/**
 * PUT /api/lc/attendance/:id/checkout
 * Register check-out timestamp for today's attendance record.
 */
router.put("/attendance/:id/checkout", lcCheckout);

/**
 * PUT /api/lc/complaints/:id
 * Edit own complaint before vendor assignment.
 */
router.put("/complaints/:id", lcEditComplaint);

export default router;
