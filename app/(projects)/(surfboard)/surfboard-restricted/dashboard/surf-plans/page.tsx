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
  Clock,
  MapPin,
  FileText,
  Calendar,
  User,
  ChevronDown,
  RefreshCw,
  MoreVertical,
  Users,
  AlertTriangle,
  Pencil,
  Save,
  X,
  CheckCircle2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { surfboardApi } from "@/surfboard/apiClient";
import { useConfirm } from "@/hooks/useConfirm";
import { PageLoader } from "@/components/ui/spinner";
import { ViewToggle } from "@/components/ui/view-toggle";
import { useViewMode } from "@/hooks/useViewMode";
import { useServerList } from "@/hooks/useServerList";
import { Pagination } from "@/components/ui/pagination";

interface SurveyPlan {
  id: string;
  planNumber: string;
  surveyTitle: string;
  facility: string | null;
  location: string;
  status: "PENDING" | "UNDER_REVIEW" | "LODGED" | "QUERIED";
  createdAt: string;
  updatedAt: string;
  owner: {
    name: string;
    email: string;
  };
  pillarsCount: number;
  area: number;
  personCount?: number;
  personCountVerified?: boolean;
}

interface PlanStats {
  total: number;
  pending: number;
  underReview: number;
  lodged: number;
  queried: number;
}

interface PlanFilters {
  status: string;
  tab: "all" | "person-count" | "queries";
}

