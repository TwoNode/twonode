import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const record = await prisma.subscriptionHistory.findUnique({
    where: { id: "842e2cc0-625b-479a-a0a1-f7a1383c33ec" }
  });
  console.log("Record found:", record);
}
main().catch(console.error).finally(()=>prisma.$disconnect());
