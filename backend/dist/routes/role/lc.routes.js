"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const lc_controller_1 = require("../../controllers/role/lc.controller");
const attendance_controller_1 = require("../../controllers/attendance.controller");
const router = (0, express_1.Router)();
// All LC routes require authentication
router.use(auth_middleware_1.authenticateToken);
/**
 * GET /api/lc/dashboard
 * Single call — returns branch, tasks, complaints, appliances, today's attendance.
 */
router.get("/dashboard", lc_controller_1.lcDashboard);
/**
 * GET /api/lc/tasks
 * Tasks visible to this LC (their branch, assigned to them or audience=lc).
 */
router.get("/tasks", lc_controller_1.lcTasks);
/**
 * GET /api/lc/attendance/calendar?month=MM&year=YYYY
 * LC's personal attendance calendar + completed tasks (reuses existing controller).
 */
router.get("/attendance/calendar", attendance_controller_1.getMyCalendar);
/**
 * POST /api/lc/attendance
 * Mark attendance + submit weekly check plan (reuses existing controller).
 */
router.post("/attendance", attendance_controller_1.markAttendance);
/**
 * PUT /api/lc/attendance/:id/checkout
 * Register check-out timestamp for today's attendance record.
 */
router.put("/attendance/:id/checkout", lc_controller_1.lcCheckout);
/**
 * PUT /api/lc/complaints/:id
 * Edit own complaint before vendor assignment.
 */
router.put("/complaints/:id", lc_controller_1.lcEditComplaint);
exports.default = router;
