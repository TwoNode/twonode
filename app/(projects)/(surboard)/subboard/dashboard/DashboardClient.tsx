"use client";

import React, { useState, useMemo } from "react";
import Welcome from "./components/Welcome";
import Link from "next/link";
import UserPropertyRequests from "./components/UserPropertyRequests";
import UserSearchFilters, {
  UserSearchFilters as UserSearchFiltersType,
} from "./components/UserSearchFilters";

interface Property {
  id: string;
  reference: string;
  title: string | null;
  description: string | null;
  status: string | null;
  paymentStatus: string | null;
  statusMessage?: string | null;
  error?: string | null;
  userId?: string;
  // OneTime request fields
  requester?: string | null;
  email?: string;
  userPhoneNumber?: string | null;
  // Regular request fields
  user?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  address: string;
  lat?: number | null;
  lng?: number | null;
  lga: string;
  parcelId?: string | null;
  totalCost: number;
  documentsUrls: string[];
  comments?: string | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
  paymentLink?: string | null;
  report?: any;
  isOneTimeRequest?: boolean;
}

interface DashboardClientProps {
  initialData: Property[];
}

const DashboardClient: React.FC<DashboardClientProps> = ({ initialData }) => {
  const [filters, setFilters] = useState<UserSearchFiltersType>({
    searchTerm: "",
    status: [],
    paymentStatus: [],
    hasReport: null,
  });

  const filteredData = useMemo(() => {
    let filtered = [...initialData];

    // Apply search term filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter((property) => {
        const searchableText = [
          property.reference,
          property.address,
          property.title || "",
          property.description || "",
        ]
          .join(" ")
          .toLowerCase();
        return searchableText.includes(searchLower);
      });
    }

    // Apply status filter
    if (filters.status.length > 0) {
      filtered = filtered.filter(
        (property) =>
          property.status && filters.status.includes(property.status)
      );
    }

    // Apply payment status filter
    if (filters.paymentStatus.length > 0) {
      filtered = filtered.filter(
        (property) =>
          property.paymentStatus &&
          filters.paymentStatus.includes(property.paymentStatus)
      );
    }

    // Apply has report filter
    if (filters.hasReport !== null) {
      filtered = filtered.filter((property) => {
        const hasReport = property.report && property.report !== null;
        return hasReport === filters.hasReport;
      });
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt || "").getTime();
      const dateB = new Date(b.updatedAt || b.createdAt || "").getTime();
      return dateB - dateA;
    });

    return filtered;
  }, [initialData, filters]);

  const handleSearch = (newFilters: UserSearchFiltersType) => {
    setFilters(newFilters);
  };

  const handleClear = () => {
    setFilters({
      searchTerm: "",
      status: [],
      paymentStatus: [],
      hasReport: null,
    });
  };

  const totalCount = initialData.length;
  const filteredCount = filteredData.length;
  const recentRequests = filteredData.slice(0, 3); // Show only 3 most recent

  return (
    <div className="flex flex-col p-[47px_60px] max-xl:p-[30px_40px] max-lg:p-[15px_30px] max-sm:p-[10px_15px] max-md:p-[10px_20px] max-w-full">
      <Welcome />

      <div className="propertiesSection mt-8">
        <UserSearchFilters
          onSearch={handleSearch}
          onClear={handleClear}
          totalCount={totalCount}
          filteredCount={filteredCount}
        />

        {filteredData.length > 0 ? (
          <>
            <UserPropertyRequests
              data={recentRequests}
              title="Recent Requests"
              smallTitle
            />

            {filteredData.length > 3 && (
              <div className="mt-6 text-center">
                <Link
                  href="/reva/dashboard/allrequests"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  View All ({filteredData.length} requests)
                </Link>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="text-gray-400 mb-4">
                <svg
                  className="mx-auto h-12 w-12"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No requests found
              </h3>
              <p className="text-gray-500 mb-4">
                {filters.searchTerm ||
                filters.status.length > 0 ||
                filters.paymentStatus.length > 0 ||
                filters.hasReport !== null
                  ? "Try adjusting your search criteria or clear the filters."
                  : "You haven't made any property requests yet."}
              </p>
              {!filters.searchTerm &&
                filters.status.length === 0 &&
                filters.paymentStatus.length === 0 &&
                filters.hasReport === null && (
                  <Link
                    href="/reva/requestform"
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Make Your First Request
                  </Link>
                )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardClient;
