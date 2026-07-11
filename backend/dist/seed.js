"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcrypt = __importStar(require("bcryptjs"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const prisma_1 = __importDefault(require("./lib/prisma"));
async function main() {
    const raw = fs.readFileSync(path.join(__dirname, "../scripts/ap-seed-data.json"), "utf-8");
    const data = JSON.parse(raw);
    console.log("Cleaning existing data...");
    await prisma_1.default.attendanceLog.deleteMany();
    await prisma_1.default.visit.deleteMany();
    await prisma_1.default.approval.deleteMany();
    await prisma_1.default.complaint.deleteMany();
    await prisma_1.default.check.deleteMany();
    await prisma_1.default.notification.deleteMany();
    await prisma_1.default.appliance.deleteMany();
    await prisma_1.default.user.deleteMany();
    await prisma_1.default.branch.deleteMany();
    console.log("Creating RM...");
    const rmPw = await bcrypt.hash("ravi123", 10);
    const rm = await prisma_1.default.user.create({
        data: {
            name: "Ravi Nemalikanti",
            email: "ravi@gmail.com",
            password: rmPw,
            role: "rm",
            position: "Regional Manager",
            phone: "9876543210",
        },
    });
    const branchRecords = [];
    const usedCodes = new Set();
    console.log("Creating 99 branches...");
    for (const group of data.groups) {
        for (const aa of group.aas) {
            for (const b of aa.branches) {
                let code = b.code || `BR-${b.name.replace(/\s+/g, "-").toUpperCase()}`;
                if (usedCodes.has(code))
                    code += `-${b.name.replace(/\s+/g, "")}`;
                usedCodes.add(code);
                const branch = await prisma_1.default.branch.create({
                    data: {
                        code,
                        name: b.name,
                        city: b.city,
                        address: b.address || `${b.name}, ${b.city}, Andhra Pradesh`,
                    },
                });
                branchRecords.push({ id: branch.id, name: branch.name });
            }
        }
    }
    const branchMap = new Map(branchRecords.map((b) => [b.name, b.id]));
    console.log("Creating AMs, AAs, LCs...");
    const allAmIds = [];
    const allAaIds = [];
    for (const group of data.groups) {
        const amBranches = [];
        for (const aa of group.aas) {
            for (const b of aa.branches) {
                const bid = branchMap.get(b.name);
                if (bid)
                    amBranches.push(bid);
            }
        }
        const amPw = await bcrypt.hash("am123", 10);
        const am = await prisma_1.default.user.create({
            data: {
                name: group.amName,
                email: group.amEmail,
                password: amPw,
                role: "branchManager",
                position: "Branch Admin Manager",
                phone: "9000000000",
                managerId: rm.id,
                branchScope: amBranches,
            },
        });
        allAmIds.push({ id: am.id, name: am.name });
        console.log(`  AM: ${group.amName} (${amBranches.length} branches)`);
        for (const aa of group.aas) {
            const aaBranchIds = [];
            for (const b of aa.branches) {
                const bid = branchMap.get(b.name);
                if (bid)
                    aaBranchIds.push(bid);
            }
            const aaPw = await bcrypt.hash("aa123", 10);
            const aaUser = await prisma_1.default.user.create({
                data: {
                    name: aa.name,
                    email: aa.name.toLowerCase().replace(/\s+/g, ".") + "@gmail.com",
                    password: aaPw,
                    role: "aa",
                    position: "Admin Assistant",
                    phone: "9100000000",
                    managerId: am.id,
                    branchScope: aaBranchIds,
                },
            });
            allAaIds.push({ id: aaUser.id, name: aaUser.name });
            console.log(`    AA: ${aa.name} (${aaBranchIds.length} branches)`);
            for (const b of aa.branches) {
                const bid = branchMap.get(b.name);
                if (!bid)
                    continue;
                const lcPw = await bcrypt.hash("lc123", 10);
                await prisma_1.default.user.create({
                    data: {
                        name: `LC ${b.name}`,
                        email: `lc.${b.name.toLowerCase().replace(/\s+/g, ".")}@gmail.com`,
                        password: lcPw,
                        role: "lc",
                        position: "Local Coordinator",
                        phone: "9200000000",
                        managerId: aaUser.id,
                        branchId: bid,
                    },
                });
            }
        }
    }
    console.log("Creating appliances...");
    const categories = ["AC", "UPS", "Inverter"];
    const brands = ["Daikin", "APC", "Microtek"];
    let serialCounter = 1;
    for (const b of branchRecords) {
        for (const cat of categories) {
            await prisma_1.default.appliance.create({
                data: {
                    branchId: b.id,
                    name: `${cat} - ${b.name}`,
                    category: cat,
                    brand: brands[categories.indexOf(cat)],
                    serial: `APL-${String(serialCounter).padStart(5, "0")}`,
                    zone: "Branch premises",
                    status: "Operational",
                    healthScore: 85 + Math.floor(Math.random() * 16),
                },
            });
            serialCounter++;
        }
    }
    const totalUsers = await prisma_1.default.user.count();
    const totalBranches = await prisma_1.default.branch.count();
    const totalAppliances = await prisma_1.default.appliance.count();
    console.log("\nSeed complete:");
    console.log(`  Users: ${totalUsers} (1 RM + 3 AM + 10 AA + 99 LC = 113)`);
    console.log(`  Branches: ${totalBranches}`);
    console.log(`  Appliances: ${totalAppliances} (${categories.length} per branch)`);
}
main()
    .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
})
    .finally(() => prisma_1.default.$disconnect());
