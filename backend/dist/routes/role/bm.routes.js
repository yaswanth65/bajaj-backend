"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const bm_controller_1 = require("../../controllers/role/bm.controller");
const router = (0, express_1.Router)();
// All BM routes require authentication
router.use(auth_middleware_1.authenticateToken);
/** GET /api/bm/dashboard — branches + approvals + visits + notifications */
router.get("/dashboard", bm_controller_1.bmDashboard);
/** GET /api/bm/attendance — scoped attendance roster + staff users + today's tasks */
router.get("/attendance", bm_controller_1.bmAttendance);
/** GET /api/bm/tasks — tasks for branches in BM scope */
router.get("/tasks", bm_controller_1.bmTasks);
/** PUT /api/bm/tasks/:id — edit task details (title, notes, deadline, priority, assignee) */
router.put("/tasks/:id", bm_controller_1.bmEditTask);
/** PATCH /api/bm/tasks/:id/archive — soft-archive a task (sets status to Revoked) */
router.patch("/tasks/:id/archive", bm_controller_1.bmArchiveTask);
/** GET /api/bm/approvals — approvals for branches in BM scope */
router.get("/approvals", bm_controller_1.bmApprovals);
/** GET /api/bm/branches — scoped branches + appliances + users */
router.get("/branches", bm_controller_1.bmBranches);
/** GET /api/bm/complaints — complaints for branches in BM scope */
router.get("/complaints", bm_controller_1.bmComplaints);
/** POST /api/bm/complaints/:id/reject — reject complaint (soft: Resolved + timeline note) */
router.post("/complaints/:id/reject", bm_controller_1.bmRejectComplaint);
/** GET /api/bm/visits — visits for branches in BM scope */
router.get("/visits", bm_controller_1.bmVisits);
/** PUT /api/bm/visits/:id — reschedule a visit (update date, purpose, agenda) */
router.put("/visits/:id", bm_controller_1.bmEditVisit);
/** PATCH /api/bm/visits/:id/cancel — soft-cancel a visit (Completed + cancellation note in report) */
router.patch("/visits/:id/cancel", bm_controller_1.bmCancelVisit);
exports.default = router;
