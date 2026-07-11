import { Response } from "express";
import { RoleId } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import prisma from "../lib/prisma";

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  position: true,
  phone: true,
  shift: true,
  status: true,
  rating: true,
  attendancePct: true,
  tasksClosed: true,
  proofRate: true,
  escalations: true,
  managerId: true,
  branchId: true,
  branchScope: true,
  lastCheckIn: true,
  skills: true,
  deviceId: true,
  joinDate: true,
  salary: true,
};

export const getHierarchy = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user || user.role !== RoleId.rm) {
      return res.status(403).json({ message: "Forbidden: RM only" });
    }

    const [allUsers, allBranches] = await Promise.all([
      prisma.user.findMany({
        orderBy: { name: "asc" },
        select: { ...userSelect, managerId: true },
      }),
      prisma.branch.findMany({
        select: { id: true, name: true, city: true },
      }),
    ]);

    const branchMap = new Map(allBranches.map((b) => [b.id, b]));
    const userMap = new Map(allUsers.map((u) => [u.id, u]));

    // Build tree manually
    const rms = allUsers.filter((u) => u.role === RoleId.rm);
    const ams = allUsers.filter((u) => (u.role === RoleId.branchManager || u.role === RoleId.am));
    const aas = allUsers.filter((u) => u.role === RoleId.aa);
    const lcs = allUsers.filter((u) => u.role === RoleId.lc);

    const tree = rms.map((rm) => ({
      id: rm.id,
      name: rm.name,
      role: rm.role,
      position: rm.position,
      email: rm.email,
      phone: rm.phone,
      status: rm.status,
      children: ams
        .filter((am) => am.managerId === rm.id)
        .map((am) => ({
          id: am.id,
          name: am.name,
          role: am.role,
          position: am.position,
          email: am.email,
          phone: am.phone,
          status: am.status,
          branchCount: am.branchScope?.length || 0,
          branchScope: am.branchScope || [],
          children: aas
            .filter((aa) => aa.managerId === am.id)
            .map((aa) => ({
              id: aa.id,
              name: aa.name,
              role: aa.role,
              position: aa.position,
              email: aa.email,
              phone: aa.phone,
              status: aa.status,
              branchCount: aa.branchScope?.length || 0,
              branchScope: aa.branchScope || [],
              branches: (aa.branchScope || []).map((bId) => {
                const branch = branchMap.get(bId);
                const lc = lcs.find((l) => l.branchId === bId);
                return {
                  id: bId,
                  name: branch?.name || "Unknown",
                  city: branch?.city || "",
                  lc: lc ? { id: lc.id, name: lc.name, email: lc.email, phone: lc.phone, status: lc.status } : null,
                };
              }),
            })),
        })),
    }));

    return res.status(200).json(tree);
  } catch (error: any) {
    console.error("Get hierarchy error: ", error);
    return res.status(500).json({
      message: "Server error building hierarchy",
      error: process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred",
    });
  }
};

export const getAvailableBranches = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user || (user.role !== RoleId.rm && user.role !== RoleId.branchManager && user.role !== RoleId.am)) {
      return res.status(403).json({ message: "Forbidden: RM or AM only" });
    }
    // AM can only query their own branches
    if ((user.role === RoleId.branchManager || user.role === RoleId.am) && req.params.amId !== user.id) {
      return res.status(403).json({ message: "Forbidden: you can only view your own branches" });
    }

    const { amId } = req.params;

    const am = await prisma.user.findUnique({
      where: { id: amId },
      select: { branchScope: true, role: true },
    });

    if (!am || (am.role !== RoleId.branchManager && am.role !== RoleId.am)) {
      return res.status(404).json({ message: "AM not found" });
    }

    // Get all AA users under this AM with their branchScope
    const aas = await prisma.user.findMany({
      where: { managerId: amId, role: RoleId.aa },
      select: { id: true, name: true, branchScope: true },
    });

    const assignedBranchIds = new Set(aas.flatMap((aa) => aa.branchScope || []));

    const branches = await prisma.branch.findMany({
      where: { id: { in: am.branchScope || [] } },
      select: { id: true, name: true, city: true },
      orderBy: { name: "asc" },
    });

    const result = branches.map((b) => {
      const assignedAa = aas.find((aa) => (aa.branchScope || []).includes(b.id));
      return {
        ...b,
        assigned: assignedBranchIds.has(b.id),
        assignedTo: assignedAa ? { id: assignedAa.id, name: assignedAa.name } : null,
      };
    });

    return res.status(200).json(result);
  } catch (error: any) {
    console.error("Get available branches error: ", error);
    return res.status(500).json({
      message: "Server error fetching available branches",
      error: process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred",
    });
  }
};

