"use server";

// app/(projects)/(surfboard)/actions/aiExtractionActions.ts
// Server-side AI extraction - receives pre-extracted text from client

import type { ApiResult } from "../types/surfboardTypes";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

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
 * ENHANCED System prompt based on analysis of 5 real Nigerian cadastral survey plan samples
 * Updated to handle various document formats, plan number styles, and coordinate patterns
 */
const SYSTEM_PROMPT = `You are an expert AI specialized in extracting data from Nigerian cadastral survey plans (Lagos State format).

DOCUMENT STRUCTURE (Top to Bottom):
1. Header: "PLAN SHEWING PROPERTY" (sometimes with dashes)
2. "SAID TO BELONG TO" line
3. OWNER NAME(S) - This is the SURVEY TITLE
4. LOCALITY (property address)
5. LOCAL GOVERNMENT AREA info
6. STATE (always "LAGOS STATE")
7. SCALE information
8. ORIGIN (usually "U.T.M. ZONE 31")
9. AREA measurement
10. Map/diagram with pillars and coordinates
11. Surveyor company info (bottom left)
12. PLAN NO. (bottom)
13. Surveyor signature and DATE (bottom right)

=== EXTRACTION RULES ===

1. PLAN NUMBER (Critical - at BOTTOM of document):
   FORMATS ENCOUNTERED:
   - Standard: "AMA/5579/57/2025/LA"
   - With letters in segment: "QED/1236/27A&B/2025/LA"
   - Extended: "AAA/LA/1886/2024/D004"
   - Three letter prefix: "BYA/5599/013/2024/LA"
   
   LOOK FOR:
   - "PLAN NO:" or "PLAN NO.:" or "PLAN    NO.:" (may have extra spaces)
   - Usually in a box/table at bottom
   - Contains "/" separators
   - Ends with "/LA" or "/L.A" or "/D00X" pattern
   - May have spaces in the text that should be removed
   
   OUTPUT: UPPERCASE, no spaces (e.g., "AMA/5579/57/2025/LA")

2. SURVEY TITLE (Owner Name - NOT the surveyor):
   APPEARS AFTER: "SAID TO BELONG TO" (with optional dashes/colons)
   
   EXAMPLES FROM REAL DOCUMENTS:
   - "MR. BABATUNDE TAJUDEEN SHONUBI"
   - "MR. RAHEEM LUKMAN OLABAMIJI"
   - "MR. OLUWAFEMI TAIWO ABIODUN AND MRS OGALA TURMAC NDIDI" (multiple owners)
   - "MRS. BOLANLE OLUTAYO OMOTAYO"
   - "- RAUF ABIODUN SAMSONDEEN -" (may have dashes around it)
   
   RULES:
   - Remove leading/trailing dashes "-" and whitespace
   - Keep name exactly as shown (with titles like MR., MRS., DR.)
   - If multiple owners, include "AND" between names
   - EXCLUDE: Company info at bottom (surveyor details)

3. LOCALITY (Property Address):
   APPEARS: Immediately after owner name, before "LOCAL GOVT"
   
   REAL EXAMPLES:
   - "UNIT 2, BUSH STREET, OFF SUNMOLA STREET"
   - "WITHIN TOLL SYSTEM DEVELOPMENT COMPANY LIMITED LANDED PROPERTY, LAKOWE"
   - "BEING NO.5 OLAADESHILE STREET OFF OREDOLA STREET, AJAO ESTATE"
   - "AT NO 26, FREEDOM CLOSE, OFF GBEMISOLA STREET, ADAMO, IKORODU"
   - "-ALONG-" + "OLALERE OLADUNJOYE STREET, VIA LIASU ROAD, IDIMU AREA"
   
   STARTING KEYWORDS: AT, NO., ALONG, BEING, WITHIN, UNIT, OFF, VIA, PLOT
   ENDING PATTERNS: Stop at "LOCAL GOVT", "LOCAL GOVERNMENT", "L.G.A"
   
   OUTPUT: Full address, remove surrounding dashes, include estate/area names

4. AREA (Land Measurement):
   LOOK FOR: "AREA:-" or "AREA :-" or "-AREA :-" or "AREA:"
   
   REAL EXAMPLES:
   - "AREA:- 177.464 SQ. MTS"
   - "AREA:- 421.657 SQ. MTS."
   - "AREA:- 827.470 SQ. MTS."
   - "AREA:- 558.078 SQ. MTS"
   - "-AREA : - 311.633 SQ.MTS.-"
   
   OUTPUT FORMAT: "XXX.XXX SQ. MTS" (normalize spacing, remove dashes)

5. DATE (Survey Date - at BOTTOM near surveyor signature):
   LOOK FOR: "DATE:-" or "DATE:" or text containing date near bottom right
   
   REAL FORMATS ENCOUNTERED:
   - "DATE:- 10-07-2025" → "2025-07-10"
   - "on the 4th of September, 2024" → "2024-09-04"
   - "21ST AUGUST, 2025" → "2025-08-21"
   - "2ND SEPT, 2024" → "2024-09-02"
   - "Certified True Copy of Original Plan made by me on the 4th of September, 2024"
   
   OUTPUT: ALWAYS YYYY-MM-DD format

6. COORDINATES (Reference Points on Map):
   FORMATS - Numbers may have SPACES within them:
   - "725725.662mN" and "540793.433mE" (no spaces)
   - "713 006.465mN" (space in number: 713006.465)
   - "586 222.000mE" (space in number: 586222.000)
   - "737 016.246mN" (space in number: 737016.246)
   - "724 868.273 mN" (spaces in number AND before unit)
   - "531 431.898 mE"
   
   LOCATION: Usually at edges/corners of the map diagram
   
   RULES:
   - Remove ALL spaces from within the numbers
   - Remove "mN" and "mE" suffixes
   - Return as {northing: "XXXXXX.XXX", easting: "XXXXXX.XXX"}
   - Extract ALL coordinate pairs visible

7. PILLAR/BEACON MARKERS (Reference for coordinates):
   FORMATS SEEN:
   - "SC/LA EA5411CAL" (SC/LA prefix + code)
   - "DU 3522" (DU prefix + number)
   - "PT 01" through "PT 06" (PT prefix + number)
   - "SC/LA DP2663AYA" 
   - "SC/LA DPS200LEAJ"
   
   Note: These are reference markers, not directly needed for extraction but help locate coordinates

=== DOCUMENT VARIATIONS ===

- Some documents use dashes "-" extensively around text
- Some have QR codes near plan number
- Surveyor info at bottom left includes: Company name, address, phone, email
- "Certified True Copy" text often contains the date

=== CRITICAL DISTINCTIONS ===

- OWNER (top, after "SAID TO BELONG TO") ≠ SURVEYOR (bottom, with company info)
- Plan number is ALWAYS at the bottom
- Coordinates often have spaces WITHIN the number - REMOVE THEM ALL
- Date near bottom right, may be in certification text

=== OUTPUT FORMAT ===

Return ONLY valid JSON (no markdown, no code fences, no explanation):
{
  "planNumber": "AAA/LA/1886/2024/D004",
  "surveyTitle": "MRS. BOLANLE OLUTAYO OMOTAYO",
  "locality": "AT NO 26, FREEDOM CLOSE, OFF GBEMISOLA STREET, ADAMO, IKORODU",
  "area": "558.078 SQ. MTS",
  "date": "2024-09-02",
  "coordinates": [
    {"northing": "737016.246", "easting": "566136.216"}
  ]
}

If a field cannot be found with certainty, use empty string "" or empty array [].
DO NOT guess or hallucinate values. Only extract what is clearly present in the document.`;

