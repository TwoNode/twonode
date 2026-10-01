import { PrismaClient } from "../prisma/generated";
const prisma = new PrismaClient();
async function main() {
  try {
    const res = await prisma.subscriptionHistory.delete({
      where: { id: "842e2cc0-625b-479a-a0a1-f7a1383c33ec" }
    });
    console.log("Delete result:", res);
    const check = await prisma.subscriptionHistory.findUnique({
      where: { id: "842e2cc0-625b-479a-a0a1-f7a1383c33ec" }
    });
    console.log("Check after delete:", check);
  } catch (err) {
    console.error("Error:", err);
  }
}
main().catch(console.error).finally(()=>prisma.$disconnect());
