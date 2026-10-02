"use client";

import React from "react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { Button } from "@/components/ui/button";
import { RevaReportPDF } from "./RevaReportPDF";
import { RevaReceiptPDF } from "./RevaReceiptPDF";

interface PDFDownloadButtonProps {
  property: any;
  type: "report" | "receipt";
  disabled?: boolean;
  className?: string;
}

export function PDFDownloadButton({
  property,
  type,
  disabled = false,
  className = "",
}: PDFDownloadButtonProps) {
  const fileName =
    type === "report"
      ? `REVA_Report_${property?.reference || "document"}.pdf`
      : `REVA_Receipt_${property?.reference || "document"}.pdf`;

  const buttonText = type === "report" ? "Download Report" : "Download Receipt";

  const icon =
    type === "report" ? (
      <svg
        className="w-4 h-4 mr-2"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ) : (
      <svg
        className="w-4 h-4 mr-2"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    );

  if (disabled) {
    return (
      <Button
        disabled
        className={`px-6 py-2 rounded-lg transition-colors bg-gray-300 text-gray-500 cursor-not-allowed ${className}`}
      >
        <svg
          className="w-4 h-4 mr-2 animate-spin"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        Processing...
      </Button>
    );
  }

  return (
    <PDFDownloadLink
      document={
        type === "report" ? (
          <RevaReportPDF property={property} />
        ) : (
          <RevaReceiptPDF property={property} />
        )
      }
      fileName={fileName}
    >
      {({ blob, url, loading, error }) => (
        <Button
          disabled={loading}
          className={`px-6 py-2 rounded-lg transition-colors ${
            loading
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : type === "report"
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
          } ${className}`}
        >
          {loading ? (
            <>
              <svg
                className="w-4 h-4 mr-2 animate-spin"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Generating...
            </>
          ) : error ? (
            <>
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Error
            </>
          ) : (
            <>
              {icon}
              {buttonText}
            </>
          )}
        </Button>
      )}
    </PDFDownloadLink>
  );
}
