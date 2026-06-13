import { Router } from "express";
import { getBranches, getBranchById, updateBranch } from "../controllers/branch.controller";
import { authenticateToken } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", authenticateToken, getBranches);
router.get("/:id", authenticateToken, getBranchById);
router.put("/:id", authenticateToken, updateBranch);

export default router;
