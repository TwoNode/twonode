import { PrismaClient } from '@prisma/client';
import { computePeriodPerTimestamp } from '../app/(projects)/(surfboard)/utils/computePeriod';

const prisma = new PrismaClient();

async function main() {
  const userId = "e764640e-c5c9-405a-8525-e77118807b55";
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  
  if (!sub) {
    console.log("No sub found");
    return;
  }
  
  console.log("Current Sub:", sub);
  
  // Calculate correct dates for quarterly based on the last transaction date
  // The transaction was made today, let's just use currentStart
  const { currentStart, currentEnd, nextCharge } = computePeriodPerTimestamp(
    "quarterly",
    sub.currentStart || new Date()
  );
  
  const updated = await prisma.subscription.update({
    where: { userId },
    data: {
      subCode: null, // Clear the wrong subCode
      emailToken: null,
      nextPaymentDate: nextCharge,
      currentEnd: currentEnd
    }
  });
  
  console.log("Updated Sub:", updated);
}

main().catch(console.error).finally(() => prisma.$disconnect());
