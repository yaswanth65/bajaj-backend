import { Router } from "express";
import { getDashboardMetrics } from "../controllers/dashboard.controller";
import { authenticateToken } from "../middlewares/auth.middleware";

const router = Router();

router.get("/metrics", authenticateToken, getDashboardMetrics);

export default router;
