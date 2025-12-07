"use client";

import React, { useState, useEffect } from "react";
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

interface CertificateBatch {
  id: string;
  batchCode: string;
  planCount: number;
  totalAmount: number;
  paymentStatus: string;
  submittedBy: {
    firstName: string;
    lastName: string;
    email: string;
  };
  userPaymentDate?: Date | null;
  lasgReceiptUrl?: string | null;
  accountsApprovedAt?: Date | null;
  createdAt: Date;
}

export default function CertificatesPage() {
  const [batches, setBatches] = useState<CertificateBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    setLoading(true);
    // TODO: Implement actual API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const mockBatches: CertificateBatch[] = [
      {
        id: "1",
        batchCode: "COD_ABC12345",
        planCount: 5,
        totalAmount: 55000,
        paymentStatus: "USER_PAID",
        submittedBy: {
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
        },
        userPaymentDate: new Date(),
        createdAt: new Date(),
      },
    ];

    setBatches(mockBatches);
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchBatches();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING_USER_PAYMENT":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "USER_PAID":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "LASG_PAID":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "ACCOUNTS_APPROVED":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "ACCOUNTS_DISAPPROVED":
        return "bg-rose-100 text-rose-700 border-rose-200";
      case "COMPLETED":
        return "bg-green-100 text-green-700 border-green-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
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

  const filteredBatches = batches.filter((batch) => {
    const matchesSearch =
      batch.batchCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${batch.submittedBy.firstName} ${batch.submittedBy.lastName}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" || batch.paymentStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const statsData = [
    {
      label: "Total Batches",
      value: batches.length,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "Pending Payment",
      value: batches.filter((b) => b.paymentStatus === "PENDING_USER_PAYMENT")
        .length,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      label: "Awaiting Approval",
      value: batches.filter((b) => b.paymentStatus === "LASG_PAID").length,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      label: "Completed",
      value: batches.filter((b) => b.paymentStatus === "COMPLETED").length,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading certificate batches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Certificate of Deposit
            </h1>
            <p className="text-gray-600 mt-1">
              Manage batch submissions and approval workflows
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
            <Link
              href="/surf-restricted/dashboard/certificates/new"
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
              className={`${stat.bgColor} rounded-lg p-4 border border-gray-100`}
            >
              <div className={`text-2xl font-bold ${stat.color} mb-1`}>
                {stat.value}
              </div>
              <div className="text-sm text-gray-600">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by batch code or submitter..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING_USER_PAYMENT">Pending Payment</option>
              <option value="USER_PAID">User Paid</option>
              <option value="LASG_PAID">LASG Paid</option>
              <option value="ACCOUNTS_APPROVED">Accounts Approved</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Batches Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Batch Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Submitter
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plans
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Submitted
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No batches found</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Try adjusting your search or filters
                    </p>
                  </td>
                </tr>
              ) : (
                filteredBatches.map((batch, index) => (
                  <motion.tr
                    key={batch.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, delay: index * 0.03 }}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="font-semibold text-gray-900">
                          {batch.batchCode}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm text-gray-900">
                          {batch.submittedBy.firstName}{" "}
                          {batch.submittedBy.lastName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {batch.submittedBy.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {batch.planCount} plans
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-gray-900">
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
                      <div className="text-sm text-gray-900">
                        {new Date(batch.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/surf-restricted/dashboard/certificates/${batch.id}`}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {batch.lasgReceiptUrl && (
                          <a
                            href={batch.lasgReceiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Download Receipt"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
