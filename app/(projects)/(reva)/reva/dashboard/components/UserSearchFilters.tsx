"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  AdjustmentsHorizontalIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

interface UserSearchFiltersProps {
  onSearch: (filters: UserSearchFilters) => void;
  onClear: () => void;
  totalCount: number;
  filteredCount: number;
}

export interface UserSearchFilters {
  searchTerm: string;
  status: string[];
  paymentStatus: string[];
  hasReport: boolean | null;
}

const UserSearchFilters: React.FC<UserSearchFiltersProps> = ({
  onSearch,
  onClear,
  totalCount,
  filteredCount,
}) => {
  const [filters, setFilters] = useState<UserSearchFilters>({
    searchTerm: "",
    status: [],
    paymentStatus: [],
    hasReport: null,
  });

  const [isExpanded, setIsExpanded] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(
    null
  );

  const statusOptions = ["Processing", "Completed", "Available"];
  const paymentStatusOptions = ["Paid", "Unpaid"];

  const handleFilterChange = (key: keyof UserSearchFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleStatusToggle = (status: string) => {
    setFilters((prev) => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter((s) => s !== status)
        : [...prev.status, status],
    }));
  };

  const handlePaymentStatusToggle = (status: string) => {
    setFilters((prev) => ({
      ...prev,
      paymentStatus: prev.paymentStatus.includes(status)
        ? prev.paymentStatus.filter((s) => s !== status)
        : [...prev.paymentStatus, status],
    }));
  };

  const handleClear = () => {
    setFilters({
      searchTerm: "",
      status: [],
      paymentStatus: [],
      hasReport: null,
    });
    onClear();
  };

  // Real-time search with debouncing
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      onSearch(filters);
    }, 300);

    setSearchTimeout(timeout);

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [filters, onSearch]);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.searchTerm ||
      filters.status.length > 0 ||
      filters.paymentStatus.length > 0 ||
      filters.hasReport !== null
    );
  }, [filters]);

  const activeFilterCount = useMemo(() => {
    return (
      (filters.searchTerm ? 1 : 0) +
      filters.status.length +
      filters.paymentStatus.length +
      (filters.hasReport !== null ? 1 : 0)
    );
  }, [filters]);

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-400" />
            <Input
              placeholder="Search by reference, address, or property title..."
              value={filters.searchTerm}
              onChange={(e) => handleFilterChange("searchTerm", e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2"
          >
            <FunnelIcon className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
          {hasActiveFilters && (
            <Button
              variant="outline"
              onClick={handleClear}
              className="flex items-center gap-2"
            >
              <XMarkIcon className="h-4 w-4" />
              Clear
            </Button>
          )}
        </div>

        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300 mb-4">
          <span>
            Showing {filteredCount} of {totalCount} requests
            {hasActiveFilters && (
              <span className="ml-2 text-blue-600">(filtered)</span>
            )}
          </span>
          {hasActiveFilters && (
            <div className="flex items-center gap-2">
              <InformationCircleIcon className="h-4 w-4 text-blue-500" />
              <Badge variant="outline" className="text-xs">
                {activeFilterCount} active filters
              </Badge>
            </div>
          )}
        </div>

        {isExpanded && (
          <div className="border-t pt-4 space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <AdjustmentsHorizontalIcon className="h-4 w-4" />
                Status
              </h4>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((status) => (
                  <Badge
                    key={status}
                    variant={
                      filters.status.includes(status) ? "default" : "outline"
                    }
                    className="cursor-pointer hover:bg-gray-100 dark:bg-surface transition-colors"
                    onClick={() => handleStatusToggle(status)}
                  >
                    {status}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Payment Status
              </h4>
              <div className="flex flex-wrap gap-2">
                {paymentStatusOptions.map((status) => (
                  <Badge
                    key={status}
                    variant={
                      filters.paymentStatus.includes(status)
                        ? "default"
                        : "outline"
                    }
                    className="cursor-pointer hover:bg-gray-100 dark:bg-surface transition-colors"
                    onClick={() => handlePaymentStatusToggle(status)}
                  >
                    {status}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Report Status
              </h4>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={filters.hasReport === true ? "default" : "outline"}
                  className="cursor-pointer hover:bg-gray-100 dark:bg-surface transition-colors"
                  onClick={() =>
                    handleFilterChange(
                      "hasReport",
                      filters.hasReport === true ? null : true
                    )
                  }
                >
                  Has Report
                </Badge>
                <Badge
                  variant={filters.hasReport === false ? "default" : "outline"}
                  className="cursor-pointer hover:bg-gray-100 dark:bg-surface transition-colors"
                  onClick={() =>
                    handleFilterChange(
                      "hasReport",
                      filters.hasReport === false ? null : false
                    )
                  }
                >
                  No Report
                </Badge>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserSearchFilters;
