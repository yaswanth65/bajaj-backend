import { Router } from "express";
import { createApproval, approveRequest, rejectRequest } from "../controllers/approval.controller";
import { authenticateToken } from "../middlewares/auth.middleware";

const router = Router();

// NOTE: GET /api/approvals (generic list) has been REMOVED.
// Use role-specific endpoints instead:
//   BM → GET /api/bm/approvals
//   RM → GET /api/rm/finance   (includes branches + approvals)

// POST /api/approvals — Create an approval request (LC/BM)
router.post("/", authenticateToken, createApproval);

// POST /api/approvals/:id/approve — Approve request (BM/RM)
router.post("/:id/approve", authenticateToken, approveRequest);

// POST /api/approvals/:id/reject — Reject request (BM/RM)
router.post("/:id/reject", authenticateToken, rejectRequest);

export default router;
