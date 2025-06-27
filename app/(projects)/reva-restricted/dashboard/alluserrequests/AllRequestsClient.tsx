"use client";

import React, { useState, useMemo } from "react";
import RequestList from "../../components/RequestsList";
import { AdminMiniHeader } from "../../components/AdminMiniHeader";
import SearchFilters, {
  SearchFilters as SearchFiltersType,
} from "../../components/SearchFilters";

interface Request {
  id: string;
  reference: string;
  title?: string | null;
  description?: string | null;
  status?: string | null;
  paymentStatus?: string | null;
  statusMessage?: string | null;
  error?: string | null;
  deleted?: boolean;

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
  report?: any;
  isOneTimeRequest?: boolean;
}

interface AllRequestsClientProps {
  initialData: Request[];
  initialOneTimeRequests: Request[];
}

const AllRequestsClient: React.FC<AllRequestsClientProps> = ({
  initialData,
  initialOneTimeRequests,
}) => {
  const [filters, setFilters] = useState<SearchFiltersType>({
    searchTerm: "",
    status: [],
    paymentStatus: [],
    requestType: [],
    lga: [],
    hasReport: null,
    isApproved: null,
  });

  const filteredData = useMemo(() => {
    let filtered = [...initialData];
    let filteredOneTime = [...initialOneTimeRequests];

    // Apply search term filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter((request) => {
        const searchableText = [
          request.reference,
          request.address,
          request.user?.firstName || "",
          request.user?.lastName || "",
          request.user?.email || "",
        ]
          .join(" ")
          .toLowerCase();
        return searchableText.includes(searchLower);
      });

      filteredOneTime = filteredOneTime.filter((request) => {
        const searchableText = [
          request.reference,
          request.address,
          request.requester || "",
          request.email || "",
        ]
          .join(" ")
          .toLowerCase();
        return searchableText.includes(searchLower);
      });
    }

    // Apply status filter
    if (filters.status.length > 0) {
      filtered = filtered.filter(
        (request) => request.status && filters.status.includes(request.status)
      );
      filteredOneTime = filteredOneTime.filter(
        (request) => request.status && filters.status.includes(request.status)
      );
    }

    // Apply payment status filter
    if (filters.paymentStatus.length > 0) {
      filtered = filtered.filter(
        (request) =>
          request.paymentStatus &&
          filters.paymentStatus.includes(request.paymentStatus)
      );
      filteredOneTime = filteredOneTime.filter(
        (request) =>
          request.paymentStatus &&
          filters.paymentStatus.includes(request.paymentStatus)
      );
    }

    // Apply request type filter
    if (filters.requestType.length > 0) {
      if (
        filters.requestType.includes("Regular") &&
        filters.requestType.includes("OneTime")
      ) {
        // Show both types
      } else if (filters.requestType.includes("Regular")) {
        filteredOneTime = [];
      } else if (filters.requestType.includes("OneTime")) {
        filtered = [];
      }
    }

    // Apply LGA filter
    if (filters.lga.length > 0) {
      filtered = filtered.filter((request) =>
        filters.lga.includes(request.lga)
      );
      filteredOneTime = filteredOneTime.filter((request) =>
        filters.lga.includes(request.lga)
      );
    }

    // Apply has report filter
    if (filters.hasReport !== null) {
      filtered = filtered.filter((request) => {
        const hasReport = request.report && request.report !== null;
        return hasReport === filters.hasReport;
      });
      filteredOneTime = filteredOneTime.filter((request) => {
        const hasReport = request.report && request.report !== null;
        return hasReport === filters.hasReport;
      });
    }

    // Apply approval filter (for now, we'll check if status is "Completed" as a proxy for approval)
    if (filters.isApproved !== null) {
      filtered = filtered.filter((request) => {
        const isApproved = request.status === "Completed";
        return isApproved === filters.isApproved;
      });
      filteredOneTime = filteredOneTime.filter((request) => {
        const isApproved = request.status === "Completed";
        return isApproved === filters.isApproved;
      });
    }

    return { filtered, filteredOneTime };
  }, [initialData, initialOneTimeRequests, filters]);

  const handleSearch = (newFilters: SearchFiltersType) => {
    setFilters(newFilters);
  };

  const handleClear = () => {
    setFilters({
      searchTerm: "",
      status: [],
      paymentStatus: [],
      requestType: [],
      lga: [],
      hasReport: null,
      isApproved: null,
    });
  };

  const totalCount = initialData.length + initialOneTimeRequests.length;
  const filteredCount =
    filteredData.filtered.length + filteredData.filteredOneTime.length;

  return (
    <div className="mx-auto flex flex-col p-6 max-xl:p-[30px_40px] max-lg:p-[15px_30px] max-sm:p-[10px_15px] max-md:p-[10px_20px] max-w-5xl">
      <SearchFilters
        onSearch={handleSearch}
        onClear={handleClear}
        totalCount={totalCount}
        filteredCount={filteredCount}
      />

      {filteredData.filteredOneTime.length > 0 && (
        <section className="mb-8">
          <AdminMiniHeader
            title={
              <>
                OneTime Requests &nbsp;{" "}
                <small> ( {filteredData.filteredOneTime.length} )</small>
              </>
            }
          />
          <RequestList requests={filteredData.filteredOneTime} />
        </section>
      )}

      <section className="info-section mb-6 flex flex-col gap-4">
        <AdminMiniHeader
          title={
            <>
              All User Requests &nbsp;{" "}
              <small> ( {filteredData.filtered.length} )</small>
            </>
          }
        />

        {filteredData.filtered.length > 0 ? (
          <RequestList requests={filteredData.filtered} />
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No requests found matching your criteria.</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default AllRequestsClient;
