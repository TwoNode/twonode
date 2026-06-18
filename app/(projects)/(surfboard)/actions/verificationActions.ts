"use server";

import prisma from "@/lib/prisma";
import { getAuthenticatedSurfUserFromCookie } from "@/utils/surfAuth";
import type { ApiResult } from "../types/surfboardTypes";
import { getCurrentSettings } from "./settingsActions";
import {
  extractFromPDFText,
  identifyAnchor,
  reconstructTraverse,
  scoreResults,
  shoelaceArea,
} from "../utils/recordCopyVerification";
import { revalidatePath } from "next/cache";
import { extractPdfTextAndItems } from "../utils/pdfUtils";

export async function verifyPlanRecordCopy(planId: string): Promise<ApiResult<any>> {
  try {
    const auth = await getAuthenticatedSurfUserFromCookie();
    if (!auth) {
      return { success: false, error: "Not authenticated" };
    }

    const plan = await prisma.surfboardPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      return { success: false, error: "Plan not found" };
    }

    if (!plan.redCopyFileUrl) {
      return { success: false, error: "No Record Copy PDF has been uploaded for this plan." };
    }

    if (!plan.pillars || typeof plan.pillars !== "object") {
      return { success: false, error: "No pillar data found for this plan." };
    }

    const settingsRes = await getCurrentSettings();
    const rawTol = ((settingsRes.success && settingsRes.data?.recordCopyTolerances) || {}) as any;
    const tolerances = {
      tolAnchor: Number(rawTol.tolAnchor ?? 0.05),
      tolWCB: Number(rawTol.tolWCB ?? 0.05),
      tolDist: Number(rawTol.tolDist ?? 0.05),
      tolArea: Number(rawTol.tolArea ?? 0.01),
      tolPass: Number(rawTol.tolPass ?? 95),
      tolWarn: Number(rawTol.tolWarn ?? 80),
    };

    // 2. Download the PDF
    const response = await fetch(plan.redCopyFileUrl);
    if (!response.ok) {
      return { success: false, error: "Failed to download the Record Copy PDF." };
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Extract text using modern pdfjs-dist
    let allText = "";
    let allItems: string[] = [];

    try {
      const extracted = await extractPdfTextAndItems(buffer);
      allText = extracted.allText;
      allItems = extracted.allItems;
    } catch (err: any) {
      return { success: false, error: `Failed to parse PDF: ${err.message}` };
    }

    // 4. Run Extraction Logic
    let extraction;
    try {
      extraction = extractFromPDFText(allText, allItems);
    } catch (err: any) {
      return { success: false, error: err.message || "Extraction failed." };
    }

    const csvVertices = (Array.isArray(plan.pillars) ? plan.pillars : []).map((v: any) => ({
      ...v,
      id: v.id || v.pillarNumber || v.pillar || v.point || v.no || "",
    }));

    if (csvVertices.length === 0) {
      return { success: false, error: "CSV pillar data is empty." };
    }

    // Since we support multiple parcels (multi-polygon), the user might have multiple polygons.
    // The HTML handled multiple parcels by looping. For simplicity, we just verify the first one here
    // or concatenate all vertices. Wait, the HTML splits by CSV drops. If `csvVertices` contains
    // an array of arrays (multiple parcels), we should handle it.
    // Let's assume `csvVertices` is an array of objects `{ id, easting, northing }`.
    // Wait, let's check how `pillars` are structured in `SurfboardPlanForm.tsx`.
    // It's `PillarData[]` which has `id, easting, northing, polygonIndex`.
    // We group by `polygonIndex`.
    
    // Group vertices by polygonIndex
    const groups: Record<number, any[]> = {};
    for (const v of csvVertices) {
      if (!v || typeof v !== 'object') continue;
      const idx = (v as any).polygonIndex ?? 0;
      if (!groups[idx]) groups[idx] = [];
      groups[idx].push(v);
    }

    const parcels = Object.values(groups);
    const parcelResults = [];

    let overallSum = 0;
    let allHasError = false;
    let allHasAreaFail = false;

    const usedRefCoords = new Set<string>();

    for (let i = 0; i < parcels.length; i++) {
      const vertices = parcels[i];
      
      // Filter out ref coordinates already used by another parcel
      const availableCoords = extraction.refCoords.filter(
        r => !usedRefCoords.has(`${r.easting}|${r.northing}`)
      );

      const anchor = identifyAnchor(
        availableCoords.length > 0 ? availableCoords : extraction.refCoords,
        vertices,
        tolerances.tolAnchor
      );
      
      if (!anchor) {
        parcelResults.push({
          parcelIndex: i + 1,
          status: "NOT_VERIFIED",
          error: "Could not identify an Anchor coordinate.",
        });
        allHasError = true;
        continue;
      }

      if (!anchor.withinTol) {
        parcelResults.push({
          parcelIndex: i + 1,
          status: "NOT_VERIFIED",
          error: `Anchor coordinate residual (${anchor.residual.toFixed(4)}m) exceeds tolerance of ${tolerances.tolAnchor}m.`,
        });
        allHasError = true;
        continue;
      }

      // Mark this anchor's ref coordinate as used
      usedRefCoords.add(`${anchor.ref.easting}|${anchor.ref.northing}`);

      const traverse = reconstructTraverse(
        anchor,
        extraction.bearings,
        extraction.distances,
        vertices,
        tolerances.tolWCB,
        tolerances.tolDist
      );

      // Area validation — match this parcel's CSV area against PDF areas
      const csvArea = shoelaceArea(vertices);
      let matchedPdfArea = null;
      if (extraction.pdfAreas.length > 0) {
        matchedPdfArea = extraction.pdfAreas.reduce((best: any, a: any) =>
          Math.abs(a.sqm - csvArea) < Math.abs(best.sqm - csvArea) ? a : best
        );
      }
      const pdfAreaSqm = matchedPdfArea ? matchedPdfArea.sqm : null;
      const areaDiff = pdfAreaSqm != null ? Math.abs(csvArea - pdfAreaSqm) : null;
      const areaMatch = areaDiff != null && areaDiff <= tolerances.tolArea;

      const score = scoreResults(traverse, tolerances, areaMatch, pdfAreaSqm);
      
      if (score.hasLegErrors) allHasError = true;
      if (score.hasAreaFail) allHasAreaFail = true;
      
      overallSum += score.overall;

      parcelResults.push({
        parcelIndex: i + 1,
        anchor: anchor,
        traverse: traverse,
        score: score,
        status: score.status,
        csvArea,
        pdfArea: pdfAreaSqm,
        areaDiff,
        areaMatch,
      });
    }

    const finalOverall = parcels.length > 0 ? overallSum / parcels.length : 0;
    let finalStatus = "NOT_VERIFIED";
    
    if (allHasError || allHasAreaFail) {
      finalStatus = "NOT_VERIFIED";
    } else if (finalOverall >= tolerances.tolPass) {
      finalStatus = "VERIFIED";
    } else if (finalOverall >= tolerances.tolWarn) {
      finalStatus = "REVIEW";
    }

    const verificationData = {
      overallVerdict: finalStatus,
      overallScore: finalOverall,
      extraction: {
        bearingsCount: extraction.bearings.length,
        distancesCount: extraction.distances.length,
        refCoordsCount: extraction.refCoords.length,
        pdfAreas: extraction.pdfAreas,
      },
      parcelResults: parcelResults,
    };

    // 5. Update the Database
    await prisma.surfboardPlan.update({
      where: { id: planId },
      data: {
        recordCopyVerifiedAt: new Date(),
        recordCopyVerdict: finalStatus,
        recordCopyVerificationData: verificationData as any,
      },
    });

    revalidatePath("/surf-restricted/dashboard/intake");
    revalidatePath("/surf-restricted/dashboard/records-ii");

    return { success: true, data: verificationData };
  } catch (error: any) {
    console.error("Verification error:", error);
    return { success: false, error: error.message || "An unexpected error occurred" };
  }
}

export async function downloadPlanPdfAsBase64(planId: string): Promise<ApiResult<string>> {
  try {
    const plan = await prisma.surfboardPlan.findUnique({
      where: { id: planId },
    });
    if (!plan || !plan.redCopyFileUrl) {
      return { success: false, error: "No PDF URL found" };
    }
    const res = await fetch(plan.redCopyFileUrl);
    if (!res.ok) {
      return { success: false, error: `Failed to fetch PDF: ${res.statusText}` };
    }
    const arrayBuffer = await res.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    return { success: true, data: base64 };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to download PDF" };
  }
}

export async function savePlanVerificationResult(
  planId: string,
  verdict: string,
  score: number,
  verificationData: any
): Promise<ApiResult<any>> {
  try {
    await prisma.surfboardPlan.update({
      where: { id: planId },
      data: {
        recordCopyVerifiedAt: new Date(),
        recordCopyVerdict: verdict,
        recordCopyVerificationData: verificationData as any,
      },
    });

    revalidatePath("/surf-restricted/dashboard/intake");
    revalidatePath("/surf-restricted/dashboard/records-ii");

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to save verification result" };
  }
}
