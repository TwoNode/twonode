// In SharedPlans.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Plan } from "@/app/(projects)/(surfboard)/types/surfboardTypes";
import { surfboardApi } from "@/surfboard/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PlanView from "../../../components/PlanView";
import { toast } from "sonner";
import {
  Search,
  Download,
  Plus,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Filter,
  X,
  ArrowUpDown,
  Calendar as CalendarIcon,
} from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

const PLAN_STATUSES = [
  "PENDING",
  "LODGED",
  "REJECTED",
  "UNDER_REVIEW"
];

const PLAN_TYPES = [
  "Residential",
  "Commercial",
  "Industrial",
  "Agricultural",
  "Other",
];

export default function SharedPlans() {
  const [activeTab, setActiveTab] = useState<"myShared" | "sharedWithMe">(
    "myShared"
  );
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<PlanFilters>({
    status: [],
    planType: [],
  });
  const [sort, setSort] = useState<{ field: string; order: "asc" | "desc" }>({
    field: "createdAt",
    order: "desc",
  });
  const [sharedPlans, setSharedPlans] = useState<Plan[]>([]);
  const [sharedWithMePlans, setSharedWithMePlans] = useState<Plan[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  });

  const currentPlans = activeTab === "myShared" ? sharedPlans : sharedWithMePlans;

  const loadPlans = useCallback(
    async (page = 1, pageSize = pagination.pageSize) => {
      try {
        setLoading(true);
        const result =
          activeTab === "myShared"
            ? await surfboardApi.plans.shared(
                page,
                pageSize,
                {
                  ...filters,
                  search: search || undefined,
                },
                {
                  field: sort.field as any,
                  order: sort.order,
                }
              )
            : await surfboardApi.plans.sharedWithMe(
                page,
                pageSize,
                {
                  ...filters,
                  search: search || undefined,
                },
                {
                  field: sort.field as any,
                  order: sort.order,
                }
              );

        if (result?.success) {
          if (activeTab === "myShared") {
            setSharedPlans(result.data.plans || []);
          } else {
            setSharedWithMePlans(result.data.plans || []);
          }
          setPagination({
            page,
            pageSize,
            total: result.data.total || 0,
            totalPages: result.data.totalPages || 1,
          });
        } else {
          throw new Error(result?.error || "Failed to load plans");
        }
      } catch (error) {
        console.error("Error loading plans:", error);
        toast.error(
          error instanceof Error ? error.message : "Error loading plans"
        );
      } finally {
        setLoading(false);
      }
    },
    [activeTab, filters, sort, search, pagination.pageSize]
  );

  useEffect(() => {
    loadPlans(1, pagination.pageSize);
  }, [loadPlans, activeTab]);

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

  const handleDateChange = (field: "dateFrom" | "dateTo", date: Date | undefined) => {
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
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {activeTab === "myShared" ? "My Shared Plans" : "Shared with Me"}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {activeTab === "myShared"
            ? "View and manage plans you've shared with others"
            : "View plans that have been shared with you"}
        </p>
      </div>

      <div className="mb-6">
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value as "myShared" | "sharedWithMe");
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
          className="w-full"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <TabsList className="grid w-full md:w-auto grid-cols-2">
              <TabsTrigger value="myShared">My Shared Plans</TabsTrigger>
              <TabsTrigger value="sharedWithMe">Shared with Me</TabsTrigger>
            </TabsList>

            <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
              <div className="relative flex-1 md:max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search plans..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                 />
               </div>

              <div className="flex gap-2">
                <Button
                  variant={showFilters ? "default" : "outline"}
                  onClick={() => setShowFilters(!showFilters)}
                  className="gap-2"
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
                <Button variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
               {activeTab === "myShared" && (
                 <Button
                   onClick={() =>
                     (window.location.href = "/surfboard/dashboard/newplan")
                   }
                   className="gap-2"
                 >
                   <Plus className="h-4 w-4" />
                   Create New Plan
                 </Button>
               )}
               </div>
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
                    onClick={() => handleStatusChange(status)}
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
                    onClick={() => handlePlanTypeChange(type)}
                  />
                </Badge>
              ))}
              {filters.dateFrom && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  From: {format(filters.dateFrom, "MMM d, yyyy")}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => handleDateChange("dateFrom", undefined)}
                  />
                </Badge>
              )}
              {filters.dateTo && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  To: {format(filters.dateTo, "MMM d, yyyy")}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => handleDateChange("dateTo", undefined)}
                  />
                </Badge>
              )}
              {filters.facilitator && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Facilitator: {filters.facilitator}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() =>
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
              >
                Clear all
              </Button>
            </div>
          )}

          {/* Filter Panel */}
          {showFilters && (
            <div className="mb-6 p-4 border rounded-lg bg-gray-50 dark:bg-white/5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <div className="space-y-2">
                    {PLAN_STATUSES.map((status) => (
                      <div key={status} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`status-${status}`}
                          checked={filters.status.includes(status)}
                          onChange={() => handleStatusChange(status)}
                          className="h-4 w-4 text-blue-600 rounded border-gray-300 dark:border-white/15"
                        />
                        <label
                          htmlFor={`status-${status}`}
                          className="ml-2 text-sm text-gray-700 dark:text-gray-300"
                        >
                          {status}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Plan Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Plan Type
                  </label>
                  <div className="space-y-2">
                    {PLAN_TYPES.map((type) => (
                      <div key={type} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`type-${type}`}
                          checked={filters.planType.includes(type)}
                          onChange={() => handlePlanTypeChange(type)}
                          className="h-4 w-4 text-blue-600 rounded border-gray-300 dark:border-white/15"
                        />
                        <label
                          htmlFor={`type-${type}`}
                          className="ml-2 text-sm text-gray-700 dark:text-gray-300"
                        >
                          {type}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Date Range Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date Range
                  </label>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
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
                        <PopoverContent className="w-auto p-0">
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
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
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
                        <PopoverContent className="w-auto p-0">
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
          )}

          {/* Sort Controls */}
          <div className="mb-4 flex justify-between items-center">
            <div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Showing {currentPlans.length} of {pagination.total} plans
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Sort by:</span>
              <Select
                value={sort.field}
                onValueChange={handleSortChange}
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

           <TabsContent value="myShared">
             <div className="space-y-4">
               <PlanView
               plans={currentPlans}
                 emptyMessage="No shared plans found. Share a plan to get started."
                 defaultView="grid"
                 showViewToggle={true}
               />
             </div>
           </TabsContent>
           <TabsContent value="sharedWithMe">
             <div className="space-y-4">
               <PlanView
                plans={currentPlans}
                 emptyMessage="No plans have been shared with you yet."
                 defaultView="grid"
                 showViewToggle={true}
               />
             </div>
           </TabsContent>
         </Tabs>
       </div>
     </div>
   );

}