"use client";

import React from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Loader2, Download, XCircle } from "lucide-react";
import { RedCopySubmissionPDF } from "./RedCopySubmissionPDF";

// We have to use require/dynamic for PDFDownloadLink to avoid SSR issues
const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
  { ssr: false }
);

interface Props {
  batchCode: string;
  pdfData: any; // We use 'any' here or import the type specifically if needed, to avoid evaluating the module on server
}

export default function DownloadSubmissionLetterBtn({ batchCode, pdfData }: Props) {
  return (
    <PDFDownloadLink
      document={<RedCopySubmissionPDF data={pdfData} />}
      fileName={`RedCopy_Submission_${batchCode}.pdf`}
    >
      {({ loading, error }: { loading: boolean; error: Error | null }) => (
        <Button
          size="sm"
          variant="outline"
          disabled={loading}
          className="border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400 shadow-sm hover:shadow-md transition-all duration-200 font-semibold"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : error ? (
            <>
              <XCircle className="w-4 h-4 mr-2" />
              Error
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Download Letter
            </>
          )}
        </Button>
      )}
    </PDFDownloadLink>
  );
}
