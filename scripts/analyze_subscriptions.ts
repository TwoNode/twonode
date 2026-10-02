import * as fs from "fs";
import * as path from "path";

const historyPath = path.join(__dirname, "../extras/SurfboardHistory.json");
const historyData = JSON.parse(fs.readFileSync(historyPath, "utf8"));

const invalidPrefixes = [
  "REVA_",
  "reva_",
  "SurfCoD",
  "EB_GBC",
  "REG_GBC",
  "STD_GBC",
  "CMP_GBC",
];

const isInvalid = (ref: string) => {
  return invalidPrefixes.some(
    (prefix) => ref.startsWith(prefix) || ref.includes("GBC")
  );
};

const invalidRecords = historyData.filter((record: any) =>
  isInvalid(record.reference)
);
const invalidIds = invalidRecords.map((r: any) => r.id);
const affectedUserIds = [...new Set(invalidRecords.map((r: any) => r.userId))];

console.log("=== INVALID RECORDS TO DELETE ===");
invalidRecords.forEach((r: any) => {
  console.log(
    `- ID: ${r.id} | Ref: ${r.reference} | User: ${r.userId} | Amount: ${r.amount}`
  );
});

console.log("\n=== RESTORATION PLAN FOR AFFECTED USERS ===");
affectedUserIds.forEach((userId: unknown) => {
  const uid = userId as string;
  const userRecords = historyData.filter((r: any) => r.userId === uid);
  const validRecords = userRecords.filter((r: any) => !isInvalid(r.reference));

  if (validRecords.length === 0) {
    console.log(`\nUser: ${uid}`);
    console.log(
      `  -> NO VALID RECORDS FOUND! Subscription should probably be cleared.`
    );
    return;
  }

  // Sort valid records by createdAt or startDate descending to find the latest
  validRecords.sort((a: any, b: any) => {
    const dateA = new Date(a.startDate || a.createdAt).getTime();
    const dateB = new Date(b.startDate || b.createdAt).getTime();
    return dateB - dateA;
  });

  const latestValid = validRecords[0];
  console.log(`\nUser: ${uid}`);
  console.log(`  -> Valid Record Ref: ${latestValid.reference}`);
  console.log(`  -> Plan Name: ${latestValid.planName}`);
  console.log(`  -> Amount: ${latestValid.amount}`);
  console.log(`  -> Interval: ${latestValid.interval}`);
  console.log(`  -> New Start Date: ${latestValid.startDate}`);
  console.log(`  -> New End Date: ${latestValid.endDate}`);
});

console.log(`\nTotal invalid records to delete: ${invalidRecords.length}`);
console.log(`Total affected users: ${affectedUserIds.length}`);
