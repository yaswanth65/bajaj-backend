import { Request, Response } from "express";
import { generateWeeklyApplianceTasks as runGeneration } from "../lib/generateWeeklyTasks";

export const generateWeeklyApplianceTasks = async (req: Request, res: Response) => {
  try {
    const result = await runGeneration();
    return res.status(200).json({
      message: `Weekly appliance tasks generated successfully`,
      ...result,
    });
  } catch (error: any) {
    console.error("Weekly appliance task generator error: ", error);
    return res.status(500).json({ 
      message: "Server error generating weekly appliance tasks", 
      error: process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred" 
    });
  }
};
