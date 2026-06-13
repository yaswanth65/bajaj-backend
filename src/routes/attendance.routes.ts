import { Router } from "express";
import { markAttendance, getMyCalendar } from "../controllers/attendance.controller";
import { authenticateToken } from "../middlewares/auth.middleware";

const router = Router();

// POST /api/attendance — LC marks daily attendance + task plan (still used by all roles)
router.post("/", authenticateToken, markAttendance);

// GET /api/attendance/my-calendar — LC personal calendar (legacy path, also exposed at /lc/attendance/calendar)
router.get("/my-calendar", authenticateToken, getMyCalendar);

// NOTE: GET /api/attendance (generic list) has been REMOVED.
// Use role-specific endpoints instead:
//   BM → GET /api/bm/attendance
//   RM → GET /api/rm/attendance
//   LC → GET /api/lc/attendance/calendar

export default router;
