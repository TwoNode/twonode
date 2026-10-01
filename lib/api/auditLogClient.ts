import type { AuditLogApi, AuditLogQuery } from "@/lib/api/auditLogTypes";

/**
 * Client for a product's `<base>/admin/audit-logs` endpoints (see
 * lib/api/auditLogRoutes.ts). Read-only same-origin GETs, so the session
 * cookie rides along and there is no CSRF header to add.
 */
export function createAuditLogApi(base: string): AuditLogApi {
  return {
    list: async (query: AuditLogQuery = {}) => {
      const qs = new URLSearchParams();
      if (query.page) qs.set("page", String(query.page));
      if (query.pageSize) qs.set("pageSize", String(query.pageSize));
      if (query.action) qs.set("action", query.action);
      if (query.entity) qs.set("entity", query.entity);
      if (query.userId) qs.set("userId", query.userId);
      if (query.search) qs.set("search", query.search);
      if (query.startDate) qs.set("startDate", query.startDate.toISOString());
      if (query.endDate) qs.set("endDate", query.endDate.toISOString());
      return (await fetch(`${base}?${qs.toString()}`)).json();
    },

    filters: async () => (await fetch(`${base}/filters`)).json(),
  };
}
