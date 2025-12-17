"use server";

// app/(projects)/(surfboard)/actions/aiExtractionActions.ts
// Server-side AI extraction using OpenAI API

import type { ApiResult } from "../types/surfboardTypes";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/**
 * Result structure from AI extraction
 */
export interface AIExtractedData {
  planNumber: string;
  surveyTitle: string;
  locality: string;
  area: string;
  date: string;
  coordinates: Array<{
    northing: string;
    easting: string;
  }>;
}

/**
 * System prompt for survey plan extraction
 * This is a detailed prompt that guides the AI to extract Nigerian cadastral survey plan data
 */
const SYSTEM_PROMPT = `
You are an advanced AI specialized in interpreting Nigerian cadastral SURVEY PLANS.
You MUST perform TWO STAGES:
1) INTERNAL REASONING (do not output reasoning): read the entire text, identify ALL candidate tokens for plan number, survey title, locality, area, date, and coordinates; classify candidates (is this a name, address, date, plan id?); pick the best candidate for each field; normalize and clean them (remove dashes, fix spacing, uppercase plan number, convert date to YYYY-MM-DD for HTML date input, etc.); pair coordinates; resolve ambiguities using domain logic (dates are not plan numbers; titles are people or entities; localities are addresses).
2) FINAL OUTPUT: return STRICT JSON ONLY with the exact fields: planNumber, surveyTitle, locality, area, date, coordinates.

Important details:
- Plan Number rules:
  * Must begin with 2-5 letters and contain multiple '/' segments.
  * Must NOT be a date. Prefer tokens with alphanumeric segments (not 1-2 digit date segments).
  * Output in UPPERCASE.

- SURVEY TITLE (CRITICAL LOGIC — PERSON OR LAND OWNER ENTITY, NOT SURVEYOR)
The Survey Title is the FIRST non-empty line immediately after any variation of:
- "SAID TO BELONG TO"
- "-SAID TO BELONG TO-"
- "SAID TO BELONG TO:"

This title MUST represent the OWNER of the land, not the surveyor.

VALID survey title examples:
- An individual (e.g. "MR. LAFO OLATERU OLAGBEGI")
- A company or organization (e.g. "FINETRUST MULTIPURPOSE COOPERATIVE")
- A church or estate (e.g. "GLORYLAND ESTATE LTD.")

DO NOT accept lines that belong to the surveyor or their company.

The following MUST BE EXCLUDED as survey titles:
- Any line near email, phone numbers, office address
- Any line containing professional terms:
  "SURVEYOR", "SURVEY CONSULT", "ENGINEERING", "CONSULT LTD", "SERVICES", "FIRM", "CONSULTANCY"
- Any block that includes:
  - Street address (e.g., "NO 58, KUDIRAT ABIOLA WAY…")
  - Phone numbers ("+234…")
  - Email addresses
  - Website URLs
  - Company tagline
- Any block associated with footer/contact info of the surveyor.

RULE:
Extract ONLY the first non-empty line AFTER the "SAID TO BELONG TO" phrase that is NOT part of the surveyor/company block and DOES resemble a land-owning entity.

  * Must be the FIRST non-empty line immediately after any line containing 'SAID TO BELONG TO' (case-insensitive).
  * It may be a PERSON name OR a COMPANY/ORGANIZATION/CHURCH/ESTATE. Classify it as an owner entity (not an address).
  * Strip leading/trailing dashes and whitespace.

- Locality:
  * Extract the FIRST valid locality line after the survey title (Option A).
  * Valid locality lines commonly start with or contain: 'AT', 'NO.', 'ALONG', 'BEING', 'SITUATED AT', 'LOCATED AT', or contain 'NO.'.
  * Stop before metadata such as 'LOCAL GOVT AREA', 'STATE', 'SCALE', 'ORIGIN', 'AREA'.

- Area:
  * Extract numeric area and unit (e.g., '917.830 SQ. MTS', '645.576 SQ.MTS', '0.045 HA').
  * Normalize spacing and punctuation.
  * Format as a clean number with unit, suitable for display.

- Date:
  * Recognize numeric formats (e.g., '24 - 04 - 2025', '24/04/2025', '5/5/95') and written formats ('3RD JULY, 2025').
  * Convert and return a final date in YYYY-MM-DD format (ISO format for HTML date input).
  * If a 2-digit year is found: if >=50 => 19xx, otherwise 20xx.

- Coordinates (IMPORTANT - Extract ALL coordinate pairs):
  * Look for coordinate tables or lists with Northing (mN) and Easting (mE) values.
  * Accept patterns like '722 861.953mN' or '722861.953 mN' or '722861.953m N'.
  * Remove internal spaces so examples become '722861.953mN'.
  * Normalize suffix to 'mN' or 'mE'.
  * Extract the raw numeric values WITHOUT the mN/mE suffix for the output.
  * Pair northing (mN) and easting (mE) in reading order.
  * Include ALL coordinate pairs found, maintaining their order (they define the polygon vertices).
  * If coordinates appear to be in a table with pillar numbers, maintain that sequence.

General rules:
- DO NOT hallucinate. If unsure, set field to an empty string or empty array.
- Remove stray dashes and extra spaces.
- If multiple candidates exist, choose the most complete/standard-looking one.
- Return STRICT JSON ONLY (no explanation, no markdown, no extra text).
`;

