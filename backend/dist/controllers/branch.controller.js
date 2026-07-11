"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateBranch = exports.getBranchById = exports.getBranches = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../lib/prisma"));
const getBranches = async (req, res) => {
    try {
        const userContext = req.user;
        if (!userContext) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const { role, branchId, branchScope = [] } = userContext;
        let filters = {};
        if (role === client_1.RoleId.lc) {
            filters.id = branchId || "";
        }
        else if (role === client_1.RoleId.branchManager) {
            filters.id = { in: branchScope };
        } // RM sees everything
        const branches = await prisma_1.default.branch.findMany({
            where: filters,
            orderBy: { name: "asc" }
        });
        return res.status(200).json(branches);
    }
    catch (error) {
        console.error("Get branches error: ", error);
        return res.status(500).json({
            message: "Server error listing branches",
            error: process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred"
        });
    }
};
exports.getBranches = getBranches;
const getBranchById = async (req, res) => {
    try {
        const userContext = req.user;
        if (!userContext) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const { id } = req.params;
        // Check scope limits
        if (userContext.role === client_1.RoleId.lc && userContext.branchId !== id) {
            return res.status(403).json({ message: "Forbidden: branch out of scope" });
        }
        if (userContext.role === client_1.RoleId.branchManager && !userContext.branchScope.includes(id)) {
            return res.status(403).json({ message: "Forbidden: branch out of scope" });
        }
        const branch = await prisma_1.default.branch.findUnique({
            where: { id },
            include: {
                users: {
                    select: { id: true, name: true, role: true, position: true, status: true, attendancePct: true, rating: true, tasksClosed: true, proofRate: true, lastCheckIn: true, shift: true, skills: true }
                },
                appliances: true
            }
        });
        if (!branch) {
            return res.status(404).json({ message: "Branch not found" });
        }
        return res.status(200).json(branch);
    }
    catch (error) {
        console.error("Get branch detail error: ", error);
        return res.status(500).json({
            message: "Server error retrieving branch details",
            error: process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred"
        });
    }
};
exports.getBranchById = getBranchById;
const updateBranch = async (req, res) => {
    try {
        const userContext = req.user;
        if (!userContext) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        if (userContext.role !== client_1.RoleId.rm) {
            return res.status(403).json({ message: "Forbidden: Only Regional Managers can update branch parameters" });
        }
        const { id } = req.params;
        const { monthlyBudget } = req.body;
        if (monthlyBudget !== undefined) {
            const budgetNum = parseFloat(monthlyBudget);
            if (isNaN(budgetNum) || budgetNum <= 0) {
                return res.status(400).json({ message: "Invalid budget: monthlyBudget must be a positive number" });
            }
            const updatedBranch = await prisma_1.default.branch.update({
                where: { id },
                data: { monthlyBudget: budgetNum }
            });
            return res.status(200).json(updatedBranch);
        }
        return res.status(400).json({ message: "No parameters provided to update" });
    }
    catch (error) {
        console.error("Update branch error: ", error);
        return res.status(500).json({
            message: "Server error updating branch parameters",
            error: process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred"
        });
    }
};
exports.updateBranch = updateBranch;
