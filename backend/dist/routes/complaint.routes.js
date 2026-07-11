"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const complaint_controller_1 = require("../controllers/complaint.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // limit 10MB
});
// Dashboard stats (must be before /:id to avoid route conflict)
router.get("/dashboard/stats", auth_middleware_1.authenticateToken, complaint_controller_1.getComplaintDashboardStats);
// CRUD
router.get("/", auth_middleware_1.authenticateToken, complaint_controller_1.getComplaints);
router.get("/:id", auth_middleware_1.authenticateToken, complaint_controller_1.getComplaintDetail);
router.post("/", auth_middleware_1.authenticateToken, upload.array("images", 5), complaint_controller_1.createComplaint);
// Actions
router.patch("/:id/status", auth_middleware_1.authenticateToken, complaint_controller_1.updateComplaintStatus);
router.post("/:id/raise-to-vendor", auth_middleware_1.authenticateToken, complaint_controller_1.raiseToVendor);
router.post("/:id/close", auth_middleware_1.authenticateToken, complaint_controller_1.closeComplaint);
router.patch("/:id/resolve", auth_middleware_1.authenticateToken, complaint_controller_1.resolveComplaint);
router.post("/:id/request-update", auth_middleware_1.authenticateToken, complaint_controller_1.requestUpdate);
router.post("/:id/escalate", auth_middleware_1.authenticateToken, complaint_controller_1.escalateComplaint);
router.post("/:id/vendorRemarks", auth_middleware_1.authenticateToken, complaint_controller_1.addVendorRemark);
exports.default = router;
