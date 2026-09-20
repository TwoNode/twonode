"use client";

import { FileText, Filter, Search } from "lucide-react";
import { useState, useEffect } from "react";
import { useServerList } from "@/hooks/useServerList";
import { Pagination } from "@/components/ui/pagination";
import { ViewToggle } from "@/components/ui/view-toggle";
import { useViewMode } from "@/hooks/useViewMode";
import { PageLoader } from "@/components/ui/spinner";
import type { AuditLogApi, AuditLogEntry } from "@/lib/api/auditLogTypes";

interface AuditLogFilters {
  action: string;
  entity: string;
}

/** No actor row to show: either nobody (a system action) or an account that has since been deleted. */
const unknownActor = (log: AuditLogEntry) =>
  log.userId ? `Deleted account (${log.userId.substring(0, 8)}…)` : "System";

/**
 * Superadmin's read-only view of a product's audit log (who did what, to
 * which record, from which IP). The product's page just passes its API client.
 */
export function AuditLogViewer({ api, viewModeKey }: { api: AuditLogApi; viewModeKey: string }) {
  const [actions, setActions] = useState<string[]>([]);
  const [entities, setEntities] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useViewMode(viewModeKey, "list");

  const {
    items: logs,
    total,
    totalPages,
    loading,
    page,
    setPage,
    pageSize,
    setPageSize,
    search,
    setSearch,
    filters,
    setFilters,
  } = useServerList<AuditLogEntry, AuditLogFilters>(
    async ({ page, pageSize, search, filters }) =>
      api.list({
        page,
        pageSize,
        search: search || undefined,
        action: filters.action || undefined,
        entity: filters.entity || undefined,
      }),
    { initialFilters: { action: "", entity: "" } }
  );

  const actionFilter = filters.action;
  const entityFilter = filters.entity;
  const setActionFilter = (action: string) => setFilters((f) => ({ ...f, action }));
  const setEntityFilter = (entity: string) => setFilters((f) => ({ ...f, entity }));

  useEffect(() => {
    async function fetchFilterOptions() {
      const result = await api.filters();
      if (result.success) {
        setActions(result.data.actions);
        setEntities(result.data.entities);
      }
    }
    fetchFilterOptions();
  }, []);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatChanges = (changes: string | null) => {
    if (!changes) return null;
    try {
      const parsed = JSON.parse(changes);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return changes;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <FileText className="w-8 h-8 text-blue-600 shrink-0" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Logs</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">{total} total entries</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="shrink-0 flex items-center gap-2 px-4 py-2 bg-white dark:bg-surface border border-gray-300 dark:border-white/15 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          >
            <Filter className="w-4 h-4" />
            {showFilters ? "Hide Filters" : "Show Filters"}
          </button>
          <ViewToggle value={viewMode} onChange={setViewMode} />
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by user, entity ID, or IP address…"
          className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-white/15 rounded-lg bg-white dark:bg-surface text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white dark:bg-surface p-4 rounded-lg border border-gray-200 dark:border-white/10 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Action
              </label>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-white/15 rounded-lg bg-white dark:bg-surface text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Actions</option>
                {actions.map((action) => (
                  <option key={action} value={action}>
                    {action}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Entity
              </label>
              <select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-white/15 rounded-lg bg-white dark:bg-surface text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Entities</option>
                {entities.map((entity) => (
                  <option key={entity} value={entity}>
                    {entity}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {loading && <PageLoader label="Loading audit logs…" />}

      {!loading && viewMode === "grid" && (
        <div className="space-y-4">
          {logs.length === 0 ? (
            <div className="bg-white dark:bg-surface rounded-lg border border-gray-200 dark:border-white/10 p-12 text-center text-gray-500 dark:text-gray-400">
              No audit logs found
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex flex-col gap-2 bg-white dark:bg-surface rounded-lg border border-gray-200 dark:border-white/10 p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-500/15 text-blue-800 dark:text-blue-300 rounded-md text-xs font-medium">
                      {log.action}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {formatDate(log.createdAt)}
                    </span>
                  </div>

                  <div className="text-sm text-gray-900 dark:text-white">
                    {log.user ? (
                      <>
                        <span className="font-medium">
                          {log.user.firstName} {log.user.lastName}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 block">{log.user.email}</span>
                      </>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">{unknownActor(log)}</span>
                    )}
                  </div>

                  <div className="text-sm text-gray-900 dark:text-white">
                    {log.entity}
                    {log.entityId && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                        ({log.entityId.substring(0, 8)}…)
                      </span>
                    )}
                  </div>

                  {log.changes && (
                    <details className="cursor-pointer text-sm">
                      <summary className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
                        View changes
                      </summary>
                      <pre className="mt-2 p-2 bg-gray-50 dark:bg-white/5 rounded text-xs overflow-x-auto">
                        {formatChanges(log.changes)}
                      </pre>
                    </details>
                  )}

                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-auto pt-2 border-t border-gray-100 dark:border-white/10">
                    IP: {log.ipAddress || "—"}
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && logs.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Page {page} of {totalPages} • {total} entries
              </p>
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} pageSize={pageSize} onPageSizeChange={setPageSize} />
            </div>
          )}
        </div>
      )}

      {/* Logs Table */}
      {!loading && viewMode === "list" && (
        <div className="bg-white dark:bg-surface rounded-lg border border-gray-200 dark:border-white/10 overflow-hidden">
          {logs.length === 0 ? (
            <div className="p-12 text-center text-gray-500 dark:text-gray-400">
              No audit logs found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Entity
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Changes
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      IP Address
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {log.user ? (
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {log.user.firstName} {log.user.lastName}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {log.user.email}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">{unknownActor(log)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-500/15 text-blue-800 dark:text-blue-300 rounded-md text-xs font-medium">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {log.entity}
                        {log.entityId && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            ID: {log.entityId.substring(0, 8)}...
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {log.changes ? (
                          <details className="cursor-pointer">
                            <summary className="text-blue-600 hover:text-blue-800">
                              {" "}
                              View changes
                            </summary>
                            <pre className="mt-2 p-2 bg-gray-50 dark:bg-white/5 rounded text-xs overflow-x-auto max-w-md">
                              {formatChanges(log.changes)}
                            </pre>
                          </details>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {log.ipAddress || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && logs.length > 0 && (
            <div className="px-4 py-4 border-t border-gray-200 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Page {page} of {totalPages} • {total} entries
              </p>
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} pageSize={pageSize} onPageSizeChange={setPageSize} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
