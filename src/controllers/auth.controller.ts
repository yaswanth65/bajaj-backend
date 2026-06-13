import { Request, Response } from "express";
import prisma from "../lib/prisma";
import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const secret = process.env.JWT_SECRET!;
    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        branchId: user.branchId,
        branchScope: user.branchScope,
      },
      secret,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        position: user.position,
        branchId: user.branchId,
        branchScope: user.branchScope,
        managerId: user.managerId,
        deviceId: user.deviceId,
        phone: user.phone,
        shift: user.shift,
        status: user.status,
      },
    });
  } catch (error: any) {
    console.error("Login error: ", error);
    return res.status(500).json({ 
      message: "Server error during login", 
      error: process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred" 
    });
  }
};
