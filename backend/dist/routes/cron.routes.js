"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const cron_controller_1 = require("../controllers/cron.controller");
const cron_middleware_1 = require("../middlewares/cron.middleware");
const router = (0, express_1.Router)();
router.post("/generate-appliance-tasks", cron_middleware_1.authenticateCron, cron_controller_1.generateWeeklyApplianceTasks);
exports.default = router;
