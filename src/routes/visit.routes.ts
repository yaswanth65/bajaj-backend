import { Router } from "express";
import { getVisits, createVisit, submitVisitReport } from "../controllers/visit.controller";
import { authenticateToken } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", authenticateToken, getVisits);
router.post("/", authenticateToken, createVisit);
router.post("/:id/report", authenticateToken, submitVisitReport);

export default router;
