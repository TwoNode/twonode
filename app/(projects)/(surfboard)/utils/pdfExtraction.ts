// app/(projects)/(surfboard)/utils/pdfExtraction.ts
// Client-side PDF text extraction using pdf.js

/**
 * Dynamically loads pdf.js library from CDN
 */
async function loadPdfJs(): Promise<any> {
  // Check if already loaded
  if (typeof window !== "undefined" && (window as any).pdfjsLib) {
    return (window as any).pdfjsLib;
  }

  return new Promise((resolve, reject) => {
    // Load the main script
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.6.172/pdf.min.js";
    script.onload = () => {
      const pdfjsLib = (window as any).pdfjsLib;
      // Configure the worker
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.6.172/pdf.worker.min.js";
      resolve(pdfjsLib);
    };
    script.onerror = () => reject(new Error("Failed to load PDF.js library"));
    document.head.appendChild(script);
  });
}

/**
 * Extracts all text content from a PDF file
 * @param file - The PDF file to extract text from
 * @returns Promise<string> - The extracted text content
 */
export async function extractTextFromPdf(file: File): Promise<string> {
  const pdfjsLib = await loadPdfJs();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = "";

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(" ");
    fullText += pageText + "\n\n";
  }

  // Clean up the text
  fullText = fullText
    .replace(/\r/g, "\n")
    .replace(/\n[ \t]+\n/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ");

  return fullText.trim();
}

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
 * Default/empty extraction result
 */
export const EMPTY_EXTRACTION: AIExtractedData = {
  planNumber: "",
  surveyTitle: "",
  locality: "",
  area: "",
  date: "",
  coordinates: [],
};
