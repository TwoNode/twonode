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

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/** Parses `?page=` and `?pageSize=` off a request's search params, clamped to sane bounds. */
export function parsePagination(
  searchParams: URLSearchParams,
  opts?: { defaultPageSize?: number; maxPageSize?: number }
): PaginationParams {
  const defaultPageSize = opts?.defaultPageSize ?? DEFAULT_PAGE_SIZE;
  const maxPageSize = opts?.maxPageSize ?? MAX_PAGE_SIZE;

  const rawPage = Number(searchParams.get("page"));
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;

  const rawPageSize = Number(searchParams.get("pageSize"));
  const pageSize =
    Number.isFinite(rawPageSize) && rawPageSize > 0
      ? Math.min(Math.floor(rawPageSize), maxPageSize)
      : defaultPageSize;

  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
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