/**
 * Extract JSON from AI response with better error handling
 */
function extractJsonFromResponse(text: string): string | null {
  if (!text || typeof text !== "string") return null;

  // Remove markdown code fences
  let cleaned = text.replace(/```json\n?|```\n?/g, "").trim();

  // Find JSON object boundaries
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  const candidate = cleaned.slice(firstBrace, lastBrace + 1);

  // Validate it's actually JSON
  try {
    JSON.parse(candidate);
    return candidate;
  } catch {
    return null;
  }
}

/**
 * Enhanced parsing with better validation and normalization
 */
function parseAIResponse(text: string): AIExtractedData {
  const jsonText = extractJsonFromResponse(text);

  if (!jsonText) {
    throw new Error("Could not extract valid JSON from AI response.");
  }

  const obj = JSON.parse(jsonText);

  // Normalize and validate with defaults
  const result: AIExtractedData = {
    planNumber: obj.planNumber
      ? normalizePlanNumber(String(obj.planNumber))
      : "",
    surveyTitle: obj.surveyTitle
      ? normalizeSurveyTitle(String(obj.surveyTitle))
      : "",
    locality: obj.locality 
      ? normalizeLocality(String(obj.locality)) 
      : "",
    area: obj.area ? normalizeArea(String(obj.area).trim()) : "",
    date: obj.date ? normalizeDate(String(obj.date).trim()) : "",
    coordinates: [],
  };

  // Process coordinates array
  if (Array.isArray(obj.coordinates)) {
    result.coordinates = obj.coordinates
      .map((c: any) => {
        if (!c || typeof c !== "object") return null;

        const northing = c.northing
          ? String(c.northing).replace(/\s+/g, "").replace(/mN$/i, "")
          : "";
        const easting = c.easting
          ? String(c.easting).replace(/\s+/g, "").replace(/mE$/i, "")
          : "";

        // Only include if both coordinates are present and valid
        if (northing && easting && /^\d+\.?\d*$/.test(northing) && /^\d+\.?\d*$/.test(easting)) {
          return { northing, easting };
        }
        return null;
      })
      .filter(
        (c: any): c is { northing: string; easting: string } => c !== null
      );
  }

  return result;
}

