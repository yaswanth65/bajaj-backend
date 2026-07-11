"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const am_controller_1 = require("../../controllers/role/am.controller");
const router = (0, express_1.Router)();
// All RM routes require authentication
router.use(auth_middleware_1.authenticateToken);
/** GET /api/am/dashboard — branches + complaints + approvals + notifications */
router.get("/dashboard", am_controller_1.amDashboard);
/** GET /api/am/attendance — all attendance + all users (RM scope) */
router.get("/attendance", am_controller_1.amAttendance);
/** GET /api/am/finance — approvals financial data + branch budget summary */
router.get("/finance", am_controller_1.amFinance);
/** GET /api/am/finance/export — download CSV of all approvals + branch budgets */
router.get("/finance/export", am_controller_1.amFinanceExport);
/** GET /api/am/users — all users + branches for user management screen */
router.get("/users", am_controller_1.amUsers);
/** PATCH /api/am/users/:id/status — lock or unlock a user account */
router.patch("/users/:id/status", am_controller_1.amUpdateUserStatus);
/** GET /api/am/analytics — per-branch KPI aggregates */
router.get("/analytics", am_controller_1.amAnalytics);
/** GET /api/am/tasks — all tasks (RM scope) with lean fields */
router.get("/tasks", am_controller_1.amTasks);
exports.default = router;
