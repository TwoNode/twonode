import type { NextResponse } from "next/server";

/**
 * The one response envelope every /api/v1 route returns, across every product.
 * See docs/development-history/ARCHITECTURE_REBUILD_PROPOSAL.md §4.1.
 */
export type ApiSuccess<T> = { success: true; data: T; meta?: PaginationMeta };
export type ApiFailure = {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
};
export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

export type PaginationMeta = {
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
};

export type ApiRouteResponse<T = unknown> = NextResponse<ApiResult<T>>;
