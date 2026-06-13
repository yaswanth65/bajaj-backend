import * as bcrypt from "bcryptjs";
import * as fs from "fs";
import * as path from "path";
import prisma from "./lib/prisma";

interface BranchData { name: string; city: string; district: string; code: string; address: string }

interface AaGroup { name: string; branches: BranchData[] }

interface AmGroup { amName: string; amEmail: string; aas: AaGroup[] }

interface SeedData { groups: AmGroup[] }

async function main() {
  const raw = fs.readFileSync(path.join(__dirname, "../scripts/ap-seed-data.json"), "utf-8");
  const data: SeedData = JSON.parse(raw);

  console.log("Cleaning existing data...");
  await prisma.attendanceLog.deleteMany();
  await prisma.visit.deleteMany();
  await prisma.approval.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.task.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.appliance.deleteMany();
  await prisma.user.deleteMany();
  await prisma.branch.deleteMany();

  console.log("Creating RM...");
  const rmPw = await bcrypt.hash("ravi123", 10);
  const rm = await prisma.user.create({
    data: {
      name: "Ravi Nemalikanti",
      email: "ravi@gmail.com",
      password: rmPw,
      role: "rm",
      position: "Regional Manager",
      phone: "9876543210",
    },
  });

  const branchRecords: { id: string; name: string }[] = [];
  const usedCodes = new Set<string>();
  console.log("Creating 99 branches...");
  for (const group of data.groups) {
    for (const aa of group.aas) {
      for (const b of aa.branches) {
        let code = b.code || `BR-${b.name.replace(/\s+/g, "-").toUpperCase()}`;
        if (usedCodes.has(code)) code += `-${b.name.replace(/\s+/g, "")}`;
        usedCodes.add(code);
        const branch = await prisma.branch.create({
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
  const allAmIds: { id: string; name: string }[] = [];
  const allAaIds: { id: string; name: string }[] = [];

  for (const group of data.groups) {
    const amBranches: string[] = [];
    for (const aa of group.aas) {
      for (const b of aa.branches) {
        const bid = branchMap.get(b.name);
        if (bid) amBranches.push(bid);
      }
    }

    const amPw = await bcrypt.hash("am123", 10);
    const am = await prisma.user.create({
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
      const aaBranchIds: string[] = [];
      for (const b of aa.branches) {
        const bid = branchMap.get(b.name);
        if (bid) aaBranchIds.push(bid);
      }

      const aaPw = await bcrypt.hash("aa123", 10);
      const aaUser = await prisma.user.create({
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
        if (!bid) continue;

        const lcPw = await bcrypt.hash("lc123", 10);
        await prisma.user.create({
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
      await prisma.appliance.create({
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

  const totalUsers = await prisma.user.count();
  const totalBranches = await prisma.branch.count();
  const totalAppliances = await prisma.appliance.count();
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
  .finally(() => prisma.$disconnect());
