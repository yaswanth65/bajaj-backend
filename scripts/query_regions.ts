import prisma from "./lib/prisma";

async function main() {
  const branches = await prisma.branch.findMany({
    select: { city: true }
  });
  const uniqueCities = Array.from(new Set(branches.map(b => b.city)));
  console.log("Unique cities/states:", uniqueCities);
}

main().catch(console.error).finally(() => prisma.$disconnect());
