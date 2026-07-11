"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const task_controller_1 = require("../controllers/task.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // limit 5MB
});
// NOTE: GET /api/tasks (generic list) has been REMOVED.
// Use role-specific endpoints instead:
//   LC  → GET /api/lc/tasks
//   BM  → GET /api/bm/tasks
//   RM  → GET /api/rm/tasks
// POST /api/tasks — Create a task (all roles with scope)
router.post("/", auth_middleware_1.authenticateToken, task_controller_1.createTask);
// POST /api/tasks/:id/complete — Mark task complete
router.post("/:id/complete", auth_middleware_1.authenticateToken, task_controller_1.markComplete);
// POST /api/tasks/:id/submit-proof — Upload proof image
router.post("/:id/submit-proof", auth_middleware_1.authenticateToken, upload.single("image"), task_controller_1.submitProof);
// POST /api/tasks/:id/revoke — Revoke/re-open a task (BM/RM only)
router.post("/:id/revoke", auth_middleware_1.authenticateToken, task_controller_1.revokeTask);
exports.default = router;
