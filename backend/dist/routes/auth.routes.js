"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const security_middleware_1 = require("../middlewares/security.middleware");
const router = (0, express_1.Router)();
router.post("/login", security_middleware_1.rateLimitLogin, auth_controller_1.login);
router.post("/reset-password", security_middleware_1.rateLimitLogin, auth_controller_1.resetPassword);
exports.default = router;
