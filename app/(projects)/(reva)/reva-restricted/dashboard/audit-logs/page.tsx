"use client";

import { AuditLogViewer } from "@/components/admin/AuditLogViewer";
import { revaApi } from "@/reva/apiClient";

export default function AuditLogsPage() {
  return <AuditLogViewer api={revaApi.admin.auditLogs} viewModeKey="reva-audit-logs" />;
}
