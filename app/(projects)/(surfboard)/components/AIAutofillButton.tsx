"use client";

// app/(projects)/(surfboard)/components/AIAutofillButton.tsx
// AI-powered PDF autofill with client-side text extraction using pdf.js

import React, { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { Sparkles, Loader2, Check, AlertCircle } from "lucide-react";
import {
  extractSurveyPlanDataFromText,
  type AIExtractedData,
} from "../actions/aiExtractionActions";

// Declare pdf.js types
declare global {
  interface Window {
    pdfjsLib: any;
  }
}

interface AIAutofillButtonProps {
  pdfFiles: File[];
  onExtractedData: (data: AIExtractedData) => void;
  disabled?: boolean;
}

type ExtractionStatus =
  | "idle"
  | "extracting"
  | "processing"
  | "success"
  | "error";

export default function AIAutofillButton({
  pdfFiles,
  onExtractedData,
  disabled = false,
}: AIAutofillButtonProps) {
  const [status, setStatus] = useState<ExtractionStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [pdfJsLoaded, setPdfJsLoaded] = useState(false);

  // Load pdf.js library
  useEffect(() => {
    if (typeof window !== "undefined" && !window.pdfjsLib) {
      const script = document.createElement("script");
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      script.async = true;
      script.onload = () => {
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
          setPdfJsLoaded(true);
        }
      };
      script.onerror = () => {
        console.error("Failed to load pdf.js");
        toast.error("Failed to load PDF library");
      };
      document.head.appendChild(script);
    } else if (window.pdfjsLib) {
      setPdfJsLoaded(true);
    }
  }, []);

  /**
   * Extract text from PDF using pdf.js on the client side
   */
  const extractTextFromPdf = async (file: File): Promise<string> => {
    if (!window.pdfjsLib) {
      throw new Error("PDF library not loaded");
    }

    try {
      // Read file as array buffer
      const arrayBuffer = await file.arrayBuffer();

      // Load PDF document
      const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;

      let fullText = "";

      // Extract text from each page
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();

        // Combine text items
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(" ");

        fullText += pageText + "\n\n";
      }

      // Clean up the text
      fullText = fullText
        .replace(/\r/g, "\n")
        .replace(/\n\s*\n\s*\n/g, "\n\n")
        .replace(/[ \t]{2,}/g, " ")
        .trim();

      return fullText;
    } catch (error) {
      console.error("PDF extraction error:", error);
      throw new Error(
        "Failed to extract text from PDF. Please ensure it's a valid PDF file."
      );
    }
  };

  const handleAIExtraction = useCallback(async () => {
    if (pdfFiles.length === 0) {
      toast.error("Please upload a PDF file first");
      return;
    }

    if (!pdfJsLoaded) {
      toast.error(
        "PDF library is still loading. Please wait a moment and try again."
      );
      return;
    }

    const pdfFile = pdfFiles[0];

    try {
      setStatus("extracting");
      setErrorMessage("");

      toast.info("Extracting text from PDF...");

      // Extract text from PDF on client side
      const extractedText = await extractTextFromPdf(pdfFile);

      if (!extractedText || extractedText.length < 50) {
        throw new Error(
          "Could not extract sufficient text from PDF. It may be a scanned image or empty."
        );
      }

      setStatus("processing");
      toast.info("Sending to AI for analysis...");

      // Send extracted text to server for AI processing
      const result = await extractSurveyPlanDataFromText(extractedText);

      if (!result.success || !result.data) {
        throw new Error(result.error || "AI extraction failed");
      }

      // Success
      setStatus("success");
      onExtractedData(result.data);

      // Show success message with extracted fields summary
      const fieldsExtracted = [
        result.data.planNumber && "Plan Number",
        result.data.surveyTitle && "Survey Title",
        result.data.area && "Area",
        result.data.date && "Date",
        result.data.locality && "Locality",
        result.data.coordinates.length > 0 &&
          `${result.data.coordinates.length} Coordinates`,
      ].filter(Boolean);

      if (fieldsExtracted.length > 0) {
        toast.success(`AI extracted: ${fieldsExtracted.join(", ")}`);
      } else {
        toast.warning("AI could not extract any fields from this PDF.");
      }

      // Reset to idle after a short delay
      setTimeout(() => setStatus("idle"), 3000);
    } catch (error) {
      setStatus("error");
      const message =
        error instanceof Error ? error.message : "An unexpected error occurred";
      setErrorMessage(message);
      toast.error(message);

      // Reset to idle after showing error
      setTimeout(() => setStatus("idle"), 5000);
    }
  }, [pdfFiles, onExtractedData, pdfJsLoaded]);

  const getButtonContent = () => {
    switch (status) {
      case "extracting":
        return (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Extracting PDF...</span>
          </>
        );
      case "processing":
        return (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>AI Processing...</span>
          </>
        );
      case "success":
        return (
          <>
            <Check className="w-4 h-4" />
            <span>Data Extracted!</span>
          </>
        );
      case "error":
        return (
          <>
            <AlertCircle className="w-4 h-4" />
            <span>Try Again</span>
          </>
        );
      default:
        return (
          <>
            <Sparkles className="w-4 h-4" />
            <span>AI Autofill</span>
          </>
        );
    }
  };

  const getButtonStyles = () => {
    const baseStyles =
      "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2";

    switch (status) {
      case "success":
        return `${baseStyles} bg-emerald-500 text-white hover:bg-emerald-600 focus:ring-emerald-500`;
      case "error":
        return `${baseStyles} bg-red-500 text-white hover:bg-red-600 focus:ring-red-500`;
      case "extracting":
      case "processing":
        return `${baseStyles} bg-indigo-400 text-white cursor-not-allowed`;
      default:
        return `${baseStyles} bg-linear-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 focus:ring-indigo-500 shadow-md hover:shadow-lg`;
    }
  };

  const isProcessing = status === "extracting" || status === "processing";
  const hasNoPdf = pdfFiles.length === 0;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleAIExtraction}
        disabled={disabled || isProcessing || hasNoPdf || !pdfJsLoaded}
        className={`${getButtonStyles()} ${
          (disabled || hasNoPdf || !pdfJsLoaded) && status === "idle"
            ? "opacity-50 cursor-not-allowed"
            : ""
        }`}
        title={
          !pdfJsLoaded
            ? "Loading PDF library..."
            : hasNoPdf
            ? "Upload a PDF file first to enable AI autofill"
            : "Extract data from PDF using AI"
        }
      >
        {getButtonContent()}
      </button>

      {/* Hint text */}
      {status === "idle" && hasNoPdf && (
        <p className="text-xs text-gray-500">
          Upload a PDF file to enable AI autofill
        </p>
      )}

      {status === "idle" && !pdfJsLoaded && (
        <p className="text-xs text-gray-500">Loading PDF library...</p>
      )}

      {/* Error details */}
      {status === "error" && errorMessage && (
        <p className="text-xs text-red-500">{errorMessage}</p>
      )}
    </div>
  );
}

