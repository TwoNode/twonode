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
} from "../utils/recordCopyVerification";
import { revalidatePath } from "next/cache";

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

    // 1. Fetch settings to get tolerances
    const settingsRes = await getCurrentSettings();
    const tolerances = settingsRes.success && settingsRes.data?.recordCopyTolerances
      ? settingsRes.data.recordCopyTolerances
      : {
          tolAnchor: 0.05,
          tolWCB: 0.05,
          tolDist: 0.05,
          tolArea: 0.01,
          tolPass: 95,
          tolWarn: 80,
        };

    // 2. Download the PDF
    const response = await fetch(plan.redCopyFileUrl);
    if (!response.ok) {
      return { success: false, error: "Failed to download the Record Copy PDF." };
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Extract text using pdf-parse with pagerender to get exact text items
    let pdfData;
    let allItems: string[] = [];

    function render_page(pageData: any) {
      const render_options = {
        normalizeWhitespace: false,
        disableCombineTextItems: false
      };
      return pageData.getTextContent(render_options).then(function(textContent: any) {
        let pageText = '';
        for (let item of textContent.items) {
          const str = item.str || "";
          if (str.trim()) allItems.push(str.trim());
          pageText += str + " ";
        }
        return pageText;
      });
    }

    try {
      const pdfParse = require("pdf-parse");
      pdfData = await pdfParse(buffer, { pagerender: render_page });
    } catch (err: any) {
      return { success: false, error: `Failed to parse PDF: ${err.message}` };
    }

    const allText = pdfData.text;

    // 4. Run Extraction Logic
    let extraction;
    try {
      extraction = extractFromPDFText(allText, allItems);
    } catch (err: any) {
      return { success: false, error: err.message || "Extraction failed." };
    }

    const csvVertices = Array.isArray(plan.pillars) ? plan.pillars : [];

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

    for (let i = 0; i < parcels.length; i++) {
      const vertices = parcels[i];
      const anchor = identifyAnchor(extraction.refCoords, vertices, tolerances.tolAnchor);
      
      if (!anchor) {
        parcelResults.push({
          parcelIndex: i + 1,
          status: "NOT_VERIFIED",
          error: "Could not identify an Anchor coordinate within tolerance.",
        });
        allHasError = true;
        continue;
      }

      const traverse = reconstructTraverse(
        anchor,
        extraction.bearings,
        extraction.distances,
        vertices,
        tolerances.tolWCB,
        tolerances.tolDist
      );

      const score = scoreResults(traverse, tolerances, true, extraction.pdfArea);
      
      if (score.hasLegErrors) allHasError = true;
      if (score.hasAreaFail) allHasAreaFail = true;
      
      overallSum += score.overall;

      parcelResults.push({
        parcelIndex: i + 1,
        anchor: anchor,
        traverse: traverse,
        score: score,
        status: score.status,
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
