"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const attendance_controller_1 = require("../controllers/attendance.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// POST /api/attendance — LC marks attendance + weekly check plan (still used by all roles)
router.post("/", auth_middleware_1.authenticateToken, attendance_controller_1.markAttendance);
// GET /api/attendance/my-calendar — LC personal calendar (legacy path, also exposed at /lc/attendance/calendar)
router.get("/my-calendar", auth_middleware_1.authenticateToken, attendance_controller_1.getMyCalendar);
// NOTE: GET /api/attendance (generic list) has been REMOVED.
// Use role-specific endpoints instead:
//   BM → GET /api/bm/attendance
//   RM → GET /api/rm/attendance
//   LC → GET /api/lc/attendance/calendar
exports.default = router;
