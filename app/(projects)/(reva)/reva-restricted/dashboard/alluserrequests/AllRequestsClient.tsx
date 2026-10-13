"use client";

import React, { useState, useMemo, useEffect } from "react";
import RequestList from "../../components/RequestsList";
import { AdminMiniHeader } from "../../components/AdminMiniHeader";
import SearchFilters, {
  SearchFilters as SearchFiltersType,
} from "../../components/SearchFilters";
import { Pagination } from "@/components/ui/pagination";
import {
  RequestViewToggle,
  useRequestView,
} from "../../components/requestView";

const PAGE_SIZE = 10;

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
    parcelId: "",
    hasReport: null,
    isApproved: null,
  });
  const [view, setView] = useRequestView();
  const [oneTimePage, setOneTimePage] = useState(1);
  const [requestsPage, setRequestsPage] = useState(1);

  // A filter change invalidates whatever page either section was showing.
  useEffect(() => {
    setOneTimePage(1);
    setRequestsPage(1);
  }, [filters]);

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
      filtered = filtered.filter((request) => {
        // Ensure request.lga is a string and convert to lowercase
        const requestLga = String(request?.lga || "").toLowerCase();

        // Check if any selected LGA matches the request LGA
        return filters.lga.some((filterLga) => {
          const filterLgaLower = String(filterLga).toLowerCase();
          // Check if either contains the other (partial match)
          return (
            requestLga.includes(filterLgaLower) ||
            filterLgaLower.includes(requestLga)
          );
        });
      });

      filteredOneTime = filteredOneTime.filter((request) => {
        // Ensure request.lga is a string and convert to lowercase
        const requestLga = String(request?.lga || "").toLowerCase();

        // Check if any selected LGA matches the request LGA
        return filters.lga.some((filterLga) => {
          const filterLgaLower = String(filterLga).toLowerCase();
          // Check if either contains the other (partial match)
          return (
            requestLga.includes(filterLgaLower) ||
            filterLgaLower.includes(requestLga)
          );
        });
      });
    }

    // Apply parcel ID filter
    if (filters.parcelId) {
      const parcelIdLower = filters.parcelId.toLowerCase();

      filtered = filtered.filter((request) => {
        const requestParcelId = String(request?.parcelId || "").toLowerCase();
        return (
          parcelIdLower.includes(requestParcelId) ||
          requestParcelId.includes(parcelIdLower)
        );
      });
      filteredOneTime = filteredOneTime.filter((request) => {
        const requestParcelId = String(request?.parcelId || "").toLowerCase();
        return (
          parcelIdLower.includes(requestParcelId) ||
          requestParcelId.includes(parcelIdLower)
        );
      });
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
      parcelId: "",
      hasReport: null,
      isApproved: null,
    });
  };

  const totalCount = initialData.length + initialOneTimeRequests.length;
  const filteredCount =
    filteredData.filtered.length + filteredData.filteredOneTime.length;

  const oneTimeTotalPages = Math.max(
    1,
    Math.ceil(filteredData.filteredOneTime.length / PAGE_SIZE)
  );
  const pagedOneTime = filteredData.filteredOneTime.slice(
    (oneTimePage - 1) * PAGE_SIZE,
    oneTimePage * PAGE_SIZE
  );

  const requestsTotalPages = Math.max(
    1,
    Math.ceil(filteredData.filtered.length / PAGE_SIZE)
  );
  const pagedRequests = filteredData.filtered.slice(
    (requestsPage - 1) * PAGE_SIZE,
    requestsPage * PAGE_SIZE
  );

  return (
    <div className="mx-auto flex flex-col p-6 max-xl:p-[30px_40px] max-lg:p-[15px_30px] max-sm:p-[10px_15px] max-md:p-[10px_20px] max-w-6xl">
      <SearchFilters
        onSearch={handleSearch}
        onClear={handleClear}
        totalCount={totalCount}
        filteredCount={filteredCount}
      />

      <div className="mb-4 flex justify-end">
        <RequestViewToggle view={view} onChange={setView} />
      </div>

      {filteredData.filteredOneTime.length > 0 && (
        <section className="mb-8 flex flex-col gap-4">
          <AdminMiniHeader
            title={
              <>
                OneTime Requests &nbsp;{" "}
                <small> ( {filteredData.filteredOneTime.length} )</small>
              </>
            }
          />
          <RequestList requests={pagedOneTime} showStats={false} view={view} />
          {oneTimeTotalPages > 1 && (
            <div className="flex justify-end">
              <Pagination
                page={oneTimePage}
                totalPages={oneTimeTotalPages}
                onPageChange={setOneTimePage}
              />
            </div>
          )}
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
          <>
            <RequestList
              requests={pagedRequests}
              showStats={false}
              view={view}
            />
            {requestsTotalPages > 1 && (
              <div className="flex justify-end">
                <Pagination
                  page={requestsPage}
                  totalPages={requestsTotalPages}
                  onPageChange={setRequestsPage}
                />
              </div>
            )}
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
            <p>No requests found matching your criteria.</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default AllRequestsClient;
