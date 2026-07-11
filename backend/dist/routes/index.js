"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_routes_1 = __importDefault(require("./auth.routes"));
const attendance_routes_1 = __importDefault(require("./attendance.routes"));
const task_routes_1 = __importDefault(require("./task.routes"));
const cron_routes_1 = __importDefault(require("./cron.routes"));
const user_routes_1 = __importDefault(require("./user.routes"));
const branch_routes_1 = __importDefault(require("./branch.routes"));
const appliance_routes_1 = __importDefault(require("./appliance.routes"));
const complaint_routes_1 = __importDefault(require("./complaint.routes"));
const approval_routes_1 = __importDefault(require("./approval.routes"));
const visit_routes_1 = __importDefault(require("./visit.routes"));
const notification_routes_1 = __importDefault(require("./notification.routes"));
// Role-specific lean API routers (replaces old generic GET endpoints)
const lc_routes_1 = __importDefault(require("./role/lc.routes"));
const bm_routes_1 = __importDefault(require("./role/bm.routes"));
const rm_routes_1 = __importDefault(require("./role/rm.routes"));
const am_routes_1 = __importDefault(require("./role/am.routes"));
const router = (0, express_1.Router)();
// ── Auth ──────────────────────────────────────────────────────────────────────
router.use("/auth", auth_routes_1.default);
// ── Attendance: POST (mark) + GET my-calendar kept; generic GET removed ───────
router.use("/attendance", attendance_routes_1.default);
// ── Tasks: POST (create/complete/proof/revoke) kept; generic GET removed ──────
router.use("/tasks", task_routes_1.default);
// ── DEPRECATED: /dashboard/metrics replaced by /lc, /bm, /rm dashboard routes
// router.use("/dashboard", dashboardRoutes);
// ── Cron jobs (internal) ──────────────────────────────────────────────────────
router.use("/cron", cron_routes_1.default);
// ── Users: all CRUD routes kept ───────────────────────────────────────────────
router.use("/users", user_routes_1.default);
// ── Branches: all routes kept (used by branch detail screens) ─────────────────
router.use("/branches", branch_routes_1.default);
// ── Appliances: all routes kept ───────────────────────────────────────────────
router.use("/appliances", appliance_routes_1.default);
// ── Complaints: POST + action routes kept; generic GET may be legacy ──────────
router.use("/complaints", complaint_routes_1.default);
// ── Approvals: POST (create/approve/reject) kept; generic GET removed ─────────
router.use("/approvals", approval_routes_1.default);
// ── Visits: all routes kept ───────────────────────────────────────────────────
router.use("/visits", visit_routes_1.default);
// ── Notifications: all routes kept ───────────────────────────────────────────
router.use("/notifications", notification_routes_1.default);
// ── Role-specific lean endpoints (single-call, field-projected) ───────────────
router.use("/lc", lc_routes_1.default); // LC: /lc/dashboard, /lc/tasks, /lc/attendance/calendar
router.use("/bm", bm_routes_1.default); // BM: /bm/dashboard, /bm/attendance, /bm/tasks, /bm/approvals, /bm/branches, /bm/complaints, /bm/visits
router.use("/rm", rm_routes_1.default); // RM: /rm/dashboard, /rm/attendance, /rm/finance, /rm/users, /rm/analytics, /rm/tasks
router.use("/am", am_routes_1.default); // AM: /am/dashboard, /am/attendance, /am/finance, /am/users, /am/analytics, /am/tasks
exports.default = router;
