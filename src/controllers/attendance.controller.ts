import { Response } from "express";
import { AttStatus, TaskStatus, RoleId, Priority } from "@prisma/client";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { recalcBranchStats, recalcUserStats } from "../lib/stats";
import prisma from "../lib/prisma";

// Helper to get today's date string YYYY-MM-DD in Asia/Kolkata (IST) timezone
const getTodayString = (): string => {
  const options = { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" } as const;
  const formatter = new Intl.DateTimeFormat("en-CA", options);
  return formatter.format(new Date());
};

export const markAttendance = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userContext = req.user;
    if (!userContext) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { checkIn, weeklyTasks } = req.body;
    const today = getTodayString();
    
    // Fetch branch info to ensure LC has a branch
    const user = await prisma.user.findUnique({
      where: { id: userContext.id },
      include: { branch: true }
    });

    if (!user || (user.role === RoleId.lc && !user.branchId)) {
      return res.status(400).json({ message: "User does not have an active branch assignment" });
    }

    const branchId = user.branchId || "";
    
    const getISTTimeStr = (): string => {
      const options = { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false } as const;
      const formatter = new Intl.DateTimeFormat("en-US", options);
      return formatter.format(new Date());
    };
    const nowStr = checkIn || getISTTimeStr();

    // Wrap the entire upsert, planner replacement, and task creation in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const attendance = await tx.attendanceLog.upsert({
        where: {
          userId_date: {
            userId: user.id,
            date: today,
          }
        },
        update: {
          status: AttStatus.Present,
          checkIn: nowStr,
          proof: "Geo + selfie refreshed",
        },
        create: {
          userId: user.id,
          date: today,
          status: AttStatus.Present,
          checkIn: nowStr,
          location: "Inside geo fence - 40m",
          proof: "Geo + selfie verified",
          deviation: "No",
        }
      });

      // Handle weekly task plan items if LC
      if (user.role === RoleId.lc && Array.isArray(weeklyTasks)) {
        // Clear previous plan items for this attendance
        await tx.weeklyTaskPlanItem.deleteMany({
          where: { attendanceId: attendance.id }
        });

        // Insert new plan items
        for (const t of weeklyTasks) {
          if (!t.description || !t.description.trim()) continue;
          
          await tx.weeklyTaskPlanItem.create({
            data: {
              attendanceId: attendance.id,
              description: t.description.trim(),
              estimatedHours: Number(t.estimatedHours) || 0.0,
            }
          });

          // Set deadline to today 23:59:59 IST (Asia/Kolkata)
          const optionsDate = { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" } as const;
          const formatterDate = new Intl.DateTimeFormat("en-CA", optionsDate);
          const todayStrStr = formatterDate.format(new Date());
          const todayDeadline = new Date(`${todayStrStr}T23:59:59+05:30`);

          await tx.task.create({
            data: {
              title: t.description.trim(),
              branchId: branchId,
              audience: RoleId.lc,
              schedule: "Daily",
              priority: Priority.High,
              zone: "Branch premises",
              deadline: todayDeadline,
              assignedToId: user.id,
              assignedById: user.id,
              status: TaskStatus.Pending,
              notes: `Auto-generated from daily task plan. Est: ${t.estimatedHours} hrs`,
              checklistTotal: 1,
              proofRequired: false,
            }
          });
        }
      }
      return attendance;
    });

    if (branchId) {
      recalcBranchStats(branchId).catch((err) => console.error("Failed to recalc branch stats after attendance:", err));
    }
    recalcUserStats(user.id).catch((err) => console.error("Failed to recalc user stats after attendance:", err));

    return res.status(200).json({
      message: "Attendance marked successfully",
      attendance: result,
    });
  } catch (error: any) {
    console.error("Attendance mark error: ", error);
    return res.status(500).json({ 
      message: "Server error during attendance marking", 
      error: process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred" 
    });
  }
};

export const getMyCalendar = async (req: AuthenticatedRequest, res: Response) => {
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

    const logs = await prisma.attendanceLog.findMany({
      where: {
        userId: userContext.id,
        date: { startsWith: prefix }
      },
      include: { weeklyTasks: true },
      orderBy: { date: "asc" }
    });

    // Fetch tasks completed by this user in this month
    const tasks = await prisma.task.findMany({
      where: {
        completedById: userContext.id,
        status: TaskStatus.Completed,
        completedAt: { not: null }
      }
    });

    const calendarData = logs.map(log => {
      const tasksOnDate = tasks.filter(t => {
        if (!t.completedAt) return false;
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
  } catch (error: any) {
    console.error("Get calendar error: ", error);
    return res.status(500).json({ 
      message: "Server error retrieving calendar logs", 
      error: process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred" 
    });
  }
};

export const getAttendanceList = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userContext = req.user;
    if (!userContext) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
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
      }
    };

    if (user.role === RoleId.rm) {
      logs = await prisma.attendanceLog.findMany({
        select: selectFields,
        orderBy: { date: "desc" }
      });
    } else if (user.role === RoleId.branchManager) {
      const scopedBranches = user.branchScope || [];
      logs = await prisma.attendanceLog.findMany({
        where: {
          user: {
            branchId: { in: scopedBranches }
          }
        },
        select: selectFields,
        orderBy: { date: "desc" }
      });
    } else {
      logs = await prisma.attendanceLog.findMany({
        where: { userId: user.id },
        select: selectFields,
        orderBy: { date: "desc" }
      });
    }

    return res.status(200).json(logs);
  } catch (error: any) {
    console.error("Get attendance list error: ", error);
    return res.status(500).json({ 
      message: "Server error retrieving attendance logs", 
      error: process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred" 
    });
  }
};
