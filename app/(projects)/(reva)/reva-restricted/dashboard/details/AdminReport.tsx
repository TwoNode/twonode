"use client";

import { AdminReportUpload } from "./AdminReportUpload";
import { AdminDirectLinkUpload } from "./AdminDirectLinkUpload";
import { AdminMiniHeader } from "../../components/AdminMiniHeader";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { revaApi } from "@/reva/apiClient";

const AdminReport = ({ property, user = {} }: { property: any; user: any }) => {
  const [mode, setMode] = useState<"form" | "file">("form");
  // The requester's own role comes in via `user` (undefined for one-time/guest
  // requests, or the property owner's role for regular requests) — neither is
  // the viewing admin, so the Approve/Disapprove button below is gated on
  // this instead: who's actually logged in and looking at this page.
  const [viewerRole, setViewerRole] = useState<string | null>(null);

  useEffect(() => {
    if (property?.report?.directFileLink) {
      setMode("file");
    }
  }, [property]);

  useEffect(() => {
    (async () => {
      const me = await revaApi.auth.me();
      // /api/v1/auth/me lowercases role; the Prisma enum (and the rest of
      // this admin panel) compares against the uppercase form.
      if (me.success) setViewerRole(me.data.role.toUpperCase());
    })();
  }, []);

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
        <AdminDirectLinkUpload property={property} user={user} viewerRole={viewerRole} />
      ) : (
        <AdminReportUpload property={property} user={user} viewerRole={viewerRole} />
      )}
    </div>
  );
};

export default AdminReport;
