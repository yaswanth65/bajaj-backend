import { Router } from "express";
import { getAppliances, createAppliance, updateAppliance, deleteAppliance } from "../controllers/appliance.controller";
import { decommissionAppliance } from "../controllers/role/appliance.controller";
import { authenticateToken } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", authenticateToken, getAppliances);
router.post("/", authenticateToken, createAppliance);
router.put("/:id", authenticateToken, updateAppliance);
router.delete("/:id", authenticateToken, deleteAppliance);
router.patch("/:id/decommission", authenticateToken, decommissionAppliance);

export default router;
