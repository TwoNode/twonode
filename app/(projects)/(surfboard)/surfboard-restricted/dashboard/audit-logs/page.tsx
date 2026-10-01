"use client";

import { AuditLogViewer } from "@/components/admin/AuditLogViewer";
import { surfboardApi } from "@/surfboard/apiClient";

export default function AuditLogsPage() {
  return <AuditLogViewer api={surfboardApi.admin.auditLogs} viewModeKey="audit-logs" />;
}
