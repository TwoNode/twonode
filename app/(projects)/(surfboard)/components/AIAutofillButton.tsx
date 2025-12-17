"use client";

// app/(projects)/(surfboard)/components/AIAutofillButton.tsx
// AI-powered PDF autofill component for survey plans
// All processing happens server-side for security

import React, { useState, useCallback } from "react";
import { toast } from "sonner";
import { Sparkles, Loader2, Check, AlertCircle } from "lucide-react";
import {
  extractSurveyPlanDataFromPdf,
  type AIExtractedData,
} from "../actions/aiExtractionActions";

interface AIAutofillButtonProps {
  pdfFiles: File[];
  onExtractedData: (data: AIExtractedData) => void;
  disabled?: boolean;
}

type ExtractionStatus = "idle" | "processing" | "success" | "error";

export default function AIAutofillButton({
  pdfFiles,
  onExtractedData,
  disabled = false,
}: AIAutofillButtonProps) {
  const [status, setStatus] = useState<ExtractionStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const handleAIExtraction = useCallback(async () => {
    if (pdfFiles.length === 0) {
      toast.error("Please upload a PDF file first");
      return;
    }

    // Use the first PDF file
    const pdfFile = pdfFiles[0];

    try {
      setStatus("processing");
      setErrorMessage("");

      toast.info("Sending PDF to AI for analysis...");

      // Create FormData and send to server
      const formData = new FormData();
      formData.append("pdf", pdfFile);

      const result = await extractSurveyPlanDataFromPdf(formData);

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
  }, [pdfFiles, onExtractedData]);

  const getButtonContent = () => {
    switch (status) {
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
      case "processing":
        return `${baseStyles} bg-indigo-400 text-white cursor-not-allowed`;
      default:
        return `${baseStyles} bg-linear-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 focus:ring-indigo-500 shadow-md hover:shadow-lg`;
    }
  };

  const isProcessing = status === "processing";
  const hasNoPdf = pdfFiles.length === 0;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleAIExtraction}
        disabled={disabled || isProcessing || hasNoPdf}
        className={`${getButtonStyles()} ${
          (disabled || hasNoPdf) && status === "idle"
            ? "opacity-50 cursor-not-allowed"
            : ""
        }`}
        title={
          hasNoPdf
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

  const handleAIExtraction = useCallback(async () => {
    if (pdfFiles.length === 0) {
      toast.error("Please upload a PDF file first");
      return;
    }

    const pdfFile = pdfFiles[0];

    try {
      setStatus("processing");

      // Create FormData and send to server (fully server-side processing)
      const formData = new FormData();
      formData.append("pdf", pdfFile);

      const result = await extractSurveyPlanDataFromPdf(formData);

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
  }, [pdfFiles, onExtractedData]);

  const isProcessing = status === "processing";

  return (
    <button
      type="button"
      onClick={handleAIExtraction}
      disabled={disabled || isProcessing || pdfFiles.length === 0}
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
        {isProcessing
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
