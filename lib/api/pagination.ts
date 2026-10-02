/**
 * Shared server-side pagination — one place that decides how `page`/
 * `pageSize` query params are parsed and how a paginated list response is
 * shaped, so every admin list endpoint (users, notifications, surf plans,
 * ...) returns the same envelope instead of each route inventing its own.
 */

export interface PaginationParams {
  page: number;
  pageSize: number;
  /** Prisma `skip` */
  skip: number;
  /** Prisma `take` */
  take: number;
}

export interface Paginated<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

/**
 * Clamps raw `page`/`pageSize` values to sane bounds. Takes plain values
 * rather than URLSearchParams so server pages (whose `searchParams` prop is a
 * plain object) share the exact same parsing as API routes.
 */
export function parsePageParams(
  raw: { page?: string | null; pageSize?: string | null },
  opts?: { defaultPageSize?: number; maxPageSize?: number }
): PaginationParams {
  const defaultPageSize = opts?.defaultPageSize ?? DEFAULT_PAGE_SIZE;
  const maxPageSize = opts?.maxPageSize ?? MAX_PAGE_SIZE;

  const rawPage = Number(raw.page);
  const page =
    Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;

  const rawPageSize = Number(raw.pageSize);
  const pageSize =
    Number.isFinite(rawPageSize) && rawPageSize > 0
      ? Math.min(Math.floor(rawPageSize), maxPageSize)
      : defaultPageSize;

  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

/** Parses `?page=` and `?pageSize=` off a request's search params, clamped to sane bounds. */
export function parsePagination(
  searchParams: URLSearchParams,
  opts?: { defaultPageSize?: number; maxPageSize?: number }
): PaginationParams {
  return parsePageParams(
    { page: searchParams.get("page"), pageSize: searchParams.get("pageSize") },
    opts
  );
}

/** Shapes a page of results + the total matching count into the standard envelope. */
export function paginatedResult<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number
): Paginated<T> {
  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

/**
 * Runs a page fetch and its count in parallel and shapes the envelope. If the
 * requested page is past the end while rows still exist (deleting the last
 * item on the last page, a stale bookmarked URL), it re-fetches the real last
 * page instead of returning an empty list beside a non-zero total.
 */
export async function paginateQuery<T>(
  fetchPage: (skip: number, take: number) => Promise<T[]>,
  count: () => Promise<number>,
  page: number,
  pageSize: number
): Promise<Paginated<T>> {
  const [rows, total] = await Promise.all([
    fetchPage((page - 1) * pageSize, pageSize),
    count(),
  ]);
  const lastPage = Math.max(1, Math.ceil(total / pageSize));

  if (rows.length === 0 && total > 0 && page > lastPage) {
    const lastRows = await fetchPage((lastPage - 1) * pageSize, pageSize);
    return paginatedResult(lastRows, total, lastPage, pageSize);
  }

  return paginatedResult(rows, total, page, pageSize);
}
