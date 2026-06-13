import { Router } from "express";
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getHierarchy,
  assignManager,
  assignBranches,
  assignBranch,
  getAvailableBranches,
  getUnassignedBranches,
} from "../controllers/user.controller";
import { authenticateToken } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", authenticateToken, getUsers);
router.get("/hierarchy", authenticateToken, getHierarchy);
router.get("/available-branches/:amId", authenticateToken, getAvailableBranches);
router.get("/unassigned-branches", authenticateToken, getUnassignedBranches);
router.post("/", authenticateToken, createUser);
router.put("/:id", authenticateToken, updateUser);
router.put("/:id/assign-manager", authenticateToken, assignManager);
router.put("/:id/assign-branches", authenticateToken, assignBranches);
router.put("/:id/assign-branch", authenticateToken, assignBranch);
router.delete("/:id", authenticateToken, deleteUser);

export default router;
