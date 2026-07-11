"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAppliance = exports.updateAppliance = exports.createAppliance = exports.getAppliances = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../lib/prisma"));
const cloudinary_service_1 = require("../services/cloudinary.service");
const isPersistentImageUrl = (value) => {
    const url = typeof value === "string" ? value.trim() : "";
    return /^(https?:|data:image\/)/i.test(url) ? url : null;
};
const getAppliances = async (req, res) => {
    try {
        const userContext = req.user;
        if (!userContext) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const { branchId, category } = req.query;
        const filters = {};
        if (userContext.role === client_1.RoleId.lc) {
            filters.branchId = userContext.branchId || "";
        }
        else if (userContext.role === client_1.RoleId.branchManager || userContext.role === client_1.RoleId.aa) {
            if (branchId) {
                if (userContext.branchScope.includes(String(branchId))) {
                    filters.branchId = String(branchId);
                }
                else {
                    return res.status(403).json({ message: "Forbidden: branch out of scope" });
                }
            }
            else {
                filters.branchId = { in: userContext.branchScope };
            }
        }
        else if (userContext.role === client_1.RoleId.rm) {
            if (branchId) {
                filters.branchId = String(branchId);
            }
        }
        if (category) {
            filters.category = String(category);
        }
        const appliances = await prisma_1.default.appliance.findMany({
            where: filters,
            orderBy: { name: "asc" }
        });
        return res.status(200).json(appliances);
    }
    catch (error) {
        console.error("Get appliances error: ", error);
        return res.status(500).json({
            message: "Server error listing appliances",
            error: process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred"
        });
    }
};
exports.getAppliances = getAppliances;
const createAppliance = async (req, res) => {
    try {
        const userContext = req.user;
        if (!userContext) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const { name, category, zone, brand, model, serial, purchaseCost, amcVendor, purchaseDate, lastService, nextService, warranty, pendingParts, imageUrl } = req.body;
        if (!name || !category || !brand || !serial) {
            return res.status(400).json({ message: "Name, category, brand, and serial are required" });
        }
        // Verify serial uniqueness before creating
        const existingApp = await prisma_1.default.appliance.findUnique({ where: { serial } });
        if (existingApp) {
            return res.status(400).json({ message: "An appliance with this serial number is already registered" });
        }
        const file = req.file;
        let uploadedImageUrl = isPersistentImageUrl(imageUrl);
        if (file) {
            try {
                uploadedImageUrl = await (0, cloudinary_service_1.uploadImageToCloudinary)(file.buffer, "appliance_photos");
            }
            catch (uploadError) {
                console.error("Appliance image upload failed; continuing without image:", uploadError);
            }
        }
        if (purchaseCost !== undefined && purchaseCost !== null && purchaseCost !== "") {
            const numericCost = Number(purchaseCost);
            if (isNaN(numericCost) || numericCost < 0) {
                return res.status(400).json({ message: "Purchase cost must be a valid positive number" });
            }
        }
        // Resolve branch
        const branchId = userContext.role === client_1.RoleId.lc ? userContext.branchId : req.body.branchId;
        if (!branchId) {
            return res.status(400).json({ message: "Branch assignment is required" });
        }
        // Verify scope permissions
        if (userContext.role === client_1.RoleId.branchManager && !userContext.branchScope.includes(branchId)) {
            return res.status(403).json({ message: "Forbidden: branch out of scope" });
        }
        const parseDate = (d) => {
            if (d === null || d === undefined)
                return null;
            if (String(d).trim() === "")
                return undefined;
            const parsed = new Date(d);
            return isNaN(parsed.getTime()) ? undefined : parsed;
        };
        const result = await prisma_1.default.$transaction(async (tx) => {
            const newApp = await tx.appliance.create({
                data: {
                    branchId,
                    name,
                    category,
                    zone: zone || "Branch premises",
                    brand,
                    model: model || "Pending",
                    serial,
                    purchaseCost: purchaseCost !== undefined && purchaseCost !== null && purchaseCost !== "" ? Number(purchaseCost) : 0.0,
                    amcVendor: amcVendor || "To be assigned",
                    purchaseDate: parseDate(purchaseDate),
                    lastService: parseDate(lastService),
                    nextService: parseDate(nextService),
                    warranty: warranty || "Pending",
                    pendingParts: pendingParts || "None",
                    healthScore: 100,
                    status: client_1.ApplianceStatus.Operational,
                    approvalStatus: "Approved",
                    imageUrl: uploadedImageUrl,
                }
            });
            // Update branch applianceRisk counts
            const activeRisk = await tx.appliance.count({
                where: { branchId, status: { not: client_1.ApplianceStatus.Operational } }
            });
            await tx.branch.update({
                where: { id: branchId },
                data: { applianceRisk: activeRisk }
            });
            return newApp;
        });
        return res.status(201).json({
            message: "Appliance registered successfully",
            appliance: result
        });
    }
    catch (error) {
        console.error("Create appliance error: ", error);
        return res.status(500).json({
            message: "Server error registering appliance",
            error: process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred"
        });
    }
};
exports.createAppliance = createAppliance;
const updateAppliance = async (req, res) => {
    try {
        const userContext = req.user;
        if (!userContext) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const { id } = req.params;
        const { name, category, zone, brand, model, serial, healthScore, status, purchaseDate, lastService, nextService, warranty, amcVendor, purchaseCost, imageUrl } = req.body;
        const file = req.file;
        let uploadedImageUrl = imageUrl !== undefined ? isPersistentImageUrl(imageUrl) : undefined;
        if (file) {
            try {
                uploadedImageUrl = await (0, cloudinary_service_1.uploadImageToCloudinary)(file.buffer, "appliance_photos");
            }
            catch (uploadError) {
                console.error("Appliance image upload failed; continuing without image:", uploadError);
            }
        }
        const appliance = await prisma_1.default.appliance.findUnique({ where: { id } });
        if (!appliance) {
            return res.status(404).json({ message: "Appliance not found" });
        }
        if (userContext.role === client_1.RoleId.lc && userContext.branchId !== appliance.branchId) {
            return res.status(403).json({ message: "Forbidden: branch out of scope" });
        }
        if (userContext.role === client_1.RoleId.branchManager && !userContext.branchScope.includes(appliance.branchId)) {
            return res.status(403).json({ message: "Forbidden: branch out of scope" });
        }
        const parseDate = (d) => {
            if (d === null)
                return null;
            if (!d || String(d).trim() === "")
                return undefined;
            const parsed = new Date(d);
            return isNaN(parsed.getTime()) ? undefined : parsed;
        };
        const parseStatus = (s) => {
            if (!s)
                return undefined;
            const trimmed = String(s).trim();
            if (trimmed === "At Risk" || trimmed === "AtRisk") {
                return client_1.ApplianceStatus.AtRisk;
            }
            return trimmed;
        };
        const cost = purchaseCost !== undefined && purchaseCost !== "" ? Number(purchaseCost) : undefined;
        const score = healthScore !== undefined && healthScore !== "" ? Number(healthScore) : undefined;
        const result = await prisma_1.default.$transaction(async (tx) => {
            const updatedApp = await tx.appliance.update({
                where: { id },
                data: {
                    name: name || undefined,
                    category: category || undefined,
                    zone: zone || undefined,
                    brand: brand || undefined,
                    model: model || undefined,
                    serial: serial || undefined,
                    healthScore: score,
                    status: parseStatus(status),
                    purchaseDate: parseDate(purchaseDate),
                    lastService: parseDate(lastService),
                    nextService: parseDate(nextService),
                    warranty: warranty || undefined,
                    amcVendor: amcVendor || undefined,
                    purchaseCost: cost,
                    imageUrl: uploadedImageUrl,
                }
            });
            // Update branch applianceRisk counts
            const activeRisk = await tx.appliance.count({
                where: { branchId: appliance.branchId, status: { not: client_1.ApplianceStatus.Operational } }
            });
            await tx.branch.update({
                where: { id: appliance.branchId },
                data: { applianceRisk: activeRisk }
            });
            return updatedApp;
        });
        return res.status(200).json({
            message: "Appliance updated successfully",
            appliance: result
        });
    }
    catch (error) {
        console.error("Update appliance error: ", error);
        return res.status(500).json({
            message: "Server error updating appliance",
            error: process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred"
        });
    }
};
exports.updateAppliance = updateAppliance;
const deleteAppliance = async (req, res) => {
    try {
        const userContext = req.user;
        if (!userContext || userContext.role === client_1.RoleId.lc) {
            return res.status(403).json({ message: "Forbidden: LCs cannot decommission appliances" });
        }
        const { id } = req.params;
        const appliance = await prisma_1.default.appliance.findUnique({ where: { id } });
        if (!appliance) {
            return res.status(404).json({ message: "Appliance not found" });
        }
        if (userContext.role === client_1.RoleId.branchManager && !userContext.branchScope.includes(appliance.branchId)) {
            return res.status(403).json({ message: "Forbidden: branch out of scope" });
        }
        if (appliance.status === client_1.ApplianceStatus.Down) {
            return res.status(409).json({ message: "Appliance is already decommissioned" });
        }
        await prisma_1.default.$transaction(async (tx) => {
            await tx.appliance.update({
                where: { id },
                data: { status: client_1.ApplianceStatus.Down, healthScore: 0, pendingParts: "Decommissioned" }
            });
            // Update branch risk counts after decommission
            const activeRisk = await tx.appliance.count({
                where: { branchId: appliance.branchId, status: { not: client_1.ApplianceStatus.Operational } }
            });
            await tx.branch.update({
                where: { id: appliance.branchId },
                data: { applianceRisk: activeRisk }
            });
        });
        return res.status(200).json({ message: "Appliance decommissioned successfully" });
    }
    catch (error) {
        console.error("Delete appliance error: ", error);
        return res.status(500).json({
            message: "Server error decommissioning appliance",
            error: process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred"
        });
    }
};
exports.deleteAppliance = deleteAppliance;
