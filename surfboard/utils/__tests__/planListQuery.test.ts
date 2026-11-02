import { describe, expect, it } from "vitest";
import { ValidationError } from "@/lib/api/errors";
import {
  PLAN_LIST_SORT_FIELDS,
  parsePlanListQuery,
} from "@/surfboard/utils/planListQuery";

const parse = (query = "") => parsePlanListQuery(new URLSearchParams(query));

describe("parsePlanListQuery (I-044)", () => {
  it("defaults to page 1, ten a page, no filters, no sort", () => {
    expect(parse()).toEqual({
      page: 1,
      pageSize: 10,
      noPagination: false,
      filters: {
        search: undefined,
        status: undefined,
        planType: undefined,
        facilitator: undefined,
        dateFrom: undefined,
        dateTo: undefined,
      },
      sort: undefined,
    });
  });

  it("reads the filters the website sends, the way the routes read them before", () => {
    const q = parse(
      "search=PP%201&status=LODGED,,QUERIED&planType=Regular&facilitator=Bello" +
        "&dateFrom=2026-10-01T00:00:00.000Z&dateTo=2026-10-31"
    );
    expect(q.filters).toEqual({
      search: "PP 1",
      status: ["LODGED", "QUERIED"],
      planType: ["Regular"],
      facilitator: "Bello",
      dateFrom: new Date("2026-10-01T00:00:00.000Z"),
      dateTo: new Date("2026-10-31"),
    });
  });

  it("sorts only when both the field and the order are sent", () => {
    expect(parse("sortField=planNumber&sortOrder=asc").sort).toEqual({
      field: "planNumber",
      order: "asc",
    });
    expect(parse("sortField=planNumber").sort).toBeUndefined();
    expect(parse("sortOrder=asc").sort).toBeUndefined();
  });

  it("accepts exactly the six columns the website sorts by", () => {
    expect([...PLAN_LIST_SORT_FIELDS].sort()).toEqual(
      [
        "createdAt",
        "dateOnSurveyPlan",
        "planNumber",
        "status",
        "surveyTitle",
        "updatedAt",
      ].sort()
    );
    for (const field of PLAN_LIST_SORT_FIELDS) {
      expect(parse(`sortField=${field}&sortOrder=desc`).sort?.field).toBe(
        field
      );
    }
  });

  it.each(["pillars", "geometry", "redCopyFileUrl", "nope", "user.email", ""])(
    "refuses to order by %j rather than passing it to the database",
    (field) => {
      expect(() => parse(`sortField=${field}&sortOrder=asc`)).toThrow(
        ValidationError
      );
    }
  );

  it("refuses a sort order that is not asc or desc", () => {
    expect(() => parse("sortField=status&sortOrder=sideways")).toThrow(
      ValidationError
    );
  });

  it("refuses a date that is not a date", () => {
    expect(() => parse("dateFrom=yesterday")).toThrow(ValidationError);
    expect(() => parse("dateTo=2026-02-31")).toThrow(ValidationError);
  });

  it("clamps the page and the page size, and falls back for a bad number", () => {
    expect(parse("page=3&pageSize=50")).toMatchObject({
      page: 3,
      pageSize: 50,
    });
    expect(parse("pageSize=100000").pageSize).toBe(100);
    expect(parse("page=-4&pageSize=0")).toMatchObject({
      page: 1,
      pageSize: 10,
    });
    expect(parse("page=abc&pageSize=abc")).toMatchObject({
      page: 1,
      pageSize: 10,
    });
  });

  it("reads noPagination only when it is exactly true", () => {
    expect(parse("noPagination=true").noPagination).toBe(true);
    expect(parse("noPagination=1").noPagination).toBe(false);
    expect(parse().noPagination).toBe(false);
  });
});
