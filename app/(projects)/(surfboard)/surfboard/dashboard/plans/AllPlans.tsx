// In AllPlans.tsx
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  getPaginatedSurfPlans,
  getSurfPlanById,
} from "@/app/(projects)/(surfboard)/actions/surfboardActions";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  X,
  Calendar as CalendarIcon,
  Search,
  Download,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  FileText,
  User,
  ChevronDown,
  RefreshCw,
  MoreVertical,
  Grid3x3,
  List,
  Plus,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { PLAN_TYPES as PLAN_TYPES_OBJ } from "../../../types/surfboardTypes";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import SinglePlanDetails from "../plan/SinglePlan";
import SurfboardPlanForm from "../../../components/SurfboardPlanForm";
import OptimizedSinglePlanDetails from "../../../components/OptimizedSinglePlanDetails";
import OptimizedSurfboardPlanForm from "../../../components/OptimizedSurfboardPlanForm";
import {
  PlanDetailsLoadingState,
  PlanFormLoadingState,
} from "../../../components/LoadingStates";
import {
  PlanDetailsErrorState,
  PlanFormErrorState,
} from "../../../components/ErrorStates";

interface PlanFilters {
  search?: string;
  status: string[];
  planType: string[];
  facilitator?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

const PLAN_STATUSES = ["PENDING", "UNDER_REVIEW", "LODGED", "QUERIED"];
const PLAN_TYPES = Array.from(Object.values(PLAN_TYPES_OBJ));

export default function AllPlans() {
  const [search, setSearch] = useState("");
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [filters, setFilters] = useState<PlanFilters>({
    status: [],
    planType: [],
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  });

  // Modal states
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadPlans = async (
    page = pagination.page,
    pageSize = pagination.pageSize
  ) => {
    try {
      setLoading(true);
      const result = await getPaginatedSurfPlans({
        page,
        pageSize,
        filters: {
          ...filters,
          search: search || undefined,
        },
        sort: {
          field: "createdAt" as any,
          order: "desc",
        },
      });

      if (result?.success && result?.data) {
        setPlans(result.data.plans || []);
        setPagination((prev) => ({
          ...prev,
          page,
          pageSize,
          total: result?.data?.total || 0,
          totalPages: result?.data?.totalPages || 1,
        }));
      } else {
        console.warn(result);
        toast.error("Error loading plans");
      }
    } catch (error) {
      console.error("Error loading plans:", error);
      toast.error("Error loading plans");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans(1, pagination.pageSize);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPlans(1, pagination.pageSize);
    }, 500);
    return () => clearTimeout(timer);
  }, [filters, search]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPlans(pagination.page, pagination.pageSize);
    setRefreshing(false);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      loadPlans(newPage);
    }
  };

  const handlePageSizeChange = (value: string) => {
    const newSize = parseInt(value, 10);
    setPagination((prev) => ({ ...prev, pageSize: newSize, page: 1 }));
    loadPlans(1, newSize);
  };

  const handleStatusChange = (status: string) => {
    setFilters((prev) => {
      const newStatuses = prev.status.includes(status)
        ? prev.status.filter((s) => s !== status)
        : [...prev.status, status];
      return { ...prev, status: newStatuses };
    });
  };

  const handlePlanTypeChange = (type: string) => {
    setFilters((prev) => {
      const newTypes = prev.planType.includes(type)
        ? prev.planType.filter((t) => t !== type)
        : [...prev.planType, type];
      return { ...prev, planType: newTypes };
    });
  };

  const handleDateChange = (
    field: "dateFrom" | "dateTo",
    date: Date | undefined
  ) => {
    setFilters((prev) => ({ ...prev, [field]: date }));
  };

  const clearFilters = () => {
    setFilters({
      status: [],
      planType: [],
      dateFrom: undefined,
      dateTo: undefined,
      facilitator: undefined,
    });
    setSearch("");
  };

  const handleExport = () => {
    try {
      // Prepare CSV headers
      const headers = [
        "Plan Number",
        "Survey Title",
        "Status",
        "Location",
        "Facility",
        "Pillars Count",
        "Area (m²)",
        "Created At",
        "Updated At",
      ];

      // Prepare CSV rows
      const rows = plans.map((plan) => [
        plan.planNumber || "N/A",
        plan.surveyTitle || "Untitled",
        plan.status?.replace("_", " ") || "N/A",
        plan.location || "N/A",
        plan.facility || "N/A",
        plan.pillarsCount || 0,
        plan.areaSqM || 0,
        plan.createdAt ? new Date(plan.createdAt).toLocaleDateString() : "N/A",
        plan.updatedAt ? new Date(plan.updatedAt).toLocaleDateString() : "N/A",
      ]);

      // Convert to CSV format
      const csvContent = [
        headers.join(","),
        ...rows.map((row) =>
          row
            .map((cell) =>
              typeof cell === "string" && cell.includes(",")
                ? `"${cell}"`
                : cell
            )
            .join(",")
        ),
      ].join("\n");

      // Create blob and download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `survey-plans-${new Date().toISOString().split("T")[0]}.csv`
      );
      link.style.visibility = "hidden";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Exported ${plans.length} plans successfully`);
    } catch (error) {
      console.error("Error exporting plans:", error);
      toast.error("Failed to export plans");
    }
  };

  // Handle opening view modal
  const handleViewPlan = async (planId: string) => {
    try {
      setModalLoading(true);
      setModalError(null);
      setViewModalOpen(true); // Open modal immediately to show loading state

      // Fetch full plan details
      const result = await getSurfPlanById(planId);
      if (result.success && result.data) {
        setSelectedPlan(result.data);
        setSelectedPlanId(planId);
      } else {
        setModalError(result.error || "Failed to load plan details");
        toast.error("Failed to load plan details");
      }
    } catch (error) {
      console.error("Error loading plan:", error);
      setModalError("An unexpected error occurred");
      toast.error("Failed to load plan details");
    } finally {
      setModalLoading(false);
    }
  };

  // Handle opening edit modal
  const handleEditPlan = async (planId: string) => {
    try {
      setModalLoading(true);
      setModalError(null);
      setEditModalOpen(true); // Open modal immediately to show loading state
      setSelectedPlanId(planId);

      // Fetch full plan details for editing
      const result = await getSurfPlanById(planId);
      if (result.success && result.data) {
        setSelectedPlan(result.data);
      } else {
        setModalError(result.error || "Failed to load plan details");
        toast.error("Failed to load plan details");
      }
    } catch (error) {
      console.error("Error loading plan:", error);
      setModalError("An unexpected error occurred");
      toast.error("Failed to load plan details");
    } finally {
      setModalLoading(false);
    }
  };

  // Handle closing modals and refreshing data
  const handleCloseModal = () => {
    setViewModalOpen(false);
    setEditModalOpen(false);
    setSelectedPlanId(null);
    setSelectedPlan(null);
    setModalError(null);
    // Refresh the plans list
    loadPlans(pagination.page, pagination.pageSize);
  };

  const hasActiveFilters = () => {
    return (
      filters.status.length > 0 ||
      filters.planType.length > 0 ||
      filters.dateFrom ||
      filters.dateTo ||
      search
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "LODGED":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "PENDING":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "QUERIED":
        return "bg-rose-100 text-rose-700 border-rose-200";
      case "UNDER_REVIEW":
        return "bg-blue-100 text-blue-700 border-blue-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "LODGED":
        return <CheckCircle className="w-4 h-4" />;
      case "QUERIED":
        return <XCircle className="w-4 h-4" />;
      case "PENDING":
      case "UNDER_REVIEW":
        return <Clock className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const statsData = [
    {
      label: "Total Plans",
      value: pagination.total,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "Pending",
      value: plans.filter((p) => p.status === "PENDING").length,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      label: "Lodged",
      value: plans.filter((p) => p.status === "LODGED").length,
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

  if (loading && plans.length === 0) {
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
    <div className="min-h-full w-full max-w-full mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Survey Plans</h1>
            <p className="text-gray-600 mt-1">
              Manage and review all survey plan submissions
            </p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <Button
              onClick={() =>
                (window.location.href = "/surfboard/dashboard/newplan")
              }
              className="bg-blue-600 hover:bg-blue-700 flex-1 sm:flex-none"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Plan
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsData.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className={`${stat.bgColor} rounded-lg p-4 border border-gray-100 shadow-sm`}
            >
              <div className={`text-2xl font-bold ${stat.color} mb-1`}>
                {stat.value}
              </div>
              <div className="text-sm text-gray-600">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by plan number, title, or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-3 flex-wrap sm:flex-nowrap">
            <Button
              variant={showFilters ? "default" : "outline"}
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Filters</span>
              {hasActiveFilters() && (
                <Badge className="ml-1 bg-white text-blue-600 hover:bg-white">
                  {filters.status.length +
                    filters.planType.length +
                    (filters.dateFrom ? 1 : 0) +
                    (filters.dateTo ? 1 : 0)}
                </Badge>
              )}
            </Button>

            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "px-3 py-2 transition-colors",
                  viewMode === "list"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                )}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "px-3 py-2 transition-colors border-l border-gray-300",
                  viewMode === "grid"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                )}
                title="Grid view"
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleExport}
              disabled={plans.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Filters */}
      <AnimatePresence>
        {hasActiveFilters() && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 overflow-hidden"
          >
            <div className="flex flex-wrap gap-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
              {filters.status.map((status) => (
                <Badge
                  key={status}
                  variant="secondary"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white"
                >
                  <span className="text-xs font-medium">Status: {status}</span>
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-red-600"
                    onClick={() => handleStatusChange(status)}
                  />
                </Badge>
              ))}
              {filters.planType.map((type) => (
                <Badge
                  key={type}
                  variant="secondary"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white"
                >
                  <span className="text-xs font-medium">Type: {type}</span>
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-red-600"
                    onClick={() => handlePlanTypeChange(type)}
                  />
                </Badge>
              ))}
              {filters.dateFrom && (
                <Badge
                  variant="secondary"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white"
                >
                  <span className="text-xs font-medium">
                    From: {format(filters.dateFrom, "MMM d, yyyy")}
                  </span>
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-red-600"
                    onClick={() => handleDateChange("dateFrom", undefined)}
                  />
                </Badge>
              )}
              {filters.dateTo && (
                <Badge
                  variant="secondary"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white"
                >
                  <span className="text-xs font-medium">
                    To: {format(filters.dateTo, "MMM d, yyyy")}
                  </span>
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-red-600"
                    onClick={() => handleDateChange("dateTo", undefined)}
                  />
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="text-blue-600 hover:text-blue-800 hover:bg-blue-100 text-xs font-medium h-auto py-1.5"
                onClick={clearFilters}
              >
                Clear all
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden"
          >
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Status
                  </label>
                  <div className="space-y-2.5">
                    {PLAN_STATUSES.map((status) => (
                      <label
                        key={status}
                        className="flex items-center group cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={filters.status.includes(status)}
                          onChange={() => handleStatusChange(status)}
                          className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="ml-3 text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                          {status.replace("_", " ")}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Plan Type Filter */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Plan Type
                  </label>
                  <div className="space-y-2.5 max-h-48 overflow-y-auto pr-2">
                    {PLAN_TYPES.map((type) => (
                      <label
                        key={type}
                        className="flex items-center group cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={filters.planType.includes(type)}
                          onChange={() => handlePlanTypeChange(type)}
                          className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="ml-3 text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                          {type}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Date Range Filter */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Date Range
                  </label>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">
                        From
                      </label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !filters.dateFrom && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {filters.dateFrom ? (
                              format(filters.dateFrom, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={filters.dateFrom}
                            onSelect={(date: any) =>
                              handleDateChange("dateFrom", date || undefined)
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">
                        To
                      </label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !filters.dateTo && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {filters.dateTo ? (
                              format(filters.dateTo, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={filters.dateTo}
                            onSelect={(date: any) =>
                              handleDateChange("dateTo", date || undefined)
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Plans Table/Grid */}
      {viewMode === "list" ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Plan Details
                  </th>
                  <th className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="hidden xl:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Updated
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {plans.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No plans found</p>
                      <p className="text-sm text-gray-400 mt-1">
                        Try adjusting your search or filters
                      </p>
                    </td>
                  </tr>
                ) : (
                  plans.map((plan, index) => (
                    <motion.tr
                      key={plan.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2, delay: index * 0.03 }}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-blue-50 rounded-lg shrink-0">
                            <FileText className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/surfboard/dashboard/plan?planId=${plan.id}`}
                              className="font-semibold text-gray-900 truncate hover:text-blue-600 transition-colors block"
                            >
                              {plan.planNumber || "N/A"}
                            </Link>
                            <div className="text-sm text-gray-600 truncate">
                              {plan.surveyTitle || "Untitled"}
                            </div>
                            <div className="text-xs text-gray-500 mt-1 flex items-center gap-2 flex-wrap">
                              <span>{plan.pillarsCount || 0} pillars</span>
                              <span>•</span>
                              <span>
                                {(plan.areaSqM || 0).toLocaleString()} m²
                              </span>
                            </div>
                            <div className="md:hidden mt-2">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                                  plan.status
                                )}`}
                              >
                                {getStatusIcon(plan.status)}
                                {plan.status?.replace("_", " ") || "N/A"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="hidden lg:table-cell px-6 py-4">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <div className="text-sm text-gray-900 truncate">
                              {plan.location || "N/A"}
                            </div>
                            {plan.facility && (
                              <div className="text-xs text-gray-500 truncate">
                                {plan.facility}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                            plan.status
                          )}`}
                        >
                          {getStatusIcon(plan.status)}
                          {plan.status?.replace("_", " ") || "N/A"}
                        </span>
                      </td>
                      <td className="hidden xl:table-cell px-6 py-4">
                        <div className="flex items-start gap-2">
                          <CalendarIcon className="w-4 h-4 text-gray-400 mt-0.5" />
                          <div className="text-sm text-gray-900">
                            {plan.updatedAt
                              ? new Date(plan.updatedAt).toLocaleDateString()
                              : "N/A"}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewPlan(plan.id)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEditPlan(plan.id)}
                            disabled={modalLoading}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
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
          {plans.length > 0 && (
            <div className="bg-gray-50 px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between border-t border-gray-200 gap-4">
              <div className="text-sm text-gray-600">
                Showing{" "}
                <span className="font-medium">
                  {(pagination.page - 1) * pagination.pageSize + 1}
                </span>{" "}
                to{" "}
                <span className="font-medium">
                  {Math.min(
                    pagination.page * pagination.pageSize,
                    pagination.total
                  )}
                </span>{" "}
                of <span className="font-medium">{pagination.total}</span> plans
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={pagination.pageSize.toString()}
                  onValueChange={handlePageSizeChange}
                >
                  <SelectTrigger className="w-[110px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 10, 20, 50].map((size) => (
                      <SelectItem key={size} value={size.toString()}>
                        Show {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(1)}
                    disabled={pagination.page === 1}
                    className="h-9 w-9 p-0"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="h-9 w-9 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded min-w-[100px] text-center">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="h-9 w-9 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.totalPages)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="h-9 w-9 p-0"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-12">
              <FileText className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-500">No plans found</p>
              <p className="text-sm text-gray-400 mt-1">
                Try adjusting your search or filters
              </p>
            </div>
          ) : (
            plans.map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
              >
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="p-2 bg-blue-50 rounded-lg shrink-0">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/surfboard/dashboard/plan?planId=${plan.id}`}
                          >
                            <CardTitle className="text-base truncate hover:text-blue-600 transition-colors cursor-pointer">
                              {plan.planNumber || "N/A"}
                            </CardTitle>
                          </Link>
                          <CardDescription className="text-sm truncate">
                            {plan.surveyTitle || "Untitled"}
                          </CardDescription>
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border shrink-0 ${getStatusColor(
                          plan.status
                        )}`}
                      >
                        {getStatusIcon(plan.status)}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                      <span className="text-gray-600 truncate">
                        {plan.location || "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>{plan.pillarsCount || 0} pillars</span>
                      <span>•</span>
                      <span>{(plan.areaSqM || 0).toLocaleString()} m²</span>
                    </div>
                    <div className="flex items-center gap-2 pt-3 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleViewPlan(plan.id)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="px-3"
                        onClick={() => handleEditPlan(plan.id)}
                        disabled={modalLoading}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="px-3">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* View Modal */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>View Plan Details</DialogTitle>
          </DialogHeader>
          {modalError ? (
            <PlanDetailsErrorState
              message={modalError}
              onRetry={() => selectedPlanId && handleViewPlan(selectedPlanId)}
              onGoBack={() => setViewModalOpen(false)}
            />
          ) : modalLoading || !selectedPlan ? (
            <PlanDetailsLoadingState />
          ) : (
            <OptimizedSinglePlanDetails
              planData={selectedPlan}
              onRefresh={() => selectedPlanId && handleViewPlan(selectedPlanId)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Plan</DialogTitle>
          </DialogHeader>
          {modalError ? (
            <PlanFormErrorState
              message={modalError}
              onRetry={() => selectedPlanId && handleEditPlan(selectedPlanId)}
              onGoBack={() => setEditModalOpen(false)}
            />
          ) : modalLoading || !selectedPlan ? (
            <PlanFormLoadingState />
          ) : (
            <OptimizedSurfboardPlanForm
              mode="edit"
              initialData={selectedPlan}
              onSuccess={handleCloseModal}
              onCancel={() => setEditModalOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
