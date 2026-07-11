"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("./lib/prisma"));
async function main() {
    const comp = await prisma_1.default.complaint.findFirst({
        where: { complaintId: "CMP-20260707-0001" }
    });
    console.log("Complaint details in DB:", JSON.stringify(comp, null, 2));
}
main().catch(console.error).finally(() => prisma_1.default.$disconnect());
