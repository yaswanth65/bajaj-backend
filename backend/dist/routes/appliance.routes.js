"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const appliance_controller_1 = require("../controllers/appliance.controller");
const appliance_controller_2 = require("../controllers/role/appliance.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
});
router.get("/", auth_middleware_1.authenticateToken, appliance_controller_1.getAppliances);
router.post("/", auth_middleware_1.authenticateToken, upload.single("image"), appliance_controller_1.createAppliance);
router.put("/:id", auth_middleware_1.authenticateToken, upload.single("image"), appliance_controller_1.updateAppliance);
router.delete("/:id", auth_middleware_1.authenticateToken, appliance_controller_1.deleteAppliance);
router.patch("/:id/decommission", auth_middleware_1.authenticateToken, appliance_controller_2.decommissionAppliance);
exports.default = router;
