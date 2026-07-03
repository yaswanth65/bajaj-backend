import { Router } from "express";
import multer from "multer";
import { getAppliances, createAppliance, updateAppliance, deleteAppliance } from "../controllers/appliance.controller";
import { decommissionAppliance } from "../controllers/role/appliance.controller";
import { authenticateToken } from "../middlewares/auth.middleware";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.get("/", authenticateToken, getAppliances);
router.post("/", authenticateToken, upload.single("image"), createAppliance);
router.put("/:id", authenticateToken, upload.single("image"), updateAppliance);
router.delete("/:id", authenticateToken, deleteAppliance);
router.patch("/:id/decommission", authenticateToken, decommissionAppliance);

export default router;
