import prisma from "./lib/prisma";
import { RoleId } from "@prisma/client";

async function main() {
  const bmUser = await prisma.user.findUnique({
    where: { email: "ishwarrajput@gmail.com" }
  });
  if (!bmUser) {
    console.log("BM not found");
    return;
  }

  console.log("BM found:", bmUser.name, "Scope:", bmUser.branchScope);

  const filters: any = {
    branchId: { in: bmUser.branchScope }
  };

  const tasks = await prisma.task.findMany({
    where: filters,
    include: {
      assignedTo: { select: { id: true, name: true, role: true } }
    }
  });

  console.log(`Total tasks found for BM scope: ${tasks.length}`);
  const weeklyTasks = tasks.filter(t => t.schedule === "Weekly");
  console.log(`Weekly tasks: ${weeklyTasks.length}`);
  if (weeklyTasks.length > 0) {
    console.log("Sample weekly task:", weeklyTasks[0]);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
