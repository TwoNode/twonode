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

interface SearchFiltersProps {
  onSearch: (filters: SearchFilters) => void;
  onClear: () => void;
  totalCount: number;
  filteredCount: number;
}

export interface SearchFilters {
  searchTerm: string;
  status: string[];
  paymentStatus: string[];
  requestType: string[];
  lga: string[];
  parcelId: string;
  hasReport: boolean | null;
  isApproved: boolean | null;
}

const SearchFilters: React.FC<SearchFiltersProps> = ({
  onSearch,
  onClear,
  totalCount,
  filteredCount,
}) => {
  const [filters, setFilters] = useState<SearchFilters>({
    searchTerm: "",
    status: [],
    paymentStatus: [],
    requestType: [],
    lga: [],
    parcelId: "",
    hasReport: null,
    isApproved: null,
  });

  const [isExpanded, setIsExpanded] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(
    null
  );

  const statusOptions = ["Processing", "Completed", "Available"];
  const paymentStatusOptions = ["Paid", "Unpaid"];
  const requestTypeOptions = ["Regular", "OneTime"];
  const lgaOptions = [
    "Ikeja",
    "Victoria Island",
    "Lekki",
    "Surulere",
    "Yaba",
    "Oshodi",
    "Alimosho",
    "Ikorodu",
    "Epe",
    "Badagry",
    "Agege",
    "Ifako-Ijaiye",
    "Obio-Akpor",
    "Port Harcourt",
    "Ikwerre",
    "Emohua",
    "Okrika",
    "Ajeromi-Ifelodun",
    "Amuwo-Odofin",
    "Apapa",
    "Eti-Osa",
    "Ibeju-Lekki",
    "Kosofe",
    "Lagos Island",
    "Lagos Mainland",
    "Mushin",
    "Ojo",
    "Oshodi/Isolo",
    "Shomolu",
  ];

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
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

  const handleRequestTypeToggle = (type: string) => {
    setFilters((prev) => ({
      ...prev,
      requestType: prev.requestType.includes(type)
        ? prev.requestType.filter((t) => t !== type)
        : [...prev.requestType, type],
    }));
  };

  const handleLGAToggle = (lga: string) => {
    setFilters((prev) => ({
      ...prev,
      lga: prev.lga.includes(lga)
        ? prev.lga.filter((l) => l !== lga)
        : [...prev.lga, lga],
    }));
  };

  const handleSearch = () => {
    onSearch(filters);
  };

  const handleClear = () => {
    setFilters({
      searchTerm: "",
      status: [],
      paymentStatus: [],
      requestType: [],
      lga: [],
      parcelId: "",
      hasReport: null,
      isApproved: null,
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
    }, 500);

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
      filters.requestType.length > 0 ||
      filters.lga.length > 0 ||
      filters.parcelId ||
      filters.hasReport !== null ||
      filters.isApproved !== null
    );
  }, [filters]);

  const activeFilterCount = useMemo(() => {
    return (
      (filters.searchTerm ? 1 : 0) +
      filters.status.length +
      filters.paymentStatus.length +
      filters.requestType.length +
      filters.lga.length +
      (filters.parcelId ? 1 : 0) +
      (filters.hasReport !== null ? 1 : 0) +
      (filters.isApproved !== null ? 1 : 0)
    );
  }, [filters]);

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by reference, address, requester name, or email..."
              value={filters.searchTerm}
              onChange={(e) => handleFilterChange("searchTerm", e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="w-48">
            <Input
              placeholder="Filter by Parcel ID..."
              value={filters.parcelId}
              onChange={(e) => handleFilterChange("parcelId", e.target.value)}
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

        <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
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
              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
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
                    className="cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleStatusToggle(status)}
                  >
                    {status}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
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
                    className="cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handlePaymentStatusToggle(status)}
                  >
                    {status}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Request Type
              </h4>
              <div className="flex flex-wrap gap-2">
                {requestTypeOptions.map((type) => (
                  <Badge
                    key={type}
                    variant={
                      filters.requestType.includes(type) ? "default" : "outline"
                    }
                    className="cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleRequestTypeToggle(type)}
                  >
                    {type}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Local Government Area
              </h4>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {lgaOptions.map((lga) => (
                  <Badge
                    key={lga}
                    variant={filters.lga.includes(lga) ? "default" : "outline"}
                    className="cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleLGAToggle(lga)}
                  >
                    {lga}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Report Status
              </h4>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={filters.hasReport === true ? "default" : "outline"}
                  className="cursor-pointer hover:bg-gray-100 transition-colors"
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
                  className="cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() =>
                    handleFilterChange(
                      "hasReport",
                      filters.hasReport === false ? null : false
                    )
                  }
                >
                  No Report
                </Badge>
                <Badge
                  variant={filters.isApproved === true ? "default" : "outline"}
                  className="cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() =>
                    handleFilterChange(
                      "isApproved",
                      filters.isApproved === true ? null : true
                    )
                  }
                >
                  Approved
                </Badge>
                <Badge
                  variant={filters.isApproved === false ? "default" : "outline"}
                  className="cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() =>
                    handleFilterChange(
                      "isApproved",
                      filters.isApproved === false ? null : false
                    )
                  }
                >
                  Not Approved
                </Badge>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SearchFilters;
