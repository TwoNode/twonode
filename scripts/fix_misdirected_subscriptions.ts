import { PrismaClient } from "../prisma/generated";

const prisma = new PrismaClient();

const invalidHistoryIds = [
  "842e2cc0-625b-479a-a0a1-f7a1383c33ec", // REVA_150d95ef2
  "cffe4e95-126d-46ae-ae9b-7acc3f1fcb4f", // reva_dcd4c3cb17d2
  "1ee0356f-26ce-43ee-bf65-47c15b249b35", // EB_GBC2_c3de35...
  "1b7a5ba2-5d1c-4c26-b93f-9d0ab5320409", // EB_GBC2_2aff9d...
  "f91b5089-d322-44ba-af30-4fe920ed3a2e", // SurfCoDRef_3e0a93d9
  "63e87ef8-d753-40d9-82fa-3fcb283868e0", // REG_GBC2_065b53...
  "38067add-b3c2-458c-8e91-efca502fa559", // EB_GBC2_937f27...
  "b01f75b2-ed9f-4d35-b1cc-b28dcfe0d6c0", // STD_GBC2_daedbe...
  "84e5a41e-94cc-4fa5-8154-2dc8f5d04b2e", // EB_GBC2_1a3cf0...
  "a198aa40-528a-45f1-9791-7b6d91a49626", // EB_GBC2_4d06a1...
  "29aa3f33-6840-4c3c-a425-96b2bc589fb2", // REG_GBC2_80d7fd...
  "388e9a19-cfa7-4f5a-a025-2118ff5d2749", // REG_GBC2_277008...
  "d61aabad-c97c-4e90-aad5-8f448261d3ff", // EB_GBC2_3b5f49...
  "93f06498-f4a5-4c6c-91ee-b53233ad124d", // EB_GBC2_8e270e...
  "2d711ac8-f7c2-4859-8cc6-3cc4a2014a94", // SurfCoDRef_511a4327
  "1cc46821-b470-4ae2-8f2e-b1825dd2e541", // CMP_GBC2_6baf4f...
];

const targetUpdates = [
  {
    userId: "a5419e80-cc4c-45e9-934a-a1b38cddf1cc",
    planName: "Monthly",
    planCode: "PLN_55ftd3cu1vuhy7v",
    amount: 1670000,
    interval: "monthly",
    currentStart: new Date("2025-08-18T14:28:03Z"),
    currentEnd: new Date("2025-10-30T00:00:00Z"),
  },
  {
    userId: "faf617ff-a566-4db1-ad0e-db70b02f08b8",
    planName: "Quarterly",
    planCode: "",
    amount: 5000000,
    interval: "quarterly",
    currentStart: new Date("2025-10-16T18:19:13Z"),
    currentEnd: new Date("2026-01-16T18:19:13Z"),
  },
  {
    userId: "29052e30-8619-48d5-a60e-e0c57ddb9273",
    planName: "Quarterly",
    planCode: "",
    amount: 5000000,
    interval: "quarterly",
    currentStart: new Date("2025-10-02T21:01:08Z"),
    currentEnd: new Date("2026-01-02T21:01:08Z"),
  },
  {
    userId: "5183dad1-f81b-4351-a5bc-2ca9ab2afec7",
    planName: "Quarterly",
    planCode: "",
    amount: 5000000,
    interval: "quarterly",
    currentStart: new Date("2025-10-28T10:21:44Z"),
    currentEnd: new Date("2026-01-28T10:21:44Z"),
  },
  {
    userId: "f414a23f-4da6-4ca2-b96d-e42b30988de7",
    planName: "SURF_QUARTERLY",
    planCode: "PLN_op8wb4hoxs9v96b",
    amount: 5000000,
    interval: "quarterly",
    currentStart: new Date("2025-12-09T12:07:23Z"),
    currentEnd: new Date("2026-04-09T12:07:22Z"),
  },
  {
    userId: "949b517c-eaaf-443a-9e38-a43331781c45",
    planName: "SURF_QUARTERLY",
    planCode: "PLN_op8wb4hoxs9v96b",
    amount: 5000000,
    interval: "quarterly",
    currentStart: new Date("2026-01-12T13:03:31Z"),
    currentEnd: new Date("2026-05-12T13:03:30Z"),
  },
  {
    userId: "9831f451-8165-407b-8fd7-e20412f204c6",
    planName: "Quarterly",
    planCode: "",
    amount: 5000000,
    interval: "quarterly",
    currentStart: new Date("2025-10-30T17:00:05Z"),
    currentEnd: new Date("2026-01-30T17:00:13Z"),
  },
  {
    userId: "18d26514-8e4d-4084-8df2-228558a94a82",
    planName: "Quarterly",
    planCode: "",
    amount: 5000000,
    interval: "quarterly",
    currentStart: new Date("2025-09-02T14:31:00Z"),
    currentEnd: new Date("2025-12-02T14:31:00Z"),
  },
  {
    userId: "00110c41-2aa8-45ea-a500-aa82b542b5ab",
    planName: "Monthly",
    planCode: "",
    amount: 1670000,
    interval: "monthly",
    currentStart: new Date("2025-09-17T20:09:38Z"),
    currentEnd: new Date("2025-12-01T00:00:00Z"),
  }
];

async function main() {
  console.log("Starting database cleanup...");

  for (const id of invalidHistoryIds) {
    try {
      await prisma.subscriptionHistory.delete({
        where: { id },
      });
      console.log(`Deleted invalid SubscriptionHistory record: ${id}`);
    } catch (error: any) {
      if (error.code === 'P2025') {
        console.log(`Record ${id} already deleted or not found.`);
      } else {
        console.error(`Error deleting record ${id}:`, error.message);
      }
    }
  }

  console.log("\nStarting Subscription state restoration...");

  for (const update of targetUpdates) {
    try {
      const sub = await prisma.subscription.update({
        where: { userId: update.userId },
        data: {
          planName: update.planName,
          planCode: update.planCode,
          amount: update.amount,
          interval: update.interval,
          currentStart: update.currentStart,
          currentEnd: update.currentEnd,
          // Resetting nextPaymentDate to currentEnd so it aligns
          nextPaymentDate: update.currentEnd,
        },
      });
      console.log(`Updated Subscription for user: ${update.userId}`);
      console.log(`  -> Interval: ${sub.interval}, Amount: ${sub.amount}`);
      console.log(`  -> CurrentStart: ${sub.currentStart?.toISOString()}`);
      console.log(`  -> CurrentEnd: ${sub.currentEnd?.toISOString()}`);
    } catch (error: any) {
      console.error(`Error updating Subscription for user ${update.userId}:`, error.message);
    }
  }

  console.log("\nCleanup and restoration completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
