import axios from "axios";
/**
 * Extract text from a PDF buffer using pdf-parse
 */
async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  const pdfParse = require("pdf-parse/lib/pdf-parse.js");
  const data = await pdfParse(buffer);
  return data.text;
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
