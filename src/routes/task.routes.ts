import { Router } from "express";
import multer from "multer";
import { markComplete, submitProof, createTask, revokeTask } from "../controllers/task.controller";
import { authenticateToken } from "../middlewares/auth.middleware";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // limit 5MB
});

// NOTE: GET /api/tasks (generic list) has been REMOVED.
// Use role-specific endpoints instead:
//   LC  → GET /api/lc/tasks
//   BM  → GET /api/bm/tasks
//   RM  → GET /api/rm/tasks

// POST /api/tasks — Create a task (all roles with scope)
router.post("/", authenticateToken, createTask);

// POST /api/tasks/:id/complete — Mark task complete
router.post("/:id/complete", authenticateToken, markComplete);

// POST /api/tasks/:id/submit-proof — Upload proof image
router.post("/:id/submit-proof", authenticateToken, upload.single("image"), submitProof);

// POST /api/tasks/:id/revoke — Revoke/re-open a task (BM/RM only)
router.post("/:id/revoke", authenticateToken, revokeTask);

export default router;