/**
 * Normalize plan number - uppercase, no spaces
 */
function normalizePlanNumber(planNumber: string): string {
  if (!planNumber) return "";
  return planNumber
    .toUpperCase()
    .trim()
    .replace(/\s+/g, "")
    // Remove any X placeholder patterns (like XXXXXXXXX)
    .replace(/^X+$/, "");
}

/**
 * Normalize survey title - clean up dashes and extra whitespace
 */
function normalizeSurveyTitle(title: string): string {
  if (!title) return "";
  return title
    .trim()
    // Remove leading/trailing dashes with optional spaces
    .replace(/^[-\s]+|[-\s]+$/g, "")
    // Collapse multiple spaces
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normalize locality - clean up address formatting
 */
function normalizeLocality(locality: string): string {
  if (!locality) return "";
  
  let cleaned = locality
    .trim()
    // Remove leading/trailing dashes with optional spaces
    .replace(/^[-\s]+|[-\s]+$/g, "")
    // Remove "-ALONG-" style prefixes but keep the word ALONG
    .replace(/^-?(ALONG|AT|BEING|WITHIN|UNIT|PLOT)-?/i, "$1")
    // Collapse multiple spaces
    .replace(/\s+/g, " ")
    // Fix comma spacing
    .replace(/\s*,\s*/g, ", ")
    .trim();
  
  // Ensure it doesn't end with LOCAL GOVT info (should stop before that)
  const lgaIndex = cleaned.search(/,?\s*(LOCAL GOVT|LOCAL GOVERNMENT|L\.G\.A)/i);
  if (lgaIndex > 0) {
    cleaned = cleaned.substring(0, lgaIndex).trim();
    // Remove trailing comma if present
    cleaned = cleaned.replace(/,\s*$/, "");
  }
  
  return cleaned;
}

/**
 * Normalize area format - handle various SQ. MTS patterns
 */
function normalizeArea(area: string): string {
  if (!area) return "";

  // Remove surrounding dashes
  area = area.replace(/^[-\s]+|[-\s]+$/g, "");
  
  // Extract just the numeric value and unit
  const match = area.match(/(\d[\d,\s]*\.?\d*)\s*(SQ\.?\s*M(?:TS?|ETRES?)?\.?|HA\.?)/i);
  if (match) {
    // Clean up the number (remove commas and internal spaces)
    const num = match[1].replace(/[,\s]/g, "");
    const unit = match[2].toUpperCase()
      .replace(/\s+/g, "")
      .replace(/SQ\.?M(?:TS?|ETRES?)?\.?/i, "SQ. MTS")
      .replace(/HA\.?/i, "HA");
    
    return `${num} ${unit}`;
  }

  // Fallback: basic cleanup
  return area
    .replace(/(\d)(SQ\.?\s*MTS?\.?)/gi, "$1 SQ. MTS")
    .replace(/(\d)(HA\.?)/gi, "$1 HA")
    .trim();
}

/**
 * Enhanced date normalization to YYYY-MM-DD
 */
function normalizeDate(dateStr: string): string {
  if (!dateStr) return "";

  // Already in ISO format
  const isoMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // DD-MM-YYYY or DD/MM/YYYY or DD - MM - YYYY
  const dmyMatch = dateStr.match(
    /^([0-3]?\d)[\s\-\/]+([0-1]?\d)[\s\-\/]+(\d{2,4})$/
  );
  if (dmyMatch) {
    let [, day, month, year] = dmyMatch;
    if (year.length === 2) {
      const yearNum = parseInt(year);
      year = yearNum >= 50 ? `19${year}` : `20${year}`;
    }
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // Written formats: "21ST AUGUST, 2025" or "22ND SEPTEMBER, 2025"
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

  // Reversed: "AUGUST 21, 2025"
  const reversedMatch = dateStr.match(
    /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/i
  );
  if (reversedMatch) {
    const [, monthName, day, year] = reversedMatch;
    const month = monthNameToNumber(monthName);
    if (month) {
      return `${year}-${String(month).padStart(2, "0")}-${day.padStart(
        2,
        "0"
      )}`;
    }
  }

  return "";
}

function monthNameToNumber(name: string): number | null {
  if (!name) return null;
  const monthMap: Record<string, number> = {
    jan: 1,
    january: 1,
    feb: 2,
    february: 2,
    mar: 3,
    march: 3,
    apr: 4,
    april: 4,
    may: 5,
    jun: 6,
    june: 6,
    jul: 7,
    july: 7,
    aug: 8,
    august: 8,
    sep: 9,
    sept: 9,
    september: 9,
    oct: 10,
    october: 10,
    nov: 11,
    november: 11,
    dec: 12,
    december: 12,
  };
  const normalized = name.trim().toLowerCase();
  return monthMap[normalized] || null;
}

/**
 * Preprocess extracted PDF text to improve AI extraction
 */
function preprocessExtractedText(text: string): string {
  if (!text) return "";
  
  let processed = text
    // Normalize line endings
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    // Remove excessive whitespace while preserving structure
    .replace(/[ \t]{3,}/g, "  ")
    // Join coordinates that might be split across lines
    // e.g., "725 725" followed by ".662" on next line
    .replace(/(\d{3})\s*(\d{3})\s*\.\s*(\d{3})/g, "$1$2.$3")
    // Join "mN" and "mE" that might be separated
    .replace(/(\d)\s+(mN|mE)/gi, "$1$2")
    // Normalize common OCR errors in survey plans
    .replace(/SHEWING/g, "SHEWING") // Keep as-is, it's correct historical spelling
    .replace(/PLAN\s+NO\s*\.?\s*:?\s*/gi, "PLAN NO.: ")
    .replace(/SAID\s+TO\s+BELONG\s+TO/gi, "SAID TO BELONG TO")
    .replace(/LOCAL\s+GOVT\.?\s*AREA/gi, "LOCAL GOVERNMENT AREA")
    .replace(/LOCAL\s+GOVERNMENT\s+AREA/gi, "LOCAL GOVERNMENT AREA")
    .replace(/SQ\s*\.?\s*M(TS|ETRES?)\.?/gi, "SQ. MTS")
    .replace(/AREA\s*:\s*-?\s*/gi, "AREA:- ")
    .replace(/DATE\s*:\s*-?\s*/gi, "DATE:- ")
    // Remove excessive dashes while keeping structural ones
    .replace(/-{4,}/g, "---")
    // Collapse multiple newlines
    .replace(/\n{4,}/g, "\n\n\n");
  
  return processed.trim();
}

/**
 * Main server action - receives extracted text from client
 * @param extractedText - Text extracted from PDF on the client side
 * @returns Promise<ApiResult<AIExtractedData>>
 */
export async function extractSurveyPlanDataFromText(
  extractedText: string
): Promise<ApiResult<AIExtractedData>> {
  try {
    // Validate API key
    if (!OPENAI_API_KEY) {
      return {
        success: false,
        error:
          "OpenAI API key is not configured. Please add OPENAI_API_KEY to your environment variables.",
      };
    }

    // Validate input text
    if (!extractedText || extractedText.trim().length < 50) {
      return {
        success: false,
        error:
          "Insufficient text provided. The PDF may be empty or contain very little text.",
      };
    }

    // Preprocess the extracted text
    let payloadText = preprocessExtractedText(extractedText);
    
    // Truncate if needed while preserving important parts
    const MAX_CHARS = 25000;
    if (payloadText.length > MAX_CHARS) {
      // Keep more from the beginning (header info) and end (plan number, date)
      payloadText =
        payloadText.slice(0, 15000) +
        "\n\n[...CONTENT TRUNCATED...]\n\n" +
        payloadText.slice(-10000);
    }


    // Prepare API request with detailed extraction instructions
    const userPrompt = `Extract survey plan data from this Nigerian cadastral survey plan (Lagos State).

=== EXTRACTED TEXT FROM PDF ===
${payloadText}
=== END OF EXTRACTED TEXT ===

EXTRACTION TASK:
1. PLAN NUMBER: Find "PLAN NO:" or "PLAN NO.:" at BOTTOM of document. Format: XXX/XXXX/XX/XXXX/LA or similar.
2. SURVEY TITLE: Find owner name after "SAID TO BELONG TO". This is the PROPERTY OWNER, NOT the surveyor company at bottom.
3. LOCALITY: Find property address AFTER the owner name, BEFORE "LOCAL GOVT" or "LOCAL GOVERNMENT".
4. AREA: Find "AREA:-" followed by a number and "SQ. MTS" or similar.
5. DATE: Find date near bottom (look for "DATE:-" or dates in certification text). Convert to YYYY-MM-DD.
6. COORDINATES: Find mN (northing) and mE (easting) values. REMOVE ALL SPACES from within numbers.

CRITICAL REMINDERS:
- Owner name is at TOP (after "SAID TO BELONG TO") 
- Surveyor company is at BOTTOM (has phone numbers, email, address) - DO NOT use this as survey title
- Plan number is at BOTTOM in a box/table
- Coordinates may have spaces like "737 016.246mN" - remove spaces to get "737016.246"
- If "SAID TO BELONG TO" is followed by dashes, the name is after the dashes

Return ONLY valid JSON with these exact keys: planNumber, surveyTitle, locality, area, date, coordinates`;

    // Call OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 2500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);

      if (response.status === 401) {
        return {
          success: false,
          error:
            "Invalid OpenAI API key. Please check your environment configuration.",
        };
      }

      if (response.status === 429) {
        return {
          success: false,
          error: "API rate limit exceeded. Please try again in a moment.",
        };
      }

      return {
        success: false,
        error: `AI service error (${response.status}). Please try again.`,
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

    // Parse the AI response
    const extractedData = parseAIResponse(content);

    // Validate that we got at least some data
    const hasData =
      extractedData.planNumber ||
      extractedData.surveyTitle ||
      extractedData.locality ||
      extractedData.area;

    if (!hasData) {
      return {
        success: false,
        error:
          "Could not extract any data from the PDF. Please ensure it's a Nigerian cadastral survey plan.",
      };
    }

    return {
      success: true,
      data: extractedData,
    };
  } catch (error) {
    console.error("Error in AI extraction:", error);

    // Provide more specific error messages
    if (error instanceof SyntaxError) {
      return {
        success: false,
        error: "Failed to parse AI response. Please try again.",
      };
    }

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred during AI extraction.",
    };
  }
}

// Keep the old function for backward compatibility but mark as deprecated
/**
 * @deprecated Use extractSurveyPlanDataFromText instead
 */
export async function extractSurveyPlanDataFromPdf(
  formData: FormData
): Promise<ApiResult<AIExtractedData>> {
  return {
    success: false,
    error:
      "This function is deprecated. Please use the client-side PDF extraction approach.",
  };
}