export const getUnassignedBranches = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user || (user.role !== RoleId.rm && user.role !== RoleId.branchManager && user.role !== RoleId.am)) {
      return res.status(403).json({ message: "Forbidden: RM or AM only" });
    }

    // Find branches that have no LC assigned
    const lcBranchIds = await prisma.user.findMany({
      where: { role: RoleId.lc, branchId: { not: null } },
      select: { branchId: true },
    });

    const assignedBranchIds = new Set(lcBranchIds.map((l) => l.branchId));

    const scopeFilter = user.role === RoleId.branchManager
      ? { id: { in: user.branchScope || [], notIn: Array.from(assignedBranchIds).filter(Boolean) as string[] } }
      : { id: { notIn: Array.from(assignedBranchIds).filter(Boolean) as string[] } };

    const branches = await prisma.branch.findMany({
      where: scopeFilter,
      select: { id: true, name: true, city: true },
      orderBy: { name: "asc" },
    });

    return res.status(200).json(branches);
  } catch (error: any) {
    console.error("Get unassigned branches error: ", error);
    return res.status(500).json({
      message: "Server error fetching unassigned branches",
      error: process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred",
    });
  }
};

export const assignManager = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user || (user.role !== RoleId.rm && user.role !== RoleId.branchManager && user.role !== RoleId.am)) {
      return res.status(403).json({ message: "Forbidden: RM or AM only" });
    }

    const { id } = req.params;
    const { managerId } = req.body;

    if (!managerId) {
      return res.status(400).json({ message: "managerId is required" });
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      return res.status(404).json({ message: "User not found" });
    }

    // AM can only manage their own subordinates (or unassigned users)
    if ((user.role === RoleId.branchManager || user.role === RoleId.am) && target.managerId && target.managerId !== user.id) {
      return res.status(403).json({ message: "Forbidden: you can only manage your own subordinates" });
    }

    const manager = await prisma.user.findUnique({ where: { id: managerId } });
    if (!manager) {
      return res.status(404).json({ message: "Manager not found" });
    }

    // Validate hierarchy:
    // AM → RM, AA → AM, LC → AA
    if ((target.role === RoleId.branchManager || target.role === RoleId.am) && manager.role !== RoleId.rm) {
      return res.status(400).json({ message: "AM must report to an RM" });
    }
    if (target.role === RoleId.aa && (manager.role !== RoleId.branchManager && manager.role !== RoleId.am)) {
      return res.status(400).json({ message: "AA must report to an AM" });
    }
    if (target.role === RoleId.lc && manager.role !== RoleId.aa && (manager.role !== RoleId.branchManager && manager.role !== RoleId.am)) {
      return res.status(400).json({ message: "LC must report to an AA or AM" });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { managerId },
      select: userSelect,
    });

    return res.status(200).json({ message: "Manager assigned successfully", user: updated });
  } catch (error: any) {
    console.error("Assign manager error: ", error);
    return res.status(500).json({
      message: "Server error assigning manager",
      error: process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred",
    });
  }
};

