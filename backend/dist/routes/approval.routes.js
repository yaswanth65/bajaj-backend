"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const approval_controller_1 = require("../controllers/approval.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// NOTE: GET /api/approvals (generic list) has been REMOVED.
// Use role-specific endpoints instead:
//   BM → GET /api/bm/approvals
//   RM → GET /api/rm/finance   (includes branches + approvals)
// POST /api/approvals — Create an approval request (LC/BM)
router.post("/", auth_middleware_1.authenticateToken, approval_controller_1.createApproval);
// POST /api/approvals/:id/approve — Approve request (BM/RM)
router.post("/:id/approve", auth_middleware_1.authenticateToken, approval_controller_1.approveRequest);
// POST /api/approvals/:id/reject — Reject request (BM/RM)
router.post("/:id/reject", auth_middleware_1.authenticateToken, approval_controller_1.rejectRequest);
exports.default = router;
