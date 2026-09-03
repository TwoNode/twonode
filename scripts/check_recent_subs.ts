import { PrismaClient } from "../prisma/generated";
const prisma = new PrismaClient();

async function main() {
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const subs = await prisma.subscription.findMany({
    where: {
      updatedAt: {
        gte: today
      }
    },
    orderBy: { updatedAt: 'desc' },
    take: 5
  });
  
  console.log(JSON.stringify(subs, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
