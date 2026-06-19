import axios from "axios";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

// Disable the worker — run pdf.js on the main thread in Node.
// No DOMMatrix/ImageData/Path2D polyfills needed since we never call page.render().
pdfjsLib.GlobalWorkerOptions.workerSrc = "";

/**
 * Extract both full-text and trimmed items list using pdfjs-dist (workerless).
 * Since we only use getTextContent() (not page.render()), no canvas polyfills
 * or worker setup is needed — pdf.js runs single-threaded in Node just fine.
 */
export async function extractPdfTextAndItems(
  buffer: Buffer,
): Promise<{ allText: string; allItems: string[] }> {
  const data = new Uint8Array(buffer);
  const pdf = await pdfjsLib.getDocument({
    data,
    useWorkerFetch: false,
    isEvalSupported: false,
  }).promise;

  let allText = "";
  const allItems: string[] = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const tc = await page.getTextContent({ includeMarkedContent: false });
    for (const it of tc.items as any[]) {
      if (it.str?.trim()) allItems.push(it.str.trim());
    }
    allText += tc.items.map((it: any) => it.str).join(" ") + " ";
  }

  return { allText, allItems };
}

/**
 * Extract text from a PDF buffer using pdfjs-dist
 */
async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  const { allText } = await extractPdfTextAndItems(buffer);
  return allText;
}

/**
 * Fetch content from a URL and extract text
 * Supports both PDF and HTML content types
 */
export async function fetchAndExtractTextFromUrl(
  url: string,
): Promise<{ text: string; contentType: string }> {
  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 30000, // 30s timeout
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      validateStatus: (status) => status < 400,
    });

    const contentType = response.headers["content-type"] || "";
    const buffer = Buffer.from(response.data);

    let text = "";

    if (contentType.toLowerCase().includes("pdf")) {
      // It's a PDF — use pdfjs-dist for text extraction
      text = await extractTextFromPdfBuffer(buffer);
    } else {
      // Assume HTML or plain text
      // Convert buffer to string
      const rawText = buffer.toString("utf-8");
      // Basic HTML tag stripping
      text = rawText
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }

    return { text, contentType };
  } catch (error: any) {
    console.error("Error fetching/extracting from URL:", error.message);
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      throw new Error("Document not found at the provided URL.");
    }
    throw new Error(`Failed to fetch document: ${error.message}`);
  }
}
