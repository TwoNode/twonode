const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const events = await prisma.webhookEvent.findMany({
    where: {
      receivedAt: { gte: today },
      platform: "surfboard"
    },
    orderBy: { receivedAt: 'desc' },
    take: 5
  });
  
  for (const e of events) {
    console.log("EVENT:", e.event, "STATUS:", e.status);
    console.log(JSON.stringify(e.payload, null, 2));
    console.log("=========================================");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
