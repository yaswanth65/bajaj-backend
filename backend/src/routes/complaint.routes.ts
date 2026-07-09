import { Router } from "express";
import multer from "multer";
import {
  getComplaints,
  getComplaintDetail,
  createComplaint,
  updateComplaintStatus,
  raiseToVendor,
  closeComplaint,
  resolveComplaint,
  getComplaintDashboardStats,
  requestUpdate,
  escalateComplaint,
  addVendorRemark,
} from "../controllers/complaint.controller";
import { authenticateToken } from "../middlewares/auth.middleware";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // limit 10MB
});

// Dashboard stats (must be before /:id to avoid route conflict)
router.get("/dashboard/stats", authenticateToken, getComplaintDashboardStats);

// CRUD
router.get("/", authenticateToken, getComplaints);
router.get("/:id", authenticateToken, getComplaintDetail);
router.post("/", authenticateToken, upload.array("images", 5), createComplaint);

// Actions
router.patch("/:id/status", authenticateToken, updateComplaintStatus);
router.post("/:id/raise-to-vendor", authenticateToken, raiseToVendor);
router.post("/:id/close", authenticateToken, closeComplaint);
router.patch("/:id/resolve", authenticateToken, resolveComplaint);
router.post("/:id/request-update", authenticateToken, requestUpdate);
router.post("/:id/escalate", authenticateToken, escalateComplaint);
router.post("/:id/vendorRemarks", authenticateToken, addVendorRemark);

export default router;
