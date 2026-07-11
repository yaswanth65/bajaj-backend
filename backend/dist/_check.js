"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("./lib/prisma"));
async function main() {
    const c = await prisma_1.default.appliance.count();
    console.log("Appliances:", c);
    const a = await prisma_1.default.appliance.findFirst();
    console.log("Sample imageUrl:", a?.imageUrl?.substring(0, 50) || "(empty)");
    await prisma_1.default.$disconnect();
}
main();
