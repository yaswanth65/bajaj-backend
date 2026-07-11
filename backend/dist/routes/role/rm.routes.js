"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const rm_controller_1 = require("../../controllers/role/rm.controller");
const router = (0, express_1.Router)();
// All RM routes require authentication
router.use(auth_middleware_1.authenticateToken);
/** GET /api/rm/dashboard — branches + complaints + approvals + notifications */
router.get("/dashboard", rm_controller_1.rmDashboard);
/** GET /api/rm/attendance — all attendance + all users (RM scope) */
router.get("/attendance", rm_controller_1.rmAttendance);
/** GET /api/rm/finance — approvals financial data + branch budget summary */
router.get("/finance", rm_controller_1.rmFinance);
/** GET /api/rm/finance/export — download CSV of all approvals + branch budgets */
router.get("/finance/export", rm_controller_1.rmFinanceExport);
/** GET /api/rm/users — all users + branches for user management screen */
router.get("/users", rm_controller_1.rmUsers);
/** PATCH /api/rm/users/:id/status — lock or unlock a user account */
router.patch("/users/:id/status", rm_controller_1.rmUpdateUserStatus);
/** GET /api/rm/analytics — per-branch KPI aggregates */
router.get("/analytics", rm_controller_1.rmAnalytics);
/** GET /api/rm/tasks — all tasks (RM scope) with lean fields */
router.get("/tasks", rm_controller_1.rmTasks);
/** GET /api/rm/operational-alerts — dynamic date-based exceptions */
router.get("/operational-alerts", rm_controller_1.rmOperationalAlerts);
exports.default = router;
