import { describe, expect, it, vi } from "vitest";
import { paginateQuery, paginatedResult, parsePageParams, parsePagination } from "@/lib/api/pagination";

describe("parsePageParams", () => {
  it("defaults to page 1 and the default page size when nothing is supplied", () => {
    expect(parsePageParams({})).toEqual({ page: 1, pageSize: 10, skip: 0, take: 10 });
  });

  it("derives skip/take from page and pageSize", () => {
    expect(parsePageParams({ page: "3", pageSize: "20" })).toEqual({ page: 3, pageSize: 20, skip: 40, take: 20 });
  });

  it.each(["abc", "0", "-4", "NaN", ""])("falls back to page 1 for an invalid page %j", (bad) => {
    expect(parsePageParams({ page: bad }).page).toBe(1);
  });

  it.each(["abc", "0", "-4", ""])("falls back to the default page size for an invalid pageSize %j", (bad) => {
    expect(parsePageParams({ pageSize: bad }).pageSize).toBe(10);
  });

  it("clamps pageSize to the maximum so a crafted URL can't request an unbounded page", () => {
    expect(parsePageParams({ pageSize: "999999" }).pageSize).toBe(100);
  });

  it("honours a caller's own default and maximum", () => {
    expect(parsePageParams({}, { defaultPageSize: 20 }).pageSize).toBe(20);
    expect(parsePageParams({ pageSize: "80" }, { maxPageSize: 50 }).pageSize).toBe(50);
  });

  it("floors fractional values", () => {
    expect(parsePageParams({ page: "2.9", pageSize: "15.5" })).toMatchObject({ page: 2, pageSize: 15 });
  });
});

describe("parsePagination", () => {
  it("reads page and pageSize off URLSearchParams with the same rules", () => {
    expect(parsePagination(new URLSearchParams("page=2&pageSize=25"))).toEqual({
      page: 2,
      pageSize: 25,
      skip: 25,
      take: 25,
    });
    expect(parsePagination(new URLSearchParams("page=zzz"))).toMatchObject({ page: 1, pageSize: 10 });
  });
});

describe("paginateQuery", () => {
  const rowsFor = (skip: number, take: number, total: number) =>
    Array.from({ length: Math.max(0, Math.min(take, total - skip)) }, (_, i) => skip + i);

  it("fetches the requested page and wraps it in the standard envelope", async () => {
    const fetchPage = vi.fn(async (skip: number, take: number) => rowsFor(skip, take, 25));
    const result = await paginateQuery(fetchPage, async () => 25, 2, 10);

    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(fetchPage).toHaveBeenCalledWith(10, 10);
    expect(result).toEqual(paginatedResult(rowsFor(10, 10, 25), 25, 2, 10));
    expect(result.pagination).toEqual({ page: 2, pageSize: 10, total: 25, totalPages: 3 });
  });

  it("returns an empty first page (no fallback fetch) when nothing matches", async () => {
    const fetchPage = vi.fn(async () => [] as number[]);
    const result = await paginateQuery(fetchPage, async () => 0, 1, 10);

    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(result.data).toEqual([]);
    expect(result.pagination).toMatchObject({ page: 1, total: 0, totalPages: 1 });
  });

  it("re-fetches the real last page when the requested page is past the end", async () => {
    const fetchPage = vi.fn(async (skip: number, take: number) => rowsFor(skip, take, 25));
    const result = await paginateQuery(fetchPage, async () => 25, 9, 10);

    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(fetchPage).toHaveBeenLastCalledWith(20, 10);
    expect(result.data).toEqual([20, 21, 22, 23, 24]);
    expect(result.pagination.page).toBe(3);
  });

  it("does not re-fetch when there are no rows at all, even for a later page", async () => {
    const fetchPage = vi.fn(async () => [] as number[]);
    const result = await paginateQuery(fetchPage, async () => 0, 4, 10);

    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(result.pagination.page).toBe(4);
  });
});
