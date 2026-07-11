"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyRegionalManagers = exports.notifyBranchManagers = exports.sendPushNotification = void 0;
const expo_server_sdk_1 = require("expo-server-sdk");
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../lib/prisma"));
const expo = new expo_server_sdk_1.Expo();
const sendPushNotification = async (userIds, title, body, data = {}) => {
    try {
        const ids = Array.isArray(userIds) ? userIds : [userIds];
        // Fetch users to get their push tokens
        const users = await prisma_1.default.user.findMany({
            where: { id: { in: ids } },
            select: { id: true, name: true, expoPushToken: true }
        });
        const messages = [];
        for (const user of users) {
            if (!user.expoPushToken) {
                console.log(`Skipping push notification for user ${user.name} (ID: ${user.id}) - No push token registered.`);
                continue;
            }
            if (!expo_server_sdk_1.Expo.isExpoPushToken(user.expoPushToken)) {
                console.error(`Invalid Expo push token: ${user.expoPushToken} for user ${user.name}`);
                continue;
            }
            messages.push({
                to: user.expoPushToken,
                sound: "default",
                title: title,
                body: body,
                data: { ...data, userId: user.id },
            });
        }
        if (messages.length === 0) {
            return;
        }
        console.log(`Sending ${messages.length} push notification(s) through Expo...`);
        const chunks = expo.chunkPushNotifications(messages);
        const tickets = [];
        for (const chunk of chunks) {
            try {
                const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                console.log("Expo push ticket chunk returned successfully.");
                tickets.push(...ticketChunk);
            }
            catch (error) {
                console.error("Error sending push notifications chunk: ", error);
            }
        }
        return tickets;
    }
    catch (error) {
        console.error("Error in sendPushNotification service: ", error);
    }
};
exports.sendPushNotification = sendPushNotification;
// Helper to notify all coordinators/managers scoped to a branch
const notifyBranchManagers = async (branchId, title, body, data = {}) => {
    try {
        // Find all branch managers or admin assistants supervising this branch
        const managers = await prisma_1.default.user.findMany({
            where: {
                role: client_1.RoleId.branchManager,
                branchScope: { has: branchId }
            },
            select: { id: true }
        });
        const managerIds = managers.map(m => m.id);
        if (managerIds.length > 0) {
            await (0, exports.sendPushNotification)(managerIds, title, body, data);
        }
    }
    catch (error) {
        console.error("Error notifying branch managers: ", error);
    }
};
exports.notifyBranchManagers = notifyBranchManagers;
// Helper to notify the Regional Managers
const notifyRegionalManagers = async (title, body, data = {}) => {
    try {
        const rms = await prisma_1.default.user.findMany({
            where: { role: client_1.RoleId.rm },
            select: { id: true }
        });
        const rmIds = rms.map(r => r.id);
        if (rmIds.length > 0) {
            await (0, exports.sendPushNotification)(rmIds, title, body, data);
        }
    }
    catch (error) {
        console.error("Error notifying regional managers: ", error);
    }
};
exports.notifyRegionalManagers = notifyRegionalManagers;
