import prisma from "./lib/prisma";

async function main() {
  const lcUser = await prisma.user.findUnique({
    where: { email: "shitaldevnath@gmail.com" }
  });
  if (!lcUser) {
    console.log("LC Shital Devnath not found");
    return;
  }
  console.log("LC User Details:");
  console.log({
    id: lcUser.id,
    name: lcUser.name,
    email: lcUser.email,
    role: lcUser.role,
    branchId: lcUser.branchId,
    managerId: lcUser.managerId
  });

  const branch = lcUser.branchId ? await prisma.branch.findUnique({
    where: { id: lcUser.branchId }
  }) : null;
  console.log("\nBranch Details:");
  console.log(branch);

  // Find all branch managers that have this branch in scope
  const bms = await prisma.user.findMany({
    where: {
      role: "branchManager"
    }
  });

  const bmsWithScope = bms.filter(bm => bm.branchScope.includes(lcUser.branchId || ""));
  console.log("\nBranch Managers with this branch in scope:");
  console.log(bmsWithScope.map(bm => ({
    id: bm.id,
    name: bm.name,
    email: bm.email,
    branchScope: bm.branchScope
  })));

  // Query all tasks for this branch
  const tasks = await prisma.task.findMany({
    where: { branchId: lcUser.branchId || "" },
    include: {
      assignedTo: { select: { name: true, role: true } }
    }
  });
  console.log(`\nFound ${tasks.length} tasks for branch:`);
  tasks.forEach(t => {
    console.log({
      id: t.id,
      title: t.title,
      schedule: t.schedule,
      status: t.status,
      assignedTo: t.assignedTo?.name,
      assignedToRole: t.assignedTo?.role,
      assignedById: t.assignedById
    });
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
