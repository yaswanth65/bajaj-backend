import { Router } from "express";
import { generateWeeklyApplianceTasks } from "../controllers/cron.controller";
import { authenticateCron } from "../middlewares/cron.middleware";

const router = Router();

router.post("/generate-appliance-tasks", authenticateCron, generateWeeklyApplianceTasks);

export default router;
