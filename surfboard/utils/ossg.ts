import crypto from "crypto";
import QRCode from "qrcode";
import { compressPillarNumbers } from "@/app/(projects)/(surfboard)/utils/surfboardUtils";

/**
 * Migrated from app/(projects)/(surfboard)/actions/ossgActions.ts. Plain
 * utility, not a service — no Prisma, no auth, zero page/component
 * consumers (only batchApprovalService.ts imports transmitToOSSG directly).
 */

export async function generateDocumentHash(payload: any): Promise<string> {
  const dataString = JSON.stringify(payload);
  return crypto.createHash("sha256").update(dataString).digest("hex");
}

/** Simulates transmission of plan details to the OSSG third-party API. */
export async function transmitToOSSG(plan: any, user: any) {
  try {
    let parsedPillars = [];
    if (typeof plan.pillars === "string") {
      try {
        parsedPillars = JSON.parse(plan.pillars);
      } catch (e) {
        // ignore
      }
    } else if (Array.isArray(plan.pillars)) {
      parsedPillars = plan.pillars;
    }

    const pillarsArray = Array.isArray(parsedPillars)
      ? parsedPillars.map((p: any) => p.pillarNumber)
      : [];
    const compressedPillars = compressPillarNumbers(pillarsArray);

    const payload = {
      planNumber: plan.planNumber,
      surveyor: user ? `${user.firstName} ${user.lastName}` : "Unknown",
      surconNumber: user?.surconNumber || "N/A",
      pillars: compressedPillars,
      deededArea: plan.deededArea || "N/A",
      timestamp: new Date().toISOString(),
    };

    const documentHash = await generateDocumentHash(payload);
    const qrCodeBase64 = await QRCode.toDataURL(documentHash);

    console.log("Transmitting to OSSG API...", {
      ...payload,
      documentHash,
      qrCodeStringLength: qrCodeBase64.length,
    });

    return {
      success: true,
      data: {
        documentHash,
        qrCodeBase64,
        message: "Successfully transmitted to OSSG dummy API",
      },
    };
  } catch (error: any) {
    console.error("Error transmitting to OSSG:", error);
    return {
      success: false,
      error: error.message || "Failed to transmit to OSSG dummy API",
    };
  }
}
