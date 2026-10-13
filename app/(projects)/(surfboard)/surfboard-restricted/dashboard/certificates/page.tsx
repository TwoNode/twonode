"use client";

import { MediaLink } from "@/components/media";
import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  Download,
  Eye,
  Search,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { surfboardApi } from "@/surfboard/apiClient";
import { useServerList } from "@/hooks/useServerList";
import { Pagination } from "@/components/ui/pagination";
import { ViewToggle } from "@/components/ui/view-toggle";
import { useViewMode } from "@/hooks/useViewMode";
import { PageLoader } from "@/components/ui/spinner";

interface CertificateBatch {
  id: string;
  batchCode: string;
  planCount: number;
  totalAmount: number;
  paymentStatus: string;
  submitter: {
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  userPaymentDate?: Date | null;
  lasgReceiptUrl?: string | null;
  accountsApprovedAt?: Date | null;
  createdAt: Date;
}

interface BatchStatsAll {
  total: number;
  pendingUserPayment: number;
  lasgPaid: number;
  accountsApproved: number;
  accountsDisapproved: number;
  completed: number;
}

interface CertificateFilters {
  status: string;
}

export default function CertificatesPage() {
  const [stats, setStats] = useState<BatchStatsAll | null>(null);
  const [viewMode, setViewMode] = useViewMode("certificates", "list");

  const {
    items: batches,
    total,
    totalPages,
    loading,
    page,
    setPage,
    pageSize,
    setPageSize,
    search: searchTerm,
    setSearch: setSearchTerm,
    filters,
    setFilters,
    reload,
  } = useServerList<CertificateBatch, CertificateFilters>(
    async ({ page, pageSize, search, filters }) =>
      surfboardApi.cod.batches.listPaginated({
        page,
        pageSize,
        search: search || undefined,
        status: filters.status !== "ALL" ? filters.status : undefined,
      }),
    { initialFilters: { status: "ALL" } }
  );

  const statusFilter = filters.status;
  const setStatusFilter = (status: string) => setFilters({ status });

  const loadStats = async () => {
    const res = await surfboardApi.cod.batches.allStats();
    if (res.success && res.data) setStats(res.data);
  };

  React.useEffect(() => {
    loadStats();
  }, []);

  const handleRefresh = async () => {
    await reload();
    await loadStats();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING_USER_PAYMENT":
        return "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/20";
      case "LASG_PAID":
        return "bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/20";
      case "ACCOUNTS_APPROVED":
        return "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/20";
      case "ACCOUNTS_DISAPPROVED":
        return "bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/20";
      case "COMPLETED":
        return "bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-300 border-green-200 dark:border-green-500/20";
      default:
        return "bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-white/10";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
      case "ACCOUNTS_APPROVED":
        return <CheckCircle className="w-4 h-4" />;
      case "ACCOUNTS_DISAPPROVED":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, " ");
  };

  const statsData = [
    {
      label: "Total Batches",
      value: stats?.total ?? 0,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-500/10",
    },
    {
      label: "Pending Payment",
      value: stats?.pendingUserPayment ?? 0,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-500/10",
    },
    {
      label: "Awaiting Approval",
      value: stats?.lasgPaid ?? 0,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-500/10",
    },
    {
      label: "Completed",
      value: stats?.completed ?? 0,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-500/10",
    },
  ];

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Certificate of Deposit
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage batch submissions and approval workflows
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-white/15 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
            <Link
              href="/surfboard-restricted/dashboard/certificates/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FileText className="w-4 h-4" />
              New Batch Submission
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsData.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className={`${stat.bgColor} rounded-lg p-4 border border-gray-100 dark:border-white/10`}
            >
              <div className={`text-2xl font-bold ${stat.color} mb-1`}>
                {stat.value}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-surface rounded-lg shadow-sm border border-gray-200 dark:border-white/10 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by batch code or submitter..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-white/15 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none px-4 py-2 pr-10 border border-gray-300 dark:border-white/15 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-surface"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING_USER_PAYMENT">Pending Payment</option>
              <option value="LASG_PAID">LASG Paid</option>
              <option value="ACCOUNTS_APPROVED">Accounts Approved</option>
              <option value="ACCOUNTS_DISAPPROVED">Accounts Disapproved</option>
              <option value="COMPLETED">Completed</option>
            </select>
            <ViewToggle value={viewMode} onChange={setViewMode} />
          </div>
        </div>
      </div>

