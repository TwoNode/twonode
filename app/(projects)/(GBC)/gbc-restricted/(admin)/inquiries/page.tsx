// src/app/admin/inquiries/page.tsx
import { getInquiriesPaginated, getInquiryStats } from "@/gbc/services/contactService";
import { getEditions } from "@/gbc/services/editionService";
import { Card } from "@/components/ui/card";
import { MessageSquare, Clock, CheckCircle } from "lucide-react";
import { InquiriesTable } from "@/gbc/components/admin/InquiriesTable";
import { InquiriesFilters } from "@/gbc/components/admin/InquiriesFilters";
import { SearchParamsPagination } from "@/components/ui/search-params-pagination";
import { parsePageParams } from "@/lib/api/pagination";
import { firstParam } from "@/lib/searchParams";
import { getEditionCookieValue } from "@/gbc/utils/editionCookie";

// Admin page gated by a real per-request auth check (requireAdmin) — never safe to statically prerender.
export const dynamic = "force-dynamic";

export default async function AdminInquiriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const { page, pageSize } = parsePageParams({ page: firstParam(raw.page), pageSize: firstParam(raw.pageSize) });
  const status = firstParam(raw.status);
  const type = firstParam(raw.type);
  const rawEdition = firstParam(raw.edition);
  const edition = rawEdition === "all" ? undefined : rawEdition || (await getEditionCookieValue());
  const search = firstParam(raw.search)?.trim() || undefined;

  const [result, stats, editions] = await Promise.all([
    getInquiriesPaginated({ page, pageSize, status, type, edition, search }),
    getInquiryStats(edition),
    getEditions(),
  ]);
  const inquiries = result.data;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Contact Inquiries</h1>
        <p className="text-gray-600">
          Manage and respond to contact form submissions
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Inquiries</p>
              <p className="text-3xl font-bold">{stats.total}</p>
            </div>
            <MessageSquare className="h-10 w-10 text-purple-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Pending</p>
              <p className="text-3xl font-bold text-yellow-600">
                {stats.pending}
              </p>
            </div>
            <Clock className="h-10 w-10 text-yellow-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">In Progress</p>
              <p className="text-3xl font-bold text-blue-600">
                {stats.inProgress}
              </p>
            </div>
            <Clock className="h-10 w-10 text-blue-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Resolved</p>
              <p className="text-3xl font-bold text-green-600">
                {stats.resolved}
              </p>
            </div>
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-6 mb-6">
        <InquiriesFilters editions={editions} currentType={type} currentStatus={status} currentEdition={edition} />
      </Card>

      {/* Inquiries Table */}
      <InquiriesTable inquiries={inquiries || []} editions={editions} />

      {result.pagination.totalPages > 1 && (
        <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-gray-600">
            Page {result.pagination.page} of {result.pagination.totalPages} • {result.pagination.total} inquiries
          </p>
          <SearchParamsPagination
            page={result.pagination.page}
            totalPages={result.pagination.totalPages}
            pageSize={result.pagination.pageSize}
          />
        </div>
      )}
    </div>
  );
}
