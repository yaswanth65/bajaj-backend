import { Router } from "express";
import { getComplaints, createComplaint, resolveComplaint, escalateComplaint, assignVendor, approveHighCost, deleteComplaint } from "../controllers/complaint.controller";
import { authenticateToken } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", authenticateToken, getComplaints);
router.post("/", authenticateToken, createComplaint);
router.post("/:id/resolve", authenticateToken, resolveComplaint);
router.post("/:id/escalate", authenticateToken, escalateComplaint);
router.post("/:id/assign-vendor", authenticateToken, assignVendor);
router.post("/:id/approve-high-cost", authenticateToken, approveHighCost);
router.delete("/:id", authenticateToken, deleteComplaint);

export default router;
