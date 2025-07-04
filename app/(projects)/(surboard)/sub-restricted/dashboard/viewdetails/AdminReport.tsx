"use client";

import { AdminReportUpload } from "./AdminReportUpload";
import { AdminDirectLinkUpload } from "./AdminDirectLinkUpload";
import { AdminMiniHeader } from "../../components/AdminMiniHeader";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const AdminReport = ({ property, user = {} }: { property: any; user: any }) => {
  const [mode, setMode] = useState<"form" | "file">("form");

  useEffect(() => {
    if (property?.report?.directFileLink) {
      setMode("file");
    }
  }, [property]);

  return (
    <div className="space-y-6">
      <AdminMiniHeader
        title={
          mode === "file"
            ? "Admin Direct File Report Upload"
            : "Admin Report Upload"
        }
      />

      <div className="flex items-center gap-4 px-6">
        <span className="text-sm font-medium">Choose Upload Mode:</span>
        <Button
          variant={mode === "form" ? "default" : "outline"}
          onClick={() => setMode("form")}
        >
          Detailed Form
        </Button>
        <Button
          variant={mode === "file" ? "default" : "outline"}
          onClick={() => setMode("file")}
        >
          Direct File
        </Button>
      </div>

      {mode === "file" ? (
        <AdminDirectLinkUpload property={property} user={user} />
      ) : (
        <AdminReportUpload property={property} user={user} />
      )}
    </div>
  );
};

export default AdminReport;
