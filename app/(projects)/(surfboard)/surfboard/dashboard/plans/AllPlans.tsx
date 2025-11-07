// In AllPlans.tsx
"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { getPaginatedSurfPlans } from "@/app/(projects)/(surfboard)/actions/surfboardActions";
import PlanView from "../../../components/PlanView";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  X,
  ArrowUpDown,
  Calendar as CalendarIcon,
  Search,
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

interface PlanFilters {
  search?: string;
  status: string[];
  planType: string[];
  facilitator?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

interface SortOption {
  field: "createdAt" | "updatedAt" | "surveyTitle" | "planNumber" | "status";
  label: string;
  defaultOrder?: "asc" | "desc";
}

const SORT_OPTIONS: SortOption[] = [
  { field: "createdAt", label: "Date Created", defaultOrder: "desc" },
  { field: "updatedAt", label: "Last Updated", defaultOrder: "desc" },
  { field: "surveyTitle", label: "Survey Title", defaultOrder: "asc" },
  { field: "planNumber", label: "Plan Number", defaultOrder: "asc" },
  { field: "status", label: "Status", defaultOrder: "asc" },
];

const PLAN_STATUSES = ["Pending", "In Review", "Lodged", "Rejected"];
const PLAN_TYPES = Array.from(Object.values(PLAN_TYPES_OBJ));

export default function AllPlans() {
  const [search, setSearch] = useState("");
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<PlanFilters>({
    status: [],
    planType: [],
  });
  const [sort, setSort] = useState<{ field: string; order: "asc" | "desc" }>({
    field: "createdAt",
    order: "desc",
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  });

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
          field: sort.field as any,
          order: sort.order,
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
    setTimeout(() => {
      loadPlans(1, pagination.pageSize);
    }, 1000);
  }, [filters, sort, search]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      loadPlans(newPage);
    }
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = parseInt(e.target.value, 10);
    setPagination((prev) => ({ ...prev, pageSize: newSize, page: 1 }));
    loadPlans(1, newSize);
  };

  const handleStatusChange = (status: string) => {
    setFilters((prev) => {
      const newStatuses = prev.status.includes(status)
        ? prev.status.filter((s) => s !== status)
        : [...prev.status, status];
      return { ...prev, status: newStatuses, page: 1 };
    });
  };

  const handlePlanTypeChange = (type: string) => {
    setFilters((prev) => {
      const newTypes = prev.planType.includes(type)
        ? prev.planType.filter((t) => t !== type)
        : [...prev.planType, type];
      return { ...prev, planType: newTypes, page: 1 };
    });
  };

  const handleDateChange = (
    field: "dateFrom" | "dateTo",
    date: Date | undefined
  ) => {
    setFilters((prev) => ({ ...prev, [field]: date, page: 1 }));
  };

  const handleSortChange = (field: string) => {
    setSort((prev) => ({
      field,
      order: prev.field === field && prev.order === "asc" ? "desc" : "asc",
    }));
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

  const hasActiveFilters = () => {
    return (
      filters.status.length > 0 ||
      filters.planType.length > 0 ||
      filters.dateFrom ||
      filters.dateTo ||
      filters.facilitator ||
      search
    );
  };

  const getSortIcon = (field: string) => {
    if (sort.field !== field)
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    return sort.order === "asc" ? (
      <ArrowUpDown className="ml-2 h-4 w-4" />
    ) : (
      <ArrowUpDown className="ml-2 h-4 w-4 transform rotate-180" />
    );
  };

  return (
    <div className="w-full max-w-full mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          All Survey Plans
        </h1>
        <p className="text-gray-600">
          View and manage all created survey plans
        </p>
      </div>

      {/* Search and Actions Bar */}
      <div className="mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex-1 max-w-md relative">
          <Input
            type="text"
            className="w-full pl-10 bg-transparent"
            placeholder="Search plans..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={loading}
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button
            variant={showFilters ? "default" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
            disabled={loading}
          >
            <Filter className="h-4 w-4" />
            Filters{" "}
            {hasActiveFilters() &&
              `(${
                filters.status.length +
                filters.planType.length +
                (filters.dateFrom ? 1 : 0) +
                (filters.dateTo ? 1 : 0) +
                (filters.facilitator ? 1 : 0)
              })`}
          </Button>
          <Button
            onClick={() =>
              (window.location.href = "/surfboard/dashboard/newplan")
            }
            className="bg-green-600 hover:bg-green-700"
            disabled={loading}
          >
            Create New Plan
          </Button>
        </div>
      </div>

      {/* Active Filters */}
      {hasActiveFilters() && (
        <div className="mb-4 flex flex-wrap gap-2">
          {filters.status.map((status) => (
            <Badge
              key={status}
              variant="secondary"
              className="flex items-center gap-1"
            >
              Status: {status}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => !loading && handleStatusChange(status)}
              />
            </Badge>
          ))}
          {filters.planType.map((type) => (
            <Badge
              key={type}
              variant="secondary"
              className="flex items-center gap-1"
            >
              Type: {type}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => !loading && handlePlanTypeChange(type)}
              />
            </Badge>
          ))}
          {filters.dateFrom && (
            <Badge variant="secondary" className="flex items-center gap-1">
              From: {format(filters.dateFrom, "MMM d, yyyy")}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() =>
                  !loading && handleDateChange("dateFrom", undefined)
                }
              />
            </Badge>
          )}
          {filters.dateTo && (
            <Badge variant="secondary" className="flex items-center gap-1">
              To: {format(filters.dateTo, "MMM d, yyyy")}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() =>
                  !loading && handleDateChange("dateTo", undefined)
                }
              />
            </Badge>
          )}
          {filters.facilitator && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Facilitator: {filters.facilitator}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() =>
                  !loading &&
                  setFilters((prev) => ({ ...prev, facilitator: undefined }))
                }
              />
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-blue-600 hover:text-blue-800 hover:bg-transparent"
            onClick={clearFilters}
            disabled={loading}
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Filter Panel */}
      {showFilters && (
        <div className="mb-6 p-4 border rounded-lg bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <div className="space-y-2">
                {PLAN_STATUSES.map((status) => (
                  <div key={status} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`status-${status}`}
                      checked={filters.status.includes(status)}
                      onChange={() => !loading && handleStatusChange(status)}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300"
                      disabled={loading}
                    />
                    <label
                      htmlFor={`status-${status}`}
                      className="ml-2 text-sm text-gray-700"
                    >
                      {status}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Plan Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Plan Type
              </label>
              <div className="space-y-2">
                {PLAN_TYPES.map((type) => (
                  <div key={type} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`type-${type}`}
                      checked={filters.planType.includes(type)}
                      onChange={() => !loading && handlePlanTypeChange(type)}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300"
                      disabled={loading}
                    />
                    <label
                      htmlFor={`type-${type}`}
                      className="ml-2 text-sm text-gray-700"
                    >
                      {type}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date Range
              </label>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
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
                        disabled={loading}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.dateFrom ? (
                          format(filters.dateFrom, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={filters.dateFrom}
                        onSelect={(date: any) =>
                          !loading &&
                          handleDateChange("dateFrom", date || undefined)
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">To</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !filters.dateTo && "text-muted-foreground"
                        )}
                        disabled={loading}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.dateTo ? (
                          format(filters.dateTo, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={filters.dateTo}
                        onSelect={(date: any) =>
                          !loading &&
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
      )}

      {/* Sort Controls */}
      <div className="mb-4 flex justify-between items-center">
        <div>
          <span className="text-sm text-gray-600">
            Showing {plans.length} of {pagination.total} plans
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Sort by:</span>
          <Select
            value={sort.field}
            onValueChange={handleSortChange}
            disabled={loading}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem
                  key={option.field}
                  value={option.field}
                  className="flex items-center justify-between"
                >
                  <span>{option.label}</span>
                  {getSortIcon(option.field)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Plans List with Loading State */}
      <div className="relative border-4 border-blue-200 rounded-lg overflow-hidden">
        {loading && (
          <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-10">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}
        <div
          className={cn(
            "transition-opacity",
            loading ? "opacity-50" : "opacity-100"
          )}
        >
          <PlanView
            plans={plans}
            emptyMessage="No survey plans found. Try adjusting your filters or create a new plan."
            defaultView="list"
          />
        </div>
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700">
            Showing{" "}
            <span className="font-medium">
              {pagination.total === 0
                ? 0
                : (pagination.page - 1) * pagination.pageSize + 1}
            </span>{" "}
            to{" "}
            <span className="font-medium">
              {Math.min(
                pagination.page * pagination.pageSize,
                pagination.total
              )}
            </span>{" "}
            of <span className="font-medium">{pagination.total}</span> results
          </span>
          <select
            value={pagination.pageSize}
            onChange={handlePageSizeChange}
            className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
          >
            {[5, 10, 20, 50].map((size) => (
              <option key={size} value={size}>
                Show {size}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(1)}
            disabled={pagination.page === 1 || loading}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1 || loading}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-3 text-sm text-gray-700">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages || loading}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.totalPages)}
            disabled={pagination.page >= pagination.totalPages || loading}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
