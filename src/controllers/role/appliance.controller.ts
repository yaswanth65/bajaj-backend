import { Response } from "express";
import { RoleId, ApplianceStatus } from "@prisma/client";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import prisma from "../../lib/prisma";

/**
 * POST /api/appliances
 * Registers a new appliance at a branch.
 * Accessible by BM and RM roles (BM must have the branch in scope; RM is global).
 */
export const registerAppliance = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    if (user.role !== RoleId.branchManager && user.role !== RoleId.rm) {
      return res.status(403).json({ message: "Forbidden: BM or RM only" });
    }

    const {
      branchId,
      name,
      category,
      brand,
      zone,
      model,
      serial,
      amcVendor,
      purchaseCost,
      purchaseDate,
      nextService,
      warranty,
    } = req.body as {
      branchId: string;
      name: string;
      category: string;
      brand: string;
      zone?: string;
      model?: string;
      serial: string;
      amcVendor?: string;
      purchaseCost?: number;
      purchaseDate?: string;
      nextService?: string;
      warranty?: string;
    };

    // Required field validation
    if (!branchId || !name || !category || !brand || !serial) {
      return res.status(400).json({ message: "branchId, name, category, brand, and serial are required" });
    }

    // Scope check: BM can only register in their scoped branches; RM is unrestricted
    if (user.role === RoleId.branchManager) {
      const scopedBranchIds = user.branchScope || [];
      if (!scopedBranchIds.includes(branchId)) {
        return res.status(403).json({ message: "Branch is not within your scope" });
      }
    }

    // Ensure serial is unique
    const existing = await prisma.appliance.findUnique({ where: { serial }, select: { id: true } });
    if (existing) return res.status(409).json({ message: `An appliance with serial "${serial}" already exists` });

    const appliance = await prisma.appliance.create({
      data: {
        branchId,
        name,
        category,
        brand,
        serial,
        zone: zone ?? "Branch premises",
        model: model ?? "Pending",
        amcVendor: amcVendor ?? "To be assigned",
        purchaseCost: purchaseCost ?? 0,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
        nextService: nextService ? new Date(nextService) : undefined,
        warranty: warranty ?? "Pending",
        status: ApplianceStatus.Operational,
        healthScore: 100,
        approvalStatus: "Approved",
      },
      select: {
        id: true,
        name: true,
        category: true,
        brand: true,
        zone: true,
        status: true,
        healthScore: true,
        approvalStatus: true,
        branchId: true,
        amcVendor: true,
        nextService: true,
        pendingParts: true,
        serial: true,
        model: true,
        purchaseCost: true,
        warranty: true,
        createdAt: true,
      },
    });

    return res.status(201).json({ appliance });
  } catch (error: any) {
    console.error("Register appliance error:", error);
    return res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};

/**
 * PATCH /api/appliances/:id/decommission
 * Soft-retires an appliance by setting its status to "Down" (the closest available enum value).
 * Accessible by BM (scoped) and RM (global).
 */
export const decommissionAppliance = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    if (user.role !== RoleId.branchManager && user.role !== RoleId.rm) {
      return res.status(403).json({ message: "Forbidden: BM or RM only" });
    }

    const { id } = req.params;
    const { reason } = req.body as { reason?: string };

    const existing = await prisma.appliance.findUnique({
      where: { id },
      select: { id: true, branchId: true, status: true, name: true },
    });
    if (!existing) return res.status(404).json({ message: "Appliance not found" });

    // Scope check for BM
    if (user.role === RoleId.branchManager) {
      const scopedBranchIds = user.branchScope || [];
      if (!scopedBranchIds.includes(existing.branchId)) {
        return res.status(403).json({ message: "Appliance is not within your scope" });
      }
    }

    if (existing.status === ApplianceStatus.Down) {
      return res.status(409).json({ message: "Appliance is already decommissioned (Down)" });
    }

    const updated = await prisma.appliance.update({
      where: { id },
      data: {
        status: ApplianceStatus.Down,
        healthScore: 0,
        pendingParts: reason ? `Decommissioned: ${reason}` : "Decommissioned",
      },
      select: {
        id: true,
        name: true,
        category: true,
        brand: true,
        zone: true,
        status: true,
        healthScore: true,
        approvalStatus: true,
        branchId: true,
        amcVendor: true,
        nextService: true,
        pendingParts: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({ appliance: updated });
  } catch (error: any) {
    console.error("Decommission appliance error:", error);
    return res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};