/**
 * Compact inline version for use next to file upload
 */
export function AIAutofillButtonCompact({
  pdfFiles,
  onExtractedData,
  disabled = false,
}: AIAutofillButtonProps) {
  const [status, setStatus] = useState<ExtractionStatus>("idle");
  const [pdfJsLoaded, setPdfJsLoaded] = useState(false);

  // Load pdf.js library
  useEffect(() => {
    if (typeof window !== "undefined" && !window.pdfjsLib) {
      const script = document.createElement("script");
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      script.async = true;
      script.onload = () => {
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
          setPdfJsLoaded(true);
        }
      };
      document.head.appendChild(script);
    } else if (window.pdfjsLib) {
      setPdfJsLoaded(true);
    }
  }, []);

  const extractTextFromPdf = async (file: File): Promise<string> => {
    if (!window.pdfjsLib) {
      throw new Error("PDF library not loaded");
    }

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    let fullText = "";
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(" ");
      fullText += pageText + "\n\n";
    }

    return fullText
      .replace(/\r/g, "\n")
      .replace(/\n\s*\n\s*\n/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim();
  };

  const handleAIExtraction = useCallback(async () => {
    if (pdfFiles.length === 0) {
      toast.error("Please upload a PDF file first");
      return;
    }

    if (!pdfJsLoaded) {
      toast.error("PDF library still loading...");
      return;
    }

    const pdfFile = pdfFiles[0];

    try {
      setStatus("extracting");
      const extractedText = await extractTextFromPdf(pdfFile);

      if (!extractedText || extractedText.length < 50) {
        throw new Error("Could not extract text from PDF");
      }

      setStatus("processing");
      const result = await extractSurveyPlanDataFromText(extractedText);

      if (!result.success || !result.data) {
        throw new Error(result.error || "AI extraction failed");
      }

      setStatus("success");
      onExtractedData(result.data);
      toast.success("AI autofill complete!");

      setTimeout(() => setStatus("idle"), 2000);
    } catch (error) {
      setStatus("error");
      toast.error(error instanceof Error ? error.message : "Extraction failed");
      setTimeout(() => setStatus("idle"), 3000);
    }
  }, [pdfFiles, onExtractedData, pdfJsLoaded]);

  const isProcessing = status === "extracting" || status === "processing";

  return (
    <button
      type="button"
      onClick={handleAIExtraction}
      disabled={
        disabled || isProcessing || pdfFiles.length === 0 || !pdfJsLoaded
      }
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
        status === "success"
          ? "bg-emerald-100 text-emerald-700"
          : status === "error"
          ? "bg-red-100 text-red-700"
          : isProcessing
          ? "bg-indigo-100 text-indigo-600"
          : "bg-linear-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600 shadow-sm hover:shadow"
      } disabled:opacity-50 disabled:cursor-not-allowed`}
      title="Extract data from PDF using AI"
    >
      {isProcessing ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : status === "success" ? (
        <Check className="w-3.5 h-3.5" />
      ) : (
        <Sparkles className="w-3.5 h-3.5" />
      )}
      <span>
        {status === "extracting"
          ? "Extracting..."
          : status === "processing"
          ? "Processing..."
          : status === "success"
          ? "Done"
          : "AI Autofill"}
      </span>
    </button>
  );
}

// Re-export the type for use in other components
export type { AIExtractedData };

// "use client";

// // app/(projects)/(surfboard)/components/AIAutofillButton.tsx
// // AI-powered PDF autofill component for survey plans
// // All processing happens server-side for security

// import React, { useState, useCallback } from "react";
// import { toast } from "sonner";
// import { Sparkles, Loader2, Check, AlertCircle } from "lucide-react";
// import {
//   extractSurveyPlanDataFromPdf,
//   type AIExtractedData,
// } from "../actions/aiExtractionActions";

// interface AIAutofillButtonProps {
//   pdfFiles: File[];
//   onExtractedData: (data: AIExtractedData) => void;
//   disabled?: boolean;
// }

// type ExtractionStatus = "idle" | "processing" | "success" | "error";

// export default function AIAutofillButton({
//   pdfFiles,
//   onExtractedData,
//   disabled = false,
// }: AIAutofillButtonProps) {
//   const [status, setStatus] = useState<ExtractionStatus>("idle");
//   const [errorMessage, setErrorMessage] = useState<string>("");

//   const handleAIExtraction = useCallback(async () => {
//     if (pdfFiles.length === 0) {
//       toast.error("Please upload a PDF file first");
//       return;
//     }

//     // Use the first PDF file
//     const pdfFile = pdfFiles[0];

//     try {
//       setStatus("processing");
//       setErrorMessage("");

//       toast.info("Sending PDF to AI for analysis...");

//       // Create FormData and send to server
//       const formData = new FormData();
//       formData.append("pdf", pdfFile);

//       const result = await extractSurveyPlanDataFromPdf(formData);

//       if (!result.success || !result.data) {
//         throw new Error(result.error || "AI extraction failed");
//       }

//       // Success
//       setStatus("success");
//       onExtractedData(result.data);

//       // Show success message with extracted fields summary
//       const fieldsExtracted = [
//         result.data.planNumber && "Plan Number",
//         result.data.surveyTitle && "Survey Title",
//         result.data.area && "Area",
//         result.data.date && "Date",
//         result.data.locality && "Locality",
//         result.data.coordinates.length > 0 &&
//           `${result.data.coordinates.length} Coordinates`,
//       ].filter(Boolean);

//       if (fieldsExtracted.length > 0) {
//         toast.success(`AI extracted: ${fieldsExtracted.join(", ")}`);
//       } else {
//         toast.warning("AI could not extract any fields from this PDF.");
//       }

//       // Reset to idle after a short delay
//       setTimeout(() => setStatus("idle"), 3000);
//     } catch (error) {
//       setStatus("error");
//       const message =
//         error instanceof Error ? error.message : "An unexpected error occurred";
//       setErrorMessage(message);
//       toast.error(message);

//       // Reset to idle after showing error
//       setTimeout(() => setStatus("idle"), 5000);
//     }
//   }, [pdfFiles, onExtractedData]);

//   const getButtonContent = () => {
//     switch (status) {
//       case "processing":
//         return (
//           <>
//             <Loader2 className="w-4 h-4 animate-spin" />
//             <span>AI Processing...</span>
//           </>
//         );
//       case "success":
//         return (
//           <>
//             <Check className="w-4 h-4" />
//             <span>Data Extracted!</span>
//           </>
//         );
//       case "error":
//         return (
//           <>
//             <AlertCircle className="w-4 h-4" />
//             <span>Try Again</span>
//           </>
//         );
//       default:
//         return (
//           <>
//             <Sparkles className="w-4 h-4" />
//             <span>AI Autofill</span>
//           </>
//         );
//     }
//   };

//   const getButtonStyles = () => {
//     const baseStyles =
//       "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2";

//     switch (status) {
//       case "success":
//         return `${baseStyles} bg-emerald-500 text-white hover:bg-emerald-600 focus:ring-emerald-500`;
//       case "error":
//         return `${baseStyles} bg-red-500 text-white hover:bg-red-600 focus:ring-red-500`;
//       case "processing":
//         return `${baseStyles} bg-indigo-400 text-white cursor-not-allowed`;
//       default:
//         return `${baseStyles} bg-linear-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 focus:ring-indigo-500 shadow-md hover:shadow-lg`;
//     }
//   };

//   const isProcessing = status === "processing";
//   const hasNoPdf = pdfFiles.length === 0;

//   return (
//     <div className="space-y-2">
//       <button
//         type="button"
//         onClick={handleAIExtraction}
//         disabled={disabled || isProcessing || hasNoPdf}
//         className={`${getButtonStyles()} ${
//           (disabled || hasNoPdf) && status === "idle"
//             ? "opacity-50 cursor-not-allowed"
//             : ""
//         }`}
//         title={
//           hasNoPdf
//             ? "Upload a PDF file first to enable AI autofill"
//             : "Extract data from PDF using AI"
//         }
//       >
//         {getButtonContent()}
//       </button>

//       {/* Hint text */}
//       {status === "idle" && hasNoPdf && (
//         <p className="text-xs text-gray-500">
//           Upload a PDF file to enable AI autofill
//         </p>
//       )}

//       {/* Error details */}
//       {status === "error" && errorMessage && (
//         <p className="text-xs text-red-500">{errorMessage}</p>
//       )}
//     </div>
//   );
// }

// /**
//  * Compact inline version for use next to file upload
//  */
// export function AIAutofillButtonCompact({
//   pdfFiles,
//   onExtractedData,
//   disabled = false,
// }: AIAutofillButtonProps) {
//   const [status, setStatus] = useState<ExtractionStatus>("idle");

//   const handleAIExtraction = useCallback(async () => {
//     if (pdfFiles.length === 0) {
//       toast.error("Please upload a PDF file first");
//       return;
//     }

//     const pdfFile = pdfFiles[0];

//     try {
//       setStatus("processing");

//       // Create FormData and send to server (fully server-side processing)
//       const formData = new FormData();
//       formData.append("pdf", pdfFile);

//       const result = await extractSurveyPlanDataFromPdf(formData);

//       if (!result.success || !result.data) {
//         throw new Error(result.error || "AI extraction failed");
//       }

//       setStatus("success");
//       onExtractedData(result.data);
//       toast.success("AI autofill complete!");

//       setTimeout(() => setStatus("idle"), 2000);
//     } catch (error) {
//       setStatus("error");
//       toast.error(error instanceof Error ? error.message : "Extraction failed");
//       setTimeout(() => setStatus("idle"), 3000);
//     }
//   }, [pdfFiles, onExtractedData]);

//   const isProcessing = status === "processing";

//   return (
//     <button
//       type="button"
//       onClick={handleAIExtraction}
//       disabled={disabled || isProcessing || pdfFiles.length === 0}
//       className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
//         status === "success"
//           ? "bg-emerald-100 text-emerald-700"
//           : status === "error"
//           ? "bg-red-100 text-red-700"
//           : isProcessing
//           ? "bg-indigo-100 text-indigo-600"
//           : "bg-linear-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600 shadow-sm hover:shadow"
//       } disabled:opacity-50 disabled:cursor-not-allowed`}
//       title="Extract data from PDF using AI"
//     >
//       {isProcessing ? (
//         <Loader2 className="w-3.5 h-3.5 animate-spin" />
//       ) : status === "success" ? (
//         <Check className="w-3.5 h-3.5" />
//       ) : (
//         <Sparkles className="w-3.5 h-3.5" />
//       )}
//       <span>
//         {isProcessing
//           ? "Processing..."
//           : status === "success"
//           ? "Done"
//           : "AI Autofill"}
//       </span>
//     </button>
//   );
// }

// // Re-export the type for use in other components
// export type { AIExtractedData };
