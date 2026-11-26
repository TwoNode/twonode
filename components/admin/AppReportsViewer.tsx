"use client";

import { Bug, Filter, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useServerList } from "@/hooks/useServerList";
import { Pagination } from "@/components/ui/pagination";
import { PageLoader } from "@/components/ui/spinner";
import { surfboardApi } from "@/surfboard/apiClient";
import type {
  AppReportEntry,
  AppReportFilterOptions,
} from "@/lib/diagnostics/appReportTypes";
import { APP_REPORT_LIMITS } from "@/lib/diagnostics/appReportTypes";

interface Filters {
  kind: string;
  platform: string;
  appVersion: string;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const KIND_LABEL: Record<string, string> = {
  "unexpected-close": "Closed unexpectedly",
  "caught-error": "Caught error",
};

const select =
  "w-full px-3 py-2 border border-gray-300 dark:border-white/15 rounded-lg bg-white dark:bg-surface text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
const th =
  "px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider";

/**
 * Superadmin's read-only list of the crash reports the Surfboard app posted (ADR-0014 / TASK-0016).
 * Everything in a report is text the phone sent: it is only ever rendered as plain text by React,
 * never as HTML. No account is shown because none is stored with a report.
 */
export function AppReportsViewer() {
  const [options, setOptions] = useState<AppReportFilterOptions | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const {
    items: reports,
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
  } = useServerList<AppReportEntry, Filters>(
    async ({ page, pageSize, search, filters }) =>
      surfboardApi.admin.appReports.list({
        page,
        pageSize,
        search: search || undefined,
        kind: filters.kind || undefined,
        platform: filters.platform || undefined,
        appVersion: filters.appVersion || undefined,
      }),
    { initialFilters: { kind: "", platform: "", appVersion: "" } }
  );

  useEffect(() => {
    surfboardApi.admin.appReports.filters().then((result) => {
      if (result.success) setOptions(result.data);
    });
  }, []);

  const setFilter = (key: keyof Filters, value: string) =>
    setFilters((f) => ({ ...f, [key]: value }));

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Bug className="w-8 h-8 text-blue-600 shrink-0" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              App Reports
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {total} crash reports from the Surfboard app, kept{" "}
              {APP_REPORT_LIMITS.keepDays} days. No account is stored with a
              report.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="shrink-0 flex items-center gap-2 px-4 py-2 bg-white dark:bg-surface border border-gray-300 dark:border-white/15 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
        >
          <Filter className="w-4 h-4" />
          {showFilters ? "Hide Filters" : "Show Filters"}
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by screen or error text…"
          className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-white/15 rounded-lg bg-white dark:bg-surface text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {showFilters && (
        <div className="bg-white dark:bg-surface p-4 rounded-lg border border-gray-200 dark:border-white/10 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              <span className="block mb-2">Kind</span>
              <select
                value={filters.kind}
                onChange={(e) => setFilter("kind", e.target.value)}
                className={select}
              >
                <option value="">All kinds</option>
                {(options?.kinds ?? []).map((kind) => (
                  <option key={kind} value={kind}>
                    {KIND_LABEL[kind] ?? kind}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              <span className="block mb-2">Platform</span>
              <select
                value={filters.platform}
                onChange={(e) => setFilter("platform", e.target.value)}
                className={select}
              >
                <option value="">Both</option>
                {(options?.platforms ?? []).map((platform) => (
                  <option key={platform} value={platform}>
                    {platform === "ios" ? "iPhone" : "Android"}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              <span className="block mb-2">App version</span>
              <select
                value={filters.appVersion}
                onChange={(e) => setFilter("appVersion", e.target.value)}
                className={select}
              >
                <option value="">All versions</option>
                {(options?.appVersions ?? []).map((version) => (
                  <option key={version} value={version}>
                    {version}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      )}

      {loading && <PageLoader label="Loading app reports…" />}

      {!loading && (
        <div className="bg-white dark:bg-surface rounded-lg border border-gray-200 dark:border-white/10 overflow-hidden">
          {reports.length === 0 ? (
            <div className="p-12 text-center text-gray-500 dark:text-gray-400">
              No app reports found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
                  <tr>
                    <th className={th}>Received</th>
                    <th className={th}>Kind</th>
                    <th className={th}>App</th>
                    <th className={th}>Screen</th>
                    <th className={th}>Error</th>
                    <th className={th}>Trail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                  {reports.map((report) => (
                    <tr
                      key={report.id}
                      className="align-top hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                        {formatDate(report.receivedAt)}
                        <span className="block text-xs text-gray-500 dark:text-gray-400">
                          happened {formatDate(report.occurredAt)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-500/15 text-blue-800 dark:text-blue-300 rounded-md text-xs font-medium whitespace-nowrap">
                          {KIND_LABEL[report.kind] ?? report.kind}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                        {report.platform === "ios" ? "iPhone" : "Android"}{" "}
                        {report.osVersion ?? ""}
                        <span className="block text-xs text-gray-500 dark:text-gray-400">
                          app {report.appVersion}
                          {report.memoryWarnings
                            ? `, ${report.memoryWarnings} low-memory warnings`
                            : ""}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {report.screen || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {report.errorName || report.errorMessage ? (
                          <>
                            <span className="font-medium">
                              {report.errorName}
                            </span>
                            {report.fatal ? " (fatal)" : ""}
                            <span className="block text-xs text-gray-500 dark:text-gray-400 break-words">
                              {report.errorMessage}
                            </span>
                          </>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">
                            none (the phone closed it)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {report.trail.length === 0 ? (
                          <span className="text-gray-400 dark:text-gray-500">
                            —
                          </span>
                        ) : (
                          <details className="cursor-pointer">
                            <summary className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
                              {report.trail.length} steps
                            </summary>
                            <pre className="mt-2 p-2 bg-gray-50 dark:bg-white/5 rounded text-xs overflow-x-auto whitespace-pre-wrap">
                              {report.trail.join("\n")}
                            </pre>
                          </details>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!loading && totalPages > 1 && reports.length > 0 && (
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Page {page} of {totalPages} • {total} reports
          </p>
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}
    </div>
  );
}
