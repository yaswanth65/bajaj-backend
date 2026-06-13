import { Request, Response, NextFunction } from "express";

export const authenticateCron = (req: Request, res: Response, next: NextFunction) => {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return res.status(500).json({ 
      message: "Cron secret is not configured on the server" 
    });
  }

  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  const querySecret = req.query.secret;

  if (token === cronSecret || querySecret === cronSecret) {
    return next();
  }

  return res.status(401).json({ 
    message: "Unauthorized: Invalid cron secret key" 
  });
};
