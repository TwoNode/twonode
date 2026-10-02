import { PrismaClient } from "../prisma/generated";
const prisma = new PrismaClient();
const invalidHistoryIds = [
  "cffe4e95-126d-46ae-ae9b-7acc3f1fcb4f",
  "1ee0356f-26ce-43ee-bf65-47c15b249b35",
  "1b7a5ba2-5d1c-4c26-b93f-9d0ab5320409",
  "f91b5089-d322-44ba-af30-4fe920ed3a2e",
  "63e87ef8-d753-40d9-82fa-3fcb283868e0",
  "38067add-b3c2-458c-8e91-efca502fa559",
  "b01f75b2-ed9f-4d35-b1cc-b28dcfe0d6c0",
  "84e5a41e-94cc-4fa5-8154-2dc8f5d04b2e",
  "a198aa40-528a-45f1-9791-7b6d91a49626",
  "29aa3f33-6840-4c3c-a425-96b2bc589fb2",
  "388e9a19-cfa7-4f5a-a025-2118ff5d2749",
  "d61aabad-c97c-4e90-aad5-8f448261d3ff",
  "93f06498-f4a5-4c6c-91ee-b53233ad124d",
  "2d711ac8-f7c2-4859-8cc6-3cc4a2014a94",
  "1cc46821-b470-4ae2-8f2e-b1825dd2e541",
];
async function main() {
  const records = await prisma.subscriptionHistory.findMany({
    where: { id: { in: invalidHistoryIds } },
  });
  console.log("Records remaining:", records.length);
}
main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
