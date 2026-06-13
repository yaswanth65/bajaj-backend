import express from "express";
import cors from "cors";
import * as dotenv from "dotenv";
import cron from "node-cron";
import mainRouter from "./routes";
import { securityHeaders } from "./middlewares/security.middleware";
import prisma from "./lib/prisma";
import { generateWeeklyApplianceTasks } from "./lib/generateWeeklyTasks";

dotenv.config();

// Assert JWT_SECRET is configured
if (!process.env.JWT_SECRET) {
  console.error("FATAL: JWT_SECRET environment variable is not defined!");
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

app.use(securityHeaders);
app.use(cors());
app.use(express.json());

// Main API routes
app.use("/api", mainRouter);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy", timestamp: new Date() });
});

const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);

  // Run weekly appliance task generation on startup (catches missed weeks)
  generateWeeklyApplianceTasks().catch((err) =>
    console.error("Startup weekly task generation failed:", err)
  );

  // Schedule weekly task generation every Monday at 1:00 AM IST
  cron.schedule(
    "0 1 * * 1",
    () => {
      console.log("Running scheduled weekly appliance task generation...");
      generateWeeklyApplianceTasks().catch((err) =>
        console.error("Scheduled weekly task generation failed:", err)
      );
    },
    { timezone: "Asia/Kolkata" }
  );
  console.log("Scheduled weekly appliance task generation: Monday 1:00 AM IST");
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}. Starting graceful shutdown...`);
  server.close(async () => {
    console.log("Express server closed.");
    await prisma.$disconnect();
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
