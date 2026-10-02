import type { ApiResult } from "@/lib/api/types";

/** One audit row as the viewer shows it — the same shape for every product's log table. */
export interface AuditLogEntry {
  id: string;
  userId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  /** JSON string written by `writeAudit` / Surfboard's `logAuditAction`. */
  changes: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  /** Who performed the action; null when the account was deleted or the action was system-initiated. */
  user: { firstName: string; lastName: string; email: string } | null;
}

export interface AuditLogQuery {
  page?: number;
  pageSize?: number;
  action?: string;
  entity?: string;
  userId?: string;
  search?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface AuditLogPage {
  data: AuditLogEntry[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface AuditLogFilterOptions {
  actions: string[];
  entities: string[];
}

/** What <AuditLogViewer> needs from a product's API client. */
export interface AuditLogApi {
  list: (query?: AuditLogQuery) => Promise<ApiResult<AuditLogPage>>;
  filters: () => Promise<ApiResult<AuditLogFilterOptions>>;
}