/**
 * Extract JSON from AI response
 */
function extractJsonFromResponse(text: string): string | null {
  if (!text || typeof text !== "string") return null;

  // Remove code fences if present
  let cleaned = text.replace(/```json|```/g, "").trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  const candidate = cleaned.slice(firstBrace, lastBrace + 1);

  try {
    JSON.parse(candidate);
    return candidate;
  } catch {
    return null;
  }
}

/**
 * Parse and validate the AI response
 */
function parseAIResponse(text: string): AIExtractedData {
  const jsonText = extractJsonFromResponse(text);

  if (!jsonText) {
    throw new Error("Could not locate JSON in model response.");
  }

  const obj = JSON.parse(jsonText);

  // Normalize and validate the response
  const result: AIExtractedData = {
    planNumber: obj.planNumber
      ? String(obj.planNumber).toUpperCase().trim()
      : "",
    surveyTitle: obj.surveyTitle ? String(obj.surveyTitle).trim() : "",
    locality: obj.locality ? String(obj.locality).trim() : "",
    area: obj.area ? String(obj.area).trim() : "",
    date: obj.date ? normalizeDate(String(obj.date).trim()) : "",
    coordinates: [],
  };

  // Normalize coordinates array
  if (Array.isArray(obj.coordinates)) {
    result.coordinates = obj.coordinates
      .map((c: any) => ({
        northing: c.northing
          ? String(c.northing).replace(/\s+/g, "").replace(/mN$/i, "")
          : "",
        easting: c.easting
          ? String(c.easting).replace(/\s+/g, "").replace(/mE$/i, "")
          : "",
      }))
      .filter((c: any) => c.northing || c.easting); // Remove empty entries
  }

  return result;
}

/**
 * Normalize date to YYYY-MM-DD format for HTML date input
 */