      {loading && <PageLoader label="Loading certificate batches…" />}

      {/* Batches Grid */}
      {!loading && viewMode === "grid" && (
        <div className="bg-white dark:bg-surface rounded-lg shadow-sm border border-gray-200 dark:border-white/10 p-4">
          {batches.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">
                No batches found
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Try adjusting your search or filters
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {batches.map((batch, index) => (
                <motion.div
                  key={batch.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                  className="flex flex-col gap-3 rounded-lg border border-gray-200 dark:border-white/10 p-4 hover:border-gray-300 dark:hover:border-white/20 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-lg shrink-0">
                        <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="font-semibold text-gray-900 dark:text-white truncate">
                        {batch.batchCode}
                      </div>
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                        batch.paymentStatus
                      )}`}
                    >
                      {getStatusIcon(batch.paymentStatus)}
                    </span>
                  </div>

                  {batch.submitter && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {batch.submitter.firstName} {batch.submitter.lastName}
                      <span className="block text-xs text-gray-500 dark:text-gray-500 truncate">
                        {batch.submitter.email}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      {batch.planCount} plans
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      ₦{batch.totalAmount.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100 dark:border-white/10">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(batch.createdAt).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/surfboard-restricted/dashboard/certificates/${batch.id}`}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      {batch.lasgReceiptUrl && (
                        <MediaLink
                          href={surfboardApi.files.getViewUrl(batch.lasgReceiptUrl)}
                          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                          title="Download Receipt"
                        >
                          <Download className="w-4 h-4" />
                        </MediaLink>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {totalPages > 1 && batches.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Page {page} of {totalPages} • {total} batches
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
      )}

      {/* Batches Table */}
      {!loading && viewMode === "list" && (
        <div className="bg-white dark:bg-surface rounded-lg shadow-sm border border-gray-200 dark:border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-white/10">
              <thead className="bg-gray-50 dark:bg-white/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Batch Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Submitter
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Plans
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Total Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Submitted
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-surface divide-y divide-gray-200 dark:divide-white/10">
                {batches.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 dark:text-gray-400">
                        No batches found
                      </p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                        Try adjusting your search or filters
                      </p>
                    </td>
                  </tr>
                ) : (
                  batches.map((batch, index) => (
                    <motion.tr
                      key={batch.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2, delay: index * 0.03 }}
                      className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-lg">
                            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {batch.batchCode}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {batch.submitter ? (
                          <div>
                            <div className="text-sm text-gray-900 dark:text-white">
                              {batch.submitter.firstName}{" "}
                              {batch.submitter.lastName}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {batch.submitter.email}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">
                            Unknown
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {batch.planCount} plans
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          ₦{batch.totalAmount.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                            batch.paymentStatus
                          )}`}
                        >
                          {getStatusIcon(batch.paymentStatus)}
                          {formatStatus(batch.paymentStatus)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {new Date(batch.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/surfboard-restricted/dashboard/certificates/${batch.id}`}
                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          {batch.lasgReceiptUrl && (
                            <MediaLink
                              href={surfboardApi.files.getViewUrl(batch.lasgReceiptUrl)}
                              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                              title="Download Receipt"
                            >
                              <Download className="w-4 h-4" />
                            </MediaLink>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && batches.length > 0 && (
            <div className="bg-gray-50 dark:bg-white/5 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-200 dark:border-white/10">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Page {page} of {totalPages} • {total} batches
              </div>
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
      )}
    </div>
  );
}
