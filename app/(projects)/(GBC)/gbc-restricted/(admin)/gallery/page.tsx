import { requireAdmin } from "@/gbc/utils/auth";
import { getGalleryItemsPaginated } from "@/gbc/services/cmsService";
import { getEditions } from "@/gbc/services/editionService";
import { AddGalleryButton } from "@/gbc/components/admin/AddGalleryButton";
import { GalleryGrid } from "@/gbc/components/admin/GalleryGrid";
import { GalleryFilters } from "@/gbc/components/admin/GalleryFilters";
import { Card } from "@/components/ui/card";
import { SearchParamsPagination } from "@/components/ui/search-params-pagination";
import { parsePageParams } from "@/lib/api/pagination";
import { firstParam } from "@/lib/searchParams";
import {
  GALLERY_SORTS,
  GALLERY_TYPE_FILTERS,
  type GallerySort,
  type GalleryTypeFilter,
} from "@/gbc/types/gallery";

// Admin page gated by a real per-request auth check (requireAdmin) — never safe to statically prerender.
export const dynamic = "force-dynamic";

export default async function AdminGalleryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();

  const raw = await searchParams;
  // 20 = five full rows of the four-column grid.
  const { page, pageSize } = parsePageParams(
    { page: firstParam(raw.page), pageSize: firstParam(raw.pageSize) },
    { defaultPageSize: 20 }
  );
  const search = firstParam(raw.search)?.trim() || undefined;
  const edition = firstParam(raw.edition) || "all";
  const type = GALLERY_TYPE_FILTERS.find((t) => t === firstParam(raw.type)) ?? ("all" as GalleryTypeFilter);
  const sort = GALLERY_SORTS.find((s) => s === firstParam(raw.sort)) ?? ("order" as GallerySort);

  const [result, editions] = await Promise.all([
    getGalleryItemsPaginated({
      page,
      pageSize,
      search,
      mediaType: type === "photos" ? "IMAGE" : type === "videos" ? "VIDEO" : undefined,
      edition: edition === "all" ? undefined : edition,
      sort,
    }),
    getEditions(),
  ]);
  const items = result.data;
  const isFiltered = !!search || type !== "all" || edition !== "all";

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Gallery Management</h1>

          <p className="text-gray-600">
            Upload and manage event photos and videos
          </p>
        </div>
        <AddGalleryButton />
      </div>

      <Card className="p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold">Media Library</h2>
            <p className="text-sm text-gray-500">
              {result.pagination.total} {result.pagination.total === 1 ? "item" : "items"}{" "}
              {isFiltered
                ? `${result.pagination.total === 1 ? "matches" : "match"} your filters`
                : "in gallery"}
            </p>
          </div>

          <GalleryFilters editions={editions} edition={edition} type={type} sort={sort} />
        </div>

        {items.length > 0 ? (
          <>
            <GalleryGrid items={items} editions={editions} />
            {result.pagination.totalPages > 1 && (
              <div className="mt-8 pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-sm text-gray-600">
                  Page {result.pagination.page} of {result.pagination.totalPages}
                </p>
                <SearchParamsPagination
                  page={result.pagination.page}
                  totalPages={result.pagination.totalPages}
                  pageSize={result.pagination.pageSize}
                />
              </div>
            )}
          </>
        ) : isFiltered ? (
          <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <h3 className="text-lg font-medium text-gray-900">
              No items match your filters
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Try a different search term, edition or media type.
            </p>
          </div>
        ) : (
          <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900">
              No media items yet
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Upload your first photo or video to get started.
            </p>
            <div className="mt-6">
              <AddGalleryButton />
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
