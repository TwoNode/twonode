const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const userId = "e764640e-c5c9-405a-8525-e77118807b55";
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  
  if (!sub) {
    console.log("No sub found");
    return;
  }
  
  console.log("Current Sub:", sub);
  
  // Hardcode the dates
  const nextCharge = new Date("2026-08-10T17:15:28.000Z");
  
  const updated = await prisma.subscription.update({
    where: { userId },
    data: {
      subCode: null, // Clear the wrong subCode
      emailToken: null,
      nextPaymentDate: nextCharge,
    }
  });
  
  console.log("Updated Sub:", updated);
}

main().catch(console.error).finally(() => prisma.$disconnect());
