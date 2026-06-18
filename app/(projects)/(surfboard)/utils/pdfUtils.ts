import axios from "axios";
import pdfParse from "pdf-parse";

// Define polyfills for pdfjs-dist in Node environment
function setupPdfJsPolyfills() {
  if (typeof global.DOMMatrix === "undefined") {
    global.DOMMatrix = class DOMMatrix {
      a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
      constructor() {}
    } as any;
  }
  if (typeof global.ImageData === "undefined") {
    global.ImageData = class ImageData {
      width: number;
      height: number;
      data: Uint8ClampedArray;
      constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.data = new Uint8ClampedArray(width * height * 4);
      }
    } as any;
  }
  if (typeof global.Path2D === "undefined") {
    global.Path2D = class Path2D {} as any;
  }
}

/**
 * Extract both full-text and trimmed items list using modern pdfjs-dist
 */
export async function extractPdfTextAndItems(
  buffer: Buffer,
): Promise<{ allText: string; allItems: string[] }> {
  setupPdfJsPolyfills();

  const pagesData: { pageNumber: number; text: string; items: string[] }[] = [];

  function renderPage(pageData: any) {
    const pageNumber = pageData.pageNumber; // 1-indexed page number
    return pageData.getTextContent({ includeMarkedContent: false }).then(function(textContent: any) {
      const items: string[] = [];
      textContent.items.forEach((it: any) => {
        const str = it.str || "";
        if (str.trim()) {
          items.push(str.trim());
        }
      });
      // Exactly match the original logic: join by space + trailing space
      const pageText = textContent.items.map((it: any) => it.str || "").join(" ") + " ";
      
      pagesData.push({ pageNumber, text: pageText, items });
      return pageText;
    });
  }

  await pdfParse(buffer, {
    pagerender: renderPage
  });

  // Sort pages by pageNumber to guarantee correct order
  pagesData.sort((a, b) => a.pageNumber - b.pageNumber);

  const allItems: string[] = [];
  let allText = "";

  for (const page of pagesData) {
    allItems.push(...page.items);
    allText += page.text;
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
