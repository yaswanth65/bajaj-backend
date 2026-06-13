import prisma from "./lib/prisma";

async function main() {
  const completedTasks = await prisma.task.findMany({
    where: {
      status: "Completed",
      branch: { name: "Ambikapur" }
    },
    select: {
      id: true,
      title: true,
      proofUrl: true
    }
  });
  console.log("Completed tasks for Ambikapur:");
  console.log(completedTasks);
}

main().catch(console.error).finally(() => prisma.$disconnect());