export default function SurfPlansPage() {
  const { confirm, ConfirmDialog } = useConfirm();
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useViewMode("surf-plans", "list");
  const [stats, setStats] = useState<PlanStats | null>(null);

  const {
    items: plans,
    total,
    totalPages,
    loading,
    page,
    setPage,
    search: searchTerm,
    setSearch: setSearchTerm,
    filters,
    setFilters,
    reload,
  } = useServerList<SurveyPlan, PlanFilters>(
    async ({ page, pageSize, search, filters }) =>
      surfboardApi.admin.plans.list({
        page,
        pageSize,
        search: search || undefined,
        status: filters.status,
        tab: filters.tab,
      }),
    { initialFilters: { status: "ALL", tab: "all" } }
  );

  const activeTab = filters.tab;
  const statusFilter = filters.status;
  const setActiveTab = (tab: PlanFilters["tab"]) => setFilters((f) => ({ ...f, tab }));
  const setStatusFilter = (status: string) => setFilters((f) => ({ ...f, status }));

  const loadStats = async () => {
    const res = await surfboardApi.admin.plans.stats();
    if (res.success && res.data) setStats(res.data);
  };

  useEffect(() => {
    loadStats();
  }, []);

  // Edit Modal State
  const [editingPlan, setEditingPlan] = useState<SurveyPlan | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Action State
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleRefresh = async () => {
    await reload();
    await loadStats();
  };

  const handleEditClick = (plan: SurveyPlan) => {
    setEditingPlan(plan);
    setEditTitle(plan.surveyTitle);
  };

  const handleSaveTitle = async () => {
    if (!editingPlan) return;
    setIsSaving(true);

    try {
      const res = await surfboardApi.plans.updateTitle(editingPlan.id, editTitle);
      if (res.success) {
        toast.success("Survey title updated");
        setEditingPlan(null);
        await reload();
      } else {
        toast.error(res.error || "Failed to update title");
      }
    } catch {
      toast.error("Error updating title");
    } finally {
      setIsSaving(false);
    }
  };

  const getPersonCount = (title: string) => {
    if (!title) return 0;
    return title.split("\n").filter((l) => l.trim()).length;
  };

  const hasPotentialMismatch = (title: string) => {
    const lines = getPersonCount(title);
    // If it has ' AND ' or '&' but is only 1 line, might be a mismatch
    if (lines === 1 && (title.includes(" AND ") || title.includes("&"))) {
      return true;
    }
    return false;
  };

  // Actions using real server actions imported above

  const handleVerify = async (plan: SurveyPlan) => {
    if (!(await confirm({ title: "Verify count?", description: "Verify this count?", confirmLabel: "Verify" })))
      return;
    setProcessingId(plan.id);
    const count = getPersonCount(plan.surveyTitle);

    try {
      const res = await surfboardApi.plans.verifyPersonCount(plan.id, count);
      if (res.success) {
        toast.success("Person count verified");
        await reload();
      } else {
        toast.error(res.error || "Failed to verify");
      }
    } catch (e) {
      toast.error("Error verifying");
    } finally {
      setProcessingId(null);
    }
  };

  const handleQuery = async (plan: SurveyPlan) => {
    if (
      !(await confirm({
        title: "Query this plan?",
        description: "Are you sure you want to query this plan?",
        confirmLabel: "Query plan",
      }))
    )
      return;
    setProcessingId(plan.id);

    try {
      const res = await surfboardApi.plans.query(plan.id);
      if (res.success) {
        toast.success("Plan queried");
        await reload();
        await loadStats();
      } else {
        toast.error(res.error || "Failed to query");
      }
    } catch (e) {
      toast.error("Error querying plan");
    } finally {
      setProcessingId(null);
    }
  };

  // Filtering/pagination happens server-side (search, status, tab all sent as query params).
  const filteredPlans = plans;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30";
      case "UNDER_REVIEW":
        return "bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30";
      case "LODGED":
        return "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30";
      case "QUERIED":
        return "bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/30";
      default:
        return "bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-white/10";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "LODGED":
        return <CheckCircle className="w-4 h-4" />;
      case "PENDING":
      case "UNDER_REVIEW":
        return <Clock className="w-4 h-4" />;
      case "QUERIED":
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const statsData = [
    {
      label: "Total Plans",
      value: stats?.total ?? 0,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-500/10",
    },
    {
      label: "Pending Review",
      value: stats?.pending ?? 0,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-500/10",
    },
    {
      label: "Under Review",
      value: stats?.underReview ?? 0,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-500/10",
    },
    {
      label: "Lodged (Approved)",
      value: stats?.lodged ?? 0,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-500/10",
    },
    {
      label: "Queried Plans",
      value: stats?.queried ?? 0,
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-50 dark:bg-red-500/10",
    },
  ];

  return (
    <div className="min-h-full space-y-6">
      {ConfirmDialog}
      {/* Edit Modal (Dialog) */}
      <Dialog
        open={!!editingPlan}
        onOpenChange={(o) => !o && setEditingPlan(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Survey Title</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 block">
                Survey Title
              </label>
              <Textarea
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                rows={5}
                className="resize-y font-mono text-sm"
              />
              <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
                <span>Separate multiple owners with new lines.</span>
                <span
                  className={
                    getPersonCount(editTitle) > 1
                      ? "text-green-600 font-medium"
                      : ""
                  }
                >
                  Count: {getPersonCount(editTitle)}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPlan(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTitle} disabled={isSaving}>
              {isSaving ? (
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Survey Plans</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage and review all survey plan submissions
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
              href="/surfboard-restricted/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {" "}
          {/* Changed grid-cols-4 to grid-cols-5 */}
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
              <div className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-white/10 mb-6 overflow-x-auto">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("all")}
            className={`
              whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
              ${activeTab === "all"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 hover:border-gray-300"
              }
            `}
          >
            <FileText className="w-4 h-4" />
            All Plans
          </button>
          <button
            onClick={() => setActiveTab("person-count")}
            className={`
              whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
              ${activeTab === "person-count"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 hover:border-gray-300"
              }
            `}
          >
            <Users className="w-4 h-4" />
            Person Count Monitor
          </button>
          <button
            onClick={() => setActiveTab("queries")}
            className={`
              whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
              ${activeTab === "queries"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 hover:border-gray-300"
              }
            `}
          >
            <AlertTriangle className="w-4 h-4" />
            Queries
          </button>
        </nav>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-surface rounded-lg shadow-sm border border-gray-200 dark:border-white/10 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by plan number, title, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-white/15 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none px-4 py-2 pr-10 border border-gray-300 dark:border-white/15 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-surface"
              >
                <option value="ALL">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="LODGED">Lodged (Approved)</option>
                <option value="QUERIED">Queried</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4 pointer-events-none" />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-white/15 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>

            <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-white/15 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>

            {activeTab !== "person-count" && (
              <ViewToggle value={viewMode} onChange={setViewMode} />
            )}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && <PageLoader label="Loading survey plans…" />}

      {/* Plans Grid */}
      {!loading && (viewMode === "grid" && activeTab !== "person-count" ? (
        <div className="bg-white dark:bg-surface rounded-lg shadow-sm border border-gray-200 dark:border-white/10 p-4">
          {filteredPlans.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No plans found</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Try adjusting your search or filters
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPlans.map((plan, index) => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                  className="flex flex-col gap-3 rounded-lg border border-gray-200 dark:border-white/10 p-4 hover:border-gray-300 dark:hover:border-white/20 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                      <div className="p-2 bg-blue-50 dark:bg-blue-500/15 rounded-lg shrink-0">
                        <FileText className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-900 dark:text-white truncate">
                          {plan.planNumber}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {plan.surveyTitle}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                        plan.status
                      )}`}
                    >
                      {getStatusIcon(plan.status)}
                    </span>
                  </div>

                  <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <MapPin className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5 shrink-0" />
                    <span className="truncate">{plan.location}</span>
                  </div>

                  <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <User className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5 shrink-0" />
                    <span className="truncate">{plan.owner.name}</span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <Calendar className="w-3.5 h-3.5" />
                    Updated {new Date(plan.updatedAt).toLocaleDateString()}
                  </div>

                  <div className="flex items-center justify-end gap-2 mt-auto pt-2 border-t border-gray-100 dark:border-white/10">
                    <Link
                      href={`/surfboard-restricted/dashboard/surf-plans/update/${plan.id}`}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </Link>
                    <button
                      className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                      title="More actions"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      ) : (
      /* Plans Table */
      <div className="bg-white dark:bg-surface rounded-lg shadow-sm border border-gray-200 dark:border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-white/10">
            <thead className="bg-gray-50 dark:bg-white/5">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Plan Details
                </th>
                {activeTab === "person-count" ? (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Survey Title Analysis
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Count
                    </th>
                  </>
                ) : (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Owner
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Updated
                    </th>
                  </>
                )}
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-surface divide-y divide-gray-200 dark:divide-white/10">
              {filteredPlans.length === 0 ? (
                <tr>
                  <td
                    colSpan={activeTab === "person-count" ? 4 : 6}
                    className="px-6 py-12 text-center"
                  >
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">No plans found</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
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
                    className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-50 dark:bg-blue-500/15 rounded-lg">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {plan.planNumber}
                          </div>
                          {activeTab !== "person-count" && (
                            <div className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-xs">
                              {plan.surveyTitle}
                            </div>
                          )}
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-3">
                            <span>{plan.status}</span>
                            <span>•</span>
                            <span>
                              {new Date(plan.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {activeTab === "person-count" ? (
                      <>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-800 font-mono bg-gray-50 dark:bg-white/5 p-2 rounded border border-gray-100 dark:border-white/10 whitespace-pre-wrap max-w-md">
                            {plan.surveyTitle}
                          </div>
                          {hasPotentialMismatch(plan.surveyTitle) && (
                            <div className="flex items-center gap-1 text-amber-600 text-xs mt-1 font-medium">
                              <AlertTriangle className="w-3 h-3" /> Mismatch
                              detected
                            </div>
                          )}
                          {plan.personCountVerified && (
                            <div className="flex items-center gap-1 text-green-600 text-xs mt-1 font-medium">
                              <CheckCircle2 className="w-3 h-3" /> Verified
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div
                            className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${plan.personCountVerified
                              ? "bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-300"
                              : "bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300"
                              }`}
                          >
                            {getPersonCount(plan.surveyTitle)}
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4">
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5" />
                            <div>
                              <div className="text-sm text-gray-900 dark:text-white">
                                {plan.location}
                              </div>
                              {plan.facility && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {plan.facility}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-start gap-2">
                            <User className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5" />
                            <div>
                              <div className="text-sm text-gray-900 dark:text-white">
                                {plan.owner.name}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
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
                            <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5" />
                            <div className="text-sm text-gray-900 dark:text-white">
                              {new Date(plan.updatedAt).toLocaleDateString()}
                            </div>
                          </div>
                        </td>
                      </>
                    )}

                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {activeTab === "person-count" && (
                          <>
                            {!plan.personCountVerified && (
                              <button
                                onClick={() => handleVerify(plan)}
                                disabled={!!processingId}
                                className="px-2 py-1 text-xs font-medium text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-500/15 hover:bg-green-100 dark:hover:bg-green-500/25 border border-green-200 dark:border-green-500/30 rounded transition-colors"
                              >
                                Verify
                              </button>
                            )}
                            <button
                              onClick={() => handleQuery(plan)}
                              disabled={
                                !!processingId || plan.status === "QUERIED"
                              }
                              className="px-2 py-1 text-xs font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-500/15 hover:bg-red-100 dark:hover:bg-red-500/25 border border-red-200 dark:border-red-500/30 rounded transition-colors"
                            >
                              Query
                            </button>
                            <button
                              onClick={() => handleEditClick(plan)}
                              className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/15 rounded-lg transition-colors border border-blue-200 dark:border-blue-500/30"
                              title="Edit Title"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <Link
                          href={`/surfboard-restricted/dashboard/surf-plans/update/${plan.id}`}
                          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
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
          <div className="bg-gray-50 dark:bg-white/5 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-200 dark:border-white/10">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing <span className="font-medium">{filteredPlans.length}</span> of{" "}
              <span className="font-medium">{total}</span> plans
            </div>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>
      ))}

      {/* Grid-view pagination (table view carries its own footer above) */}
      {!loading && viewMode === "grid" && activeTab !== "person-count" && filteredPlans.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing <span className="font-medium">{filteredPlans.length}</span> of{" "}
            <span className="font-medium">{total}</span> plans
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
