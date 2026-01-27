import axios from "axios";

// Polyfill for DOMMatrix in Node.js environment (required by pdf-parse/pdf.js)
if (typeof (global as any).DOMMatrix === "undefined") {
    (global as any).DOMMatrix = class DOMMatrix {
        a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
        constructor() { }
        // Methods potentially needed by pdf.js geometry content
        translate() { return this; }
        scale() { return this; }
        rotate() { return this; }
        multiply() { return this; }
        transformPoint(p: any) { return p; }
    };
}

const pdf = require("pdf-parse");

/**
 * Fetch content from a URL and extract text
 * Supports both PDF and HTML content types
 */
export async function fetchAndExtractTextFromUrl(
    url: string
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
            // It's a PDF
            const pdfData = await pdf(buffer);
            text = pdfData.text;
        } else {
            // Assume HTML or plain text
            // Convert buffer to string
            const rawText = buffer.toString("utf-8");
            // Basic HTML tag stripping
            text = rawText.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
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