export const assignBranches = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user || (user.role !== RoleId.rm && user.role !== RoleId.branchManager && user.role !== RoleId.am)) {
      return res.status(403).json({ message: "Forbidden: RM or AM only" });
    }

    const { id } = req.params;
    const { branchIds } = req.body;

    if (!Array.isArray(branchIds)) {
      return res.status(400).json({ message: "branchIds must be an array" });
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, managerId: true, branchScope: true },
    });

    if (!target) {
      return res.status(404).json({ message: "User not found" });
    }

    if (target.role !== RoleId.aa) {
      return res.status(400).json({ message: "Only AA users can be assigned branches" });
    }

    // AM can only manage their own AAs
    if ((user.role === RoleId.branchManager || user.role === RoleId.am) && target.managerId !== user.id) {
      return res.status(403).json({ message: "Forbidden: you can only assign branches to your own AAs" });
    }

    // Validate that all branches belong to the AA's parent AM
    if (target.managerId) {
      const am = await prisma.user.findUnique({
        where: { id: target.managerId },
        select: { branchScope: true },
      });

      if (am) {
        const amBranchSet = new Set(am.branchScope || []);
        const invalid = branchIds.filter((bId) => !amBranchSet.has(bId));
        if (invalid.length > 0) {
          return res.status(400).json({
            message: "Some branches do not belong to this AA's parent AM",
            invalidBranches: invalid,
          });
        }
      }
    }

    // Validate exclusive assignment: no branch assigned to ANOTHER AA
    const existingAAs = await prisma.user.findMany({
      where: {
        role: RoleId.aa,
        id: { not: id },
        branchScope: { hasSome: branchIds },
      },
      select: { id: true, name: true, branchScope: true },
    });

    if (existingAAs.length > 0) {
      const conflicts = existingAAs.flatMap((aa) =>
        (aa.branchScope || [])
          .filter((bId) => branchIds.includes(bId))
          .map((bId) => ({ branchId: bId, assignedTo: aa.name }))
      );
      return res.status(409).json({
        message: "Some branches are already assigned to another AA",
        conflicts,
      });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { branchScope: branchIds },
      select: userSelect,
    });

    return res.status(200).json({ message: "Branches assigned successfully", user: updated });
  } catch (error: any) {
    console.error("Assign branches error: ", error);
    return res.status(500).json({
      message: "Server error assigning branches",
      error: process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred",
    });
  }
};

export const assignBranch = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user || user.role !== RoleId.rm) {
      return res.status(403).json({ message: "Forbidden: RM only" });
    }

    const { id } = req.params;
    const { branchId } = req.body;

    if (!branchId) {
      return res.status(400).json({ message: "branchId is required" });
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, branchId: true },
    });

    if (!target) {
      return res.status(404).json({ message: "User not found" });
    }

    if (target.role !== RoleId.lc) {
      return res.status(400).json({ message: "Only LC users can be assigned a branch" });
    }

    // Check branch doesn't already have an LC
    const existingLc = await prisma.user.findFirst({
      where: { role: RoleId.lc, branchId, id: { not: id } },
      select: { id: true, name: true },
    });

    if (existingLc) {
      return res.status(409).json({
        message: "This branch already has an LC assigned",
        currentLc: existingLc,
      });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { branchId },
      select: userSelect,
    });

    return res.status(200).json({ message: "Branch assigned to LC successfully", user: updated });
  } catch (error: any) {
    console.error("Assign branch error: ", error);
    return res.status(500).json({
      message: "Server error assigning branch to LC",
      error: process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred",
    });
  }
};

export const getUsers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userContext = req.user;
    if (!userContext) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { branchId, role } = req.query;
    const filters: any = {};

    if (userContext.role === RoleId.lc) {
      // LCs can only see their own branch's users
      filters.branchId = userContext.branchId || "";
    } else if ((userContext.role === RoleId.branchManager || userContext.role === RoleId.am)) {
      // BMs see users in their scope
      if (branchId) {
        if (userContext.branchScope.includes(String(branchId))) {
          filters.branchId = String(branchId);
        } else {
          return res.status(403).json({ message: "Forbidden: branch out of scope" });
        }
      } else {
        filters.OR = [
          { branchId: { in: userContext.branchScope } },
          { managerId: userContext.id },
        ];
      }
    } else if (userContext.role === RoleId.rm) {
      if (branchId) {
        filters.branchId = String(branchId);
      }
    }

    if (role) {
      filters.role = role as RoleId;
    }

    const users = await prisma.user.findMany({
      where: filters,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        position: true,
        phone: true,
        shift: true,
        status: true,
        rating: true,
        attendancePct: true,
        tasksClosed: true,
        proofRate: true,
        escalations: true,
        managerId: true,
        branchId: true,
        branchScope: true,
        lastCheckIn: true,
        skills: true,
        deviceId: true,
        joinDate: true,
      }
    });

    return res.status(200).json(users);
  } catch (error: any) {
    console.error("Get users error: ", error);
    return res.status(500).json({
      message: "Server error listing users",
      error: process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred"
    });
  }
};

