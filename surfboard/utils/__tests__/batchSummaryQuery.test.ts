import { describe, expect, it } from "vitest";
import { ValidationError } from "@/lib/api/errors";
import { parseBatchSummaryQuery } from "@/surfboard/utils/batchSummaryQuery";

const parse = (query = "") =>
  parseBatchSummaryQuery(new URLSearchParams(query));

describe("parseBatchSummaryQuery", () => {
  it("defaults to active batches, page 1, 20 a page", () => {
    expect(parse()).toEqual({
      scope: "active",
      search: undefined,
      page: 1,
      pageSize: 20,
    });
  });

  it("reads history, a trimmed search and a page, with the size capped at 100", () => {
    expect(
      parse("scope=history&search=%20SurfCoD_ab%20&page=2&pageSize=500")
    ).toEqual({
      scope: "history",
      search: "SurfCoD_ab",
      page: 2,
      pageSize: 100,
    });
  });

  it("refuses an unknown scope and a very long search", () => {
    expect(() => parse("scope=all")).toThrow(ValidationError);
    expect(() => parse(`search=${"x".repeat(101)}`)).toThrow(ValidationError);
  });
});
