import prisma from "./lib/prisma";
import { extractFromPDFText } from "./app/(projects)/(surfboard)/utils/recordCopyVerification";
const pdfParse = require("pdf-parse");

async function test() {
  const plans = await prisma.surfboardPlan.findMany({
    where: {
      redCopyFileUrl: { endsWith: ".pdf", mode: "insensitive" },
      pillars: { not: undefined },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  for (const plan of plans) {
    console.log(`\nTesting plan: ${plan.id}, URL: ${plan.redCopyFileUrl}`);

    try {
      const response = await fetch(plan.redCopyFileUrl as string);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const pdfData = await pdfParse(buffer);
      const allText = pdfData.text;

      console.log("--- Extracted Text Preview (First 200 chars) ---");
      console.log(allText.substring(0, 200).replace(/\n/g, " "));

      const extraction = extractFromPDFText(allText);
      console.log(
        `Bearings: ${extraction.bearings.length}, Distances: ${extraction.distances.length}, Ref coords: ${extraction.refCoords.length}`
      );

      if (extraction.distances.length > 0) break; // Found a working one
    } catch (err: any) {
      console.error("Error: ", err.message);
    }
  }

  await prisma.$disconnect();
}

test();
