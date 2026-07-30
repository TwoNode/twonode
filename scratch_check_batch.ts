import prisma from './lib/prisma';

async function main() {
  const batches = await prisma.certificateOfDepositBatch.findMany({
    include: {
      plans: true
    }
  });

  console.log(`Total batches found: ${batches.length}`);
  for (const batch of batches) {
    console.log(`\n========================================`);
    console.log(`Batch: ${batch.batchCode} (ID: ${batch.id})`);
    console.log(`Payment Status: ${batch.paymentStatus}`);
    console.log(`Plans Count: ${batch.plans.length}`);
    for (const plan of batch.plans) {
      console.log(`  - Plan: ${plan.planNumber} (ID: ${plan.id})`);
      console.log(`    Accounts: ${plan.accountsStatus}`);
      console.log(`    Charting: ${plan.chartingStatus}`);
      console.log(`    SURCON:   ${plan.surconStatus}`);
      console.log(`    RecordsI: ${plan.recordsIStatus}`);
      console.log(`    Physical: ${plan.physicalCopySubmitted} (at: ${plan.physicalCopySubmittedAt})`);
      console.log(`    RedCopy:  ${plan.redCopyStatus}`);
    }
  }

  await prisma.$disconnect();
}

main();
