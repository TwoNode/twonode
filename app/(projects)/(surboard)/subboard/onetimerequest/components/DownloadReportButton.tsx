"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { downloadOneTimeRequestReport } from "@/app/(projects)/reva/actions/dbActions";
import { toast } from "sonner";

interface DownloadReportButtonProps {
  reference: string;
  email: string;
}

const DownloadReportButton: React.FC<DownloadReportButtonProps> = ({
  reference,
  email,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleDownload = async () => {
    setIsLoading(true);
    try {
      const result = await downloadOneTimeRequestReport(reference, email);

      if (!result.success) {
        toast.error(result.error || "Failed to download report");
        return;
      }

      if (result.data?.type === "redirect" && result.data?.redirectUrl) {
        // Redirect to the direct file link
        window.open(result.data.redirectUrl, "_blank");
        toast.success("Report download started");
      } else if (result.data?.type === "data") {
        // Handle data download (could be JSON or generate PDF)
        const reportData = result.data;

        // Create a downloadable JSON file
        const blob = new Blob([JSON.stringify(reportData, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `report-${reference}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success("Report downloaded successfully");
      }
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download report");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button onClick={handleDownload} disabled={isLoading}>
      {isLoading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Download className="h-4 w-4 mr-2" />
      )}
      Download Report
    </Button>
  );
};

export default DownloadReportButton;