export const createUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userContext = req.user;
    if (!userContext) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Role-based creation guard
    if (userContext.role === RoleId.lc || userContext.role === RoleId.aa) {
      return res.status(403).json({ message: "Forbidden: You do not have permission to create users" });
    }
    // AM can only create AA or LC
    if ((userContext.role === RoleId.branchManager || userContext.role === RoleId.am)) {
      const { role: targetRole } = req.body;
      if (targetRole !== RoleId.aa && targetRole !== RoleId.lc) {
        return res.status(403).json({ message: "Forbidden: AM can only create AA or LC users" });
      }
    }

    const { name, role, position, email: reqEmail, branchId, phone, shift, skills } = req.body;
    if (!name || !role || !position) {
      return res.status(400).json({ message: "Name, role, and position are required" });
    }

    if (skills !== undefined && !Array.isArray(skills)) {
      return res.status(400).json({ message: "Skills must be a valid array of strings" });
    }

    // Default password hash
    const passwordHash = await bcrypt.hash("123456789", 10);
    const email = reqEmail || name.toLowerCase().replace(/\s+/g, "") + "@gmail.com";

    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: passwordHash,
          role: role as RoleId,
          position,
          branchId: branchId || null,
          phone: phone || "Pending",
          shift: shift || "09:00 - 18:00",
          skills: skills || [],
          managerId: userContext.id,
        }
      });

      // Update branch staff counts
      if (branchId) {
        await tx.branch.update({
          where: { id: branchId },
          data: {
            staffCount: { increment: 1 },
            workerCount: { increment: 1 },
          }
        });
      }

      return user;
    });

    return res.status(201).json({
      message: "User created successfully",
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        position: newUser.position,
      }
    });
  } catch (error: any) {
    console.error("Create user error: ", error);
    return res.status(500).json({
      message: "Server error creating user",
      error: process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred"
    });
  }
};

export const updateUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userContext = req.user;
    if (!userContext) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const { name, phone, email, shift, skills, emergencyContact, expoPushToken, status } = req.body;

    if (skills !== undefined && !Array.isArray(skills)) {
      return res.status(400).json({ message: "Skills must be a valid array of strings" });
    }

    // Check permissions: users can edit themselves; BAMs/RMs can edit their subordinates
    if (userContext.role === RoleId.lc && userContext.id !== id) {
      return res.status(403).json({ message: "Forbidden: You cannot modify other users" });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        name: name || undefined,
        phone: phone || undefined,
        email: email || undefined,
        shift: shift || undefined,
        skills: skills || undefined,
        emergencyContact: emergencyContact || undefined,
        expoPushToken: expoPushToken !== undefined ? expoPushToken : undefined,
        status: status || undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        position: true,
        phone: true,
        shift: true,
        status: true,
        emergencyContact: true,
        skills: true,
        documents: true,
        expoPushToken: true,
      }
    });

    return res.status(200).json({
      message: "Profile updated successfully",
      user: updatedUser
    });
  } catch (error: any) {
    console.error("Update user error: ", error);
    return res.status(500).json({
      message: "Server error updating profile",
      error: process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred"
    });
  }
};

export const deleteUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userContext = req.user;
    if (!userContext || userContext.role !== RoleId.rm) {
      return res.status(403).json({ message: "Forbidden: Only Regional Managers can deactivate users" });
    }

    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.status === "Inactive") {
      return res.status(409).json({ message: "User is already deactivated" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          status: "Inactive",
          // Clear branchScope so branches become available for reassignment
          branchScope: user.role === RoleId.aa ? [] : undefined,
        },
      });

      // Decrement branch staff counts
      if (user.branchId) {
        await tx.branch.update({
          where: { id: user.branchId },
          data: {
            staffCount: { decrement: 1 },
            workerCount: { decrement: 1 },
          }
        });
      }
    });

    return res.status(200).json({ message: "User deactivated successfully" });
  } catch (error: any) {
    console.error("Delete user error: ", error);
    return res.status(500).json({
      message: "Server error deactivating user",
      error: process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred"
    });
  }
};
