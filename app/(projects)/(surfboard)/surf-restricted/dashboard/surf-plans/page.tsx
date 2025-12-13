"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  FileText,
  Calendar,
  User,
  ChevronDown,
  RefreshCw,
  MoreVertical,
} from "lucide-react";

interface SurveyPlan {
  id: string;
  planNumber: string;
  surveyTitle: string;
  facility: string | null;
  location: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "UNDER_REVIEW" | "LODGED";
  createdAt: string;
  updatedAt: string;
  owner: {
    name: string;
    email: string;
  };
  pillarsCount: number;
  area: number;
}

export default function SurfPlansPage() {
  const [plans, setPlans] = useState<SurveyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Mock data - replace with actual API call
  useEffect(() => {
    const fetchPlans = async () => {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mockPlans: SurveyPlan[] = [
        {
          id: "1",
          planNumber: "SP-2024-001",
          surveyTitle: "Commercial Development Site A",
          facility: "Cape Town CBD",
          location: "Cape Town, Western Cape",
          status: "APPROVED",
          createdAt: "2024-01-15T10:00:00Z",
          updatedAt: "2024-01-16T14:30:00Z",
          owner: { name: "John Doe", email: "john@example.com" },
          pillarsCount: 24,
          area: 5420,
        },
        {
          id: "2",
          planNumber: "SP-2024-002",
          surveyTitle: "Residential Plot Survey",
          facility: null,
          location: "Durban, KwaZulu-Natal",
          status: "PENDING",
          createdAt: "2024-01-14T09:00:00Z",
          updatedAt: "2024-01-14T09:00:00Z",
          owner: { name: "Jane Smith", email: "jane@example.com" },
          pillarsCount: 18,
          area: 3200,
        },
        {
          id: "3",
          planNumber: "SP-2024-003",
          surveyTitle: "Industrial Park Boundary",
          facility: "Rosslyn Industrial",
          location: "Pretoria, Gauteng",
          status: "UNDER_REVIEW",
          createdAt: "2024-01-13T11:00:00Z",
          updatedAt: "2024-01-15T16:00:00Z",
          owner: { name: "Mike Wilson", email: "mike@example.com" },
          pillarsCount: 32,
          area: 12800,
        },
        {
          id: "4",
          planNumber: "SP-2024-004",
          surveyTitle: "Agricultural Land Division",
          facility: null,
          location: "Stellenbosch, Western Cape",
          status: "REJECTED",
          createdAt: "2024-01-12T08:00:00Z",
          updatedAt: "2024-01-13T10:00:00Z",
          owner: { name: "Sarah Johnson", email: "sarah@example.com" },
          pillarsCount: 12,
          area: 8500,
        },
        {
          id: "5",
          planNumber: "SP-2024-005",
          surveyTitle: "Coastal Property Survey",
          facility: "Camps Bay",
          location: "Cape Town, Western Cape",
          status: "LODGED",
          createdAt: "2024-01-11T13:00:00Z",
          updatedAt: "2024-01-17T09:00:00Z",
          owner: { name: "David Brown", email: "david@example.com" },
          pillarsCount: 28,
          area: 6300,
        },
      ];

      setPlans(mockPlans);
      setLoading(false);
    };

    fetchPlans();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const filteredPlans = plans.filter((plan) => {
    const matchesSearch =
      plan.planNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.surveyTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.location.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" || plan.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "PENDING":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "REJECTED":
        return "bg-rose-100 text-rose-700 border-rose-200";
      case "UNDER_REVIEW":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "LODGED":
        return "bg-violet-100 text-violet-700 border-violet-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <CheckCircle className="w-4 h-4" />;
      case "REJECTED":
        return <XCircle className="w-4 h-4" />;
      case "PENDING":
      case "UNDER_REVIEW":
      case "LODGED":
        return <Clock className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const statsData = [
    {
      label: "Total Plans",
      value: plans.length,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "Pending Review",
      value: plans.filter((p) => p.status === "PENDING").length,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      label: "Approved",
      value: plans.filter((p) => p.status === "APPROVED").length,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      label: "Under Review",
      value: plans.filter((p) => p.status === "UNDER_REVIEW").length,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading survey plans...</p>
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
            <h1 className="text-3xl font-bold text-gray-900">Survey Plans</h1>
            <p className="text-gray-600 mt-1">
              Manage and review all survey plan submissions
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
              href="/surf-restricted/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Dashboard
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
              placeholder="Search by plan number, title, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-3">
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="ALL">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="LODGED">Lodged</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>

            <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Plans Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Owner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Updated
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPlans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No plans found</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Try adjusting your search or filters
                    </p>
                  </td>
                </tr>
              ) : (
                filteredPlans.map((plan, index) => (
                  <motion.tr
                    key={plan.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, delay: index * 0.03 }}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">
                            {plan.planNumber}
                          </div>
                          <div className="text-sm text-gray-600">
                            {plan.surveyTitle}
                          </div>
                          <div className="text-xs text-gray-500 mt-1 flex items-center gap-3">
                            <span>{plan.pillarsCount} pillars</span>
                            <span>•</span>
                            <span>{plan.area.toLocaleString()} m²</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div>
                          <div className="text-sm text-gray-900">
                            {plan.location}
                          </div>
                          {plan.facility && (
                            <div className="text-xs text-gray-500">
                              {plan.facility}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-2">
                        <User className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div>
                          <div className="text-sm text-gray-900">
                            {plan.owner.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {plan.owner.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                          plan.status
                        )}`}
                      >
                        {getStatusIcon(plan.status)}
                        {plan.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-2">
                        <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div className="text-sm text-gray-900">
                          {new Date(plan.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/surfboard/dashboard/plan?planId=${plan.id}`}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/surf-restricted/dashboard/surf-plans/update/${plan.id}`}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="More actions"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredPlans.length > 0 && (
          <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
            <div className="text-sm text-gray-600">
              Showing{" "}
              <span className="font-medium">{filteredPlans.length}</span> of{" "}
              <span className="font-medium">{plans.length}</span> plans
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1 border border-gray-300 rounded hover:bg-white transition-colors text-sm">
                Previous
              </button>
              <button className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm">
                1
              </button>
              <button className="px-3 py-1 border border-gray-300 rounded hover:bg-white transition-colors text-sm">
                2
              </button>
              <button className="px-3 py-1 border border-gray-300 rounded hover:bg-white transition-colors text-sm">
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