function normalizeDate(dateStr: string): string {
  if (!dateStr) return "";

  // If already in YYYY-MM-DD format
  const isoMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // MM/DD/YYYY format
  const usMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (usMatch) {
    let [, month, day, year] = usMatch;
    if (year.length === 2) {
      year = parseInt(year) >= 50 ? `19${year}` : `20${year}`;
    }
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // DD-MM-YYYY or DD/MM/YYYY variants
  const dmyMatch = dateStr.match(
    /^([0-3]?\d)[\s\-\/]+([0-1]?\d)[\s\-\/]+(\d{2,4})$/
  );
  if (dmyMatch) {
    let [, day, month, year] = dmyMatch;
    if (year.length === 2) {
      year = parseInt(year) >= 50 ? `19${year}` : `20${year}`;
    }
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // Written formats: "3RD JULY, 2025" or "3 JULY 2025"
  const writtenMatch = dateStr.match(
    /(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)[,]?\s+(\d{4})/i
  );
  if (writtenMatch) {
    const [, day, monthName, year] = writtenMatch;
    const month = monthNameToNumber(monthName);
    if (month) {
      return `${year}-${String(month).padStart(2, "0")}-${day.padStart(
        2,
        "0"
      )}`;
    }
  }

  // Written reversed: "JULY 3, 2025"
  const writtenReversed = dateStr.match(
    /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/i
  );
  if (writtenReversed) {
    const [, monthName, day, year] = writtenReversed;
    const month = monthNameToNumber(monthName);
    if (month) {
      return `${year}-${String(month).padStart(2, "0")}-${day.padStart(
        2,
        "0"
      )}`;
    }
  }

  return ""; // Could not normalize
}

function monthNameToNumber(name: string): number | null {
  if (!name) return null;
  const month = name.trim().toLowerCase().slice(0, 3);
  const map: Record<string, number> = {
    jan: 1,
    feb: 2,
    mar: 3,
    apr: 4,
    may: 5,
    jun: 6,
    jul: 7,
    aug: 8,
    sep: 9,
    oct: 10,
    nov: 11,
    dec: 12,
  };
  return map[month] || null;
}

/**
 * Extract text from PDF using pdf-parse (server-side)
 */
async function extractTextFromPdfServer(
  pdfBuffer: ArrayBuffer
): Promise<string> {
  // Dynamic import for pdf-parse - using require for CommonJS compatibility
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse");

  const buffer = Buffer.from(pdfBuffer);
  const data = await pdfParse(buffer);

  // Clean up the text
  let text = data.text
    .replace(/\r/g, "\n")
    .replace(/\n[ \t]+\n/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ");

  return text.trim();
}

/**
 * Main server action to extract survey plan data from PDF using AI
 * Now accepts FormData with the PDF file for full server-side processing
 * @param formData - FormData containing the PDF file
 * @returns Promise<ApiResult<AIExtractedData>>
 */
export async function extractSurveyPlanDataFromPdf(
  formData: FormData
): Promise<ApiResult<AIExtractedData>> {
  try {
    if (!OPENAI_API_KEY) {
      return {
        success: false,
        error:
          "OpenAI API key is not configured. Please contact the administrator.",
      };
    }

    // Get the PDF file from FormData
    const pdfFile = formData.get("pdf") as File | null;

    if (!pdfFile) {
      return {
        success: false,
        error: "No PDF file provided.",
      };
    }

    // Extract text from PDF on server
    const pdfBuffer = await pdfFile.arrayBuffer();
    let pdfText: string;

    try {
      pdfText = await extractTextFromPdfServer(pdfBuffer);
    } catch (parseError) {
      console.error("PDF parsing error:", parseError);
      return {
        success: false,
        error:
          "Failed to read PDF. Please ensure it's a valid, searchable PDF file.",
      };
    }

    if (!pdfText || pdfText.trim().length < 50) {
      return {
        success: false,
        error:
          "The PDF appears to be empty or contains too little text. Please ensure it's a searchable PDF (not a scanned image).",
      };
    }

    // Truncate text if too long to avoid token limits
    const MAX_CHARS = 20000;
    let payloadText = pdfText;
    if (payloadText.length > MAX_CHARS) {
      payloadText =
        payloadText.slice(0, 13000) +
        "\n\n...TRUNCATED...\n\n" +
        payloadText.slice(-7000);
    }

    const userPrompt = `
Raw extracted text below:
--------------------------
${payloadText}
--------------------------
Return the JSON object with keys: planNumber, surveyTitle, locality, area, date, coordinates.
Date must be in YYYY-MM-DD format. 
Coordinates must be an array of objects with keys "northing" and "easting" containing the numeric values (without mN/mE suffix).
Extract ALL coordinate pairs found in the document to define the complete polygon boundary.
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Cost-effective and fast
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 2000, // Increased for coordinate extraction
        temperature: 0.0, // Deterministic output for consistency
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      return {
        success: false,
        error: `AI service error (${response.status}). Please try again later.`,
      };
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      return {
        success: false,
        error: "AI did not return a valid response. Please try again.",
      };
    }

    const extractedData = parseAIResponse(content);

    return {
      success: true,
      data: extractedData,
    };
  } catch (error) {
    console.error("Error in AI extraction:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred during AI extraction.",
    };
  }
}
