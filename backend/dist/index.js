"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv = __importStar(require("dotenv"));
const node_cron_1 = __importDefault(require("node-cron"));
const routes_1 = __importDefault(require("./routes"));
const security_middleware_1 = require("./middlewares/security.middleware");
const prisma_1 = __importDefault(require("./lib/prisma"));
const generateWeeklyTasks_1 = require("./lib/generateWeeklyTasks");
dotenv.config();
// Assert JWT_SECRET is configured
if (!process.env.JWT_SECRET) {
    console.error("FATAL: JWT_SECRET environment variable is not defined!");
    process.exit(1);
}
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
app.use(security_middleware_1.securityHeaders);
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: "15mb" }));
// Main API routes
app.use("/api", routes_1.default);
// Health check endpoint
app.get("/health", async (req, res) => {
    try {
        await prisma_1.default.$queryRaw `SELECT 1`;
        res.status(200).json({
            status: "healthy",
            database: "connected",
            timestamp: new Date(),
        });
    }
    catch (error) {
        res.status(500).json({
            status: "unhealthy",
            database: "disconnected",
            timestamp: new Date(),
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
async function checkDatabaseConnection() {
    try {
        await prisma_1.default.$connect();
        console.log("Database connected successfully");
    }
    catch (error) {
        console.error("Database connection failed:", error);
        process.exit(1); // Stop server if DB is critical
    }
}
checkDatabaseConnection();
const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    // Run weekly appliance task generation on startup (catches missed weeks)
    (0, generateWeeklyTasks_1.generateWeeklyApplianceTasks)().catch((err) => console.error("Startup weekly task generation failed:", err));
    // Schedule weekly task generation every Monday at 1:00 AM IST
    node_cron_1.default.schedule("0 1 * * 1", () => {
        console.log("Running scheduled weekly appliance task generation...");
        (0, generateWeeklyTasks_1.generateWeeklyApplianceTasks)().catch((err) => console.error("Scheduled weekly task generation failed:", err));
    }, { timezone: "Asia/Kolkata" });
    console.log("Scheduled weekly appliance task generation: Monday 1:00 AM IST");
});
// Graceful shutdown
const gracefulShutdown = async (signal) => {
    console.log(`Received ${signal}. Starting graceful shutdown...`);
    server.close(async () => {
        console.log("Express server closed.");
        await prisma_1.default.$disconnect();
        console.log("Prisma client disconnected.");
        process.exit(0);
    });
    // Force exit after 10 seconds
    setTimeout(() => {
        console.error("Force shutting down due to timeout.");
        process.exit(1);
    }, 10000);
};
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
