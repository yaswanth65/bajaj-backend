import { Router } from "express";
import { authenticateToken } from "../../middlewares/auth.middleware";
import {
  bmDashboard,
  bmAttendance,
  bmTasks,
  bmApprovals,
  bmBranches,
  bmComplaints,
  bmVisits,
  bmRejectComplaint,
  bmEditTask,
  bmArchiveTask,
  bmEditVisit,
  bmCancelVisit,
} from "../../controllers/role/bm.controller";

const router = Router();

// All BM routes require authentication
router.use(authenticateToken);

/** GET /api/bm/dashboard — branches + approvals + visits + notifications */
router.get("/dashboard", bmDashboard);

/** GET /api/bm/attendance — scoped attendance roster + staff users + today's tasks */
router.get("/attendance", bmAttendance);

/** GET /api/bm/tasks — tasks for branches in BM scope */
router.get("/tasks", bmTasks);

/** PUT /api/bm/tasks/:id — edit task details (title, notes, deadline, priority, assignee) */
router.put("/tasks/:id", bmEditTask);

/** PATCH /api/bm/tasks/:id/archive — soft-archive a task (sets status to Revoked) */
router.patch("/tasks/:id/archive", bmArchiveTask);

/** GET /api/bm/approvals — approvals for branches in BM scope */
router.get("/approvals", bmApprovals);

/** GET /api/bm/branches — scoped branches + appliances + users */
router.get("/branches", bmBranches);

/** GET /api/bm/complaints — complaints for branches in BM scope */
router.get("/complaints", bmComplaints);

/** POST /api/bm/complaints/:id/reject — reject complaint (soft: Resolved + timeline note) */
router.post("/complaints/:id/reject", bmRejectComplaint);

/** GET /api/bm/visits — visits for branches in BM scope */
router.get("/visits", bmVisits);

/** PUT /api/bm/visits/:id — reschedule a visit (update date, purpose, agenda) */
router.put("/visits/:id", bmEditVisit);

/** PATCH /api/bm/visits/:id/cancel — soft-cancel a visit (Completed + cancellation note in report) */
router.patch("/visits/:id/cancel", bmCancelVisit);

export default router;
