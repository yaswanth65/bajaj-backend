import prisma from "./lib/prisma";
import { RoleId } from "@prisma/client";

async function main() {
  const lcs = await prisma.user.findMany({
    where: { role: RoleId.lc }
  });
  console.log("Total LCs found in DB:", lcs.length);
  
  const ids = lcs.map(u => u.id);
  const uniqueIds = new Set(ids);
  console.log("Unique LC IDs count:", uniqueIds.size);
  
  const emails = lcs.map(u => u.email);
  const uniqueEmails = new Set(emails);
  console.log("Unique LC Emails count:", uniqueEmails.size);

  // Find duplicates
  const idCounts: Record<string, number> = {};
  for (const id of ids) {
    idCounts[id] = (idCounts[id] || 0) + 1;
  }
  const dupIds = Object.entries(idCounts).filter(([_, count]) => count > 1);
  console.log("Duplicate IDs:", dupIds);
}

main().catch(console.error).finally(() => prisma.$disconnect());
