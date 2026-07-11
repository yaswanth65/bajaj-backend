"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateWeeklyApplianceTasks = void 0;
const generateWeeklyTasks_1 = require("../lib/generateWeeklyTasks");
const generateWeeklyApplianceTasks = async (req, res) => {
    try {
        const result = await (0, generateWeeklyTasks_1.generateWeeklyApplianceTasks)();
        return res.status(200).json({
            message: `Weekly appliance tasks generated successfully`,
            ...result,
        });
    }
    catch (error) {
        console.error("Weekly appliance task generator error: ", error);
        return res.status(500).json({
            message: "Server error generating weekly appliance tasks",
            error: process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred"
        });
    }
};
exports.generateWeeklyApplianceTasks = generateWeeklyApplianceTasks;
