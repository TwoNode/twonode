"use client";

import { AuditLogViewer } from "@/components/admin/AuditLogViewer";
import { gbcApi } from "@/gbc/apiClient";

export default function AuditLogsPage() {
  return <AuditLogViewer api={gbcApi.auditLogs} viewModeKey="gbc-audit-logs" />;
}
