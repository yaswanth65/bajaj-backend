import { Expo, ExpoPushMessage } from "expo-server-sdk";
import { RoleId } from "@prisma/client";
import prisma from "../lib/prisma";

const expo = new Expo();

export const sendPushNotification = async (
  userIds: string | string[],
  title: string,
  body: string,
  data: Record<string, any> = {}
) => {
  try {
    const ids = Array.isArray(userIds) ? userIds : [userIds];
    
    // Fetch users to get their push tokens
    const users = await prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, expoPushToken: true }
    });

    const messages: ExpoPushMessage[] = [];

    for (const user of users) {
      if (!user.expoPushToken) {
        console.log(`Skipping push notification for user ${user.name} (ID: ${user.id}) - No push token registered.`);
        continue;
      }

      if (!Expo.isExpoPushToken(user.expoPushToken)) {
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
      } catch (error) {
        console.error("Error sending push notifications chunk: ", error);
      }
    }

    return tickets;
  } catch (error) {
    console.error("Error in sendPushNotification service: ", error);
  }
};

// Helper to notify all coordinators/managers scoped to a branch
export const notifyBranchManagers = async (
  branchId: string,
  title: string,
  body: string,
  data: Record<string, any> = {}
) => {
  try {
    // Find all branch managers or admin assistants supervising this branch
    const managers = await prisma.user.findMany({
      where: {
        role: RoleId.branchManager,
        branchScope: { has: branchId }
      },
      select: { id: true }
    });

    const managerIds = managers.map(m => m.id);
    if (managerIds.length > 0) {
      await sendPushNotification(managerIds, title, body, data);
    }
  } catch (error) {
    console.error("Error notifying branch managers: ", error);
  }
};

// Helper to notify the Regional Managers
export const notifyRegionalManagers = async (
  title: string,
  body: string,
  data: Record<string, any> = {}
) => {
  try {
    const rms = await prisma.user.findMany({
      where: { role: RoleId.rm },
      select: { id: true }
    });

    const rmIds = rms.map(r => r.id);
    if (rmIds.length > 0) {
      await sendPushNotification(rmIds, title, body, data);
    }
  } catch (error) {
    console.error("Error notifying regional managers: ", error);
  }
};
