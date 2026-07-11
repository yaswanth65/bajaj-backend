"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAttendanceList = exports.getMyCalendar = exports.markAttendance = void 0;
const client_1 = require("@prisma/client");
const stats_1 = require("../lib/stats");
const prisma_1 = __importDefault(require("../lib/prisma"));
// Helper to get today's date string YYYY-MM-DD in Asia/Kolkata (IST) timezone
const getTodayString = () => {
    const options = { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" };
    const formatter = new Intl.DateTimeFormat("en-CA", options);
    return formatter.format(new Date());
};
const markAttendance = async (req, res) => {
    try {
        const userContext = req.user;
        if (!userContext) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const { checkIn, weeklyTasks, isBranchOpening, remarks, photos } = req.body;
        const today = getTodayString();
        // Fetch branch info to ensure LC has a branch
        const user = await prisma_1.default.user.findUnique({
            where: { id: userContext.id },
            include: { branch: true }
        });
        if (!user || (user.role === client_1.RoleId.lc && !user.branchId)) {
            return res.status(400).json({ message: "User does not have an active branch assignment" });
        }
        const branchId = user.branchId || "";
        const getISTTimeStr = () => {
            const options = { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false };
            const formatter = new Intl.DateTimeFormat("en-US", options);
            return formatter.format(new Date());
        };
        const nowStr = checkIn || getISTTimeStr();
        // Wrap the entire upsert, planner replacement, and task creation in a transaction
        const result = await prisma_1.default.$transaction(async (tx) => {
            const attendance = await tx.attendanceLog.upsert({
                where: {
                    userId_date: {
                        userId: user.id,
                        date: today,
                    }
                },
                update: {
                    status: client_1.AttStatus.Present,
                    checkIn: nowStr,
                    proof: "Geo + selfie refreshed",
                    isBranchOpening: isBranchOpening === true,
                    remarks: remarks || "",
                    photos: photos || [],
                },
                create: {
                    userId: user.id,
                    date: today,
                    status: client_1.AttStatus.Present,
                    checkIn: nowStr,
                    location: "Inside geo fence - 40m",
                    proof: "Geo + selfie verified",
                    deviation: "No",
                    isBranchOpening: isBranchOpening === true,
                    remarks: remarks || "",
                    photos: photos || [],
                }
            });
            // Handle weekly check plan items if LC
            if (user.role === client_1.RoleId.lc && Array.isArray(weeklyTasks)) {
                // Clear previous plan items for this attendance
                await tx.weeklyTaskPlanItem.deleteMany({
                    where: { attendanceId: attendance.id }
                });
                // Insert new plan items
                for (const t of weeklyTasks) {
                    if (!t.description || !t.description.trim())
                        continue;
                    await tx.weeklyTaskPlanItem.create({
                        data: {
                            attendanceId: attendance.id,
                            description: t.description.trim(),
                            estimatedHours: Number(t.estimatedHours) || 0.0,
                        }
                    });
                    // Set deadline to today 23:59:59 IST (Asia/Kolkata)
                    const optionsDate = { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" };
                    const formatterDate = new Intl.DateTimeFormat("en-CA", optionsDate);
                    const todayStrStr = formatterDate.format(new Date());
                    const todayDeadline = new Date(`${todayStrStr}T23:59:59+05:30`);
                    await tx.check.create({
                        data: {
                            title: t.description.trim(),
                            branchId: branchId,
                            audience: client_1.RoleId.lc,
                            schedule: "Weekly",
                            priority: client_1.Priority.High,
                            zone: "Branch premises",
                            deadline: todayDeadline,
                            assignedToId: user.id,
                            assignedById: user.id,
                            status: client_1.TaskStatus.Pending,
                            notes: `Auto-generated from weekly check plan. Est: ${t.estimatedHours} hrs`,
                            checklistTotal: 1,
                            proofRequired: false,
                        }
                    });
                }
            }
            return attendance;
        });
        if (branchId) {
            (0, stats_1.recalcBranchStats)(branchId).catch((err) => console.error("Failed to recalc branch stats after attendance:", err));
        }
        (0, stats_1.recalcUserStats)(user.id).catch((err) => console.error("Failed to recalc user stats after attendance:", err));
        return res.status(200).json({
            message: "Attendance and weekly checks marked successfully",
            attendance: result,
        });
    }
    catch (error) {
        console.error("Attendance mark error: ", error);
        return res.status(500).json({
            message: "Server error during attendance marking",
            error: process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred"
        });
    }
};
exports.markAttendance = markAttendance;
const getMyCalendar = async (req, res) => {
    try {
        const userContext = req.user;
        if (!userContext) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const { month, year } = req.query; // Expecting MM and YYYY
        if (!month || !year) {
            return res.status(400).json({ message: "Month and year parameters are required" });
        }
        const prefix = `${year}-${String(month).padStart(2, "0")}`;
        const logs = await prisma_1.default.attendanceLog.findMany({
            where: {
                userId: userContext.id,
                date: { startsWith: prefix }
            },
            include: { weeklyTasks: true },
            orderBy: { date: "asc" }
        });
        // Fetch tasks completed by this user in this month
        const tasks = await prisma_1.default.check.findMany({
            where: {
                completedById: userContext.id,
                status: client_1.TaskStatus.Completed,
                completedAt: { not: null }
            }
        });
        const calendarData = logs.map(log => {
            const tasksOnDate = tasks.filter(t => {
                if (!t.completedAt)
                    return false;
                const compDate = t.completedAt.toISOString().slice(0, 10);
                return compDate === log.date;
            });
            return {
                date: log.date,
                status: log.status,
                checkIn: log.checkIn,
                checkOut: log.checkOut,
                location: log.location,
                proof: log.proof,
                deviation: log.deviation,
                weeklyTasks: log.weeklyTasks,
                completedTasks: tasksOnDate.map(t => ({
                    id: t.id,
                    title: t.title,
                    zone: t.zone,
                }))
            };
        });
        return res.status(200).json(calendarData);
    }
    catch (error) {
        console.error("Get calendar error: ", error);
        return res.status(500).json({
            message: "Server error retrieving calendar logs",
            error: process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred"
        });
    }
};
exports.getMyCalendar = getMyCalendar;
const getAttendanceList = async (req, res) => {
    try {
        const userContext = req.user;
        if (!userContext) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const user = await prisma_1.default.user.findUnique({
            where: { id: userContext.id }
        });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        let logs;
        const selectFields = {
            id: true,
            userId: true,
            date: true,
            status: true,
            checkIn: true,
            checkOut: true,
            location: true,
            proof: true,
            deviation: true,
            weeklyTasks: {
                select: {
                    id: true,
                    description: true,
                    estimatedHours: true
                }
            },
            isBranchOpening: true,
            remarks: true,
            photos: true,
            user: {
                select: {
                    id: true,
                    name: true,
                    role: true,
                    position: true,
                    branch: { select: { id: true, name: true } }
                }
            }
        };
        if (user.role === client_1.RoleId.rm) {
            logs = await prisma_1.default.attendanceLog.findMany({
                select: selectFields,
                orderBy: { date: "desc" }
            });
        }
        else {
            logs = await prisma_1.default.attendanceLog.findMany({
                where: { userId: user.id },
                select: selectFields,
                orderBy: { date: "desc" }
            });
        }
        return res.status(200).json(logs);
    }
    catch (error) {
        console.error("Get attendance list error: ", error);
        return res.status(500).json({
            message: "Server error retrieving attendance logs",
            error: process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred"
        });
    }
};
exports.getAttendanceList = getAttendanceList;
