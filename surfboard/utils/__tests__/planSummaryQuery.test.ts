import { describe, expect, it } from "vitest";
import { ValidationError } from "@/lib/api/errors";
import { parsePlanSummaryQuery } from "@/surfboard/utils/planSummaryQuery";

const parse = (query = "") => parsePlanSummaryQuery(new URLSearchParams(query));

describe("parsePlanSummaryQuery", () => {
  it("has sensible defaults", () => {
    expect(parse()).toEqual({
      scope: "mine",
      page: 1,
      pageSize: 20,
      search: undefined,
      displayStatus: [],
      planType: [],
      facilitator: undefined,
      lga: undefined,
      ward: undefined,
      lcda: undefined,
      provisional: "include",
      dateFrom: undefined,
      dateTo: undefined,
      sortField: "createdAt",
      sortOrder: "desc",
    });
  });

  it("caps the page size at 100 and repairs a bad page, like every other list", () => {
    expect(parse("pageSize=500").pageSize).toBe(100);
    expect(parse("pageSize=0").pageSize).toBe(20);
    expect(parse("page=abc&pageSize=x")).toMatchObject({
      page: 1,
      pageSize: 20,
    });
    expect(parse("page=3&pageSize=50")).toMatchObject({
      page: 3,
      pageSize: 50,
    });
  });

  it("reads the scope and refuses an unknown one", () => {
    expect(parse("scope=shared-with-me").scope).toBe("shared-with-me");
    expect(() => parse("scope=everyone")).toThrow(ValidationError);
  });

  it("trims the search, drops an empty one and refuses a very long one", () => {
    expect(parse("search=%20%20ajah%20").search).toBe("ajah");
    expect(parse("search=%20%20").search).toBeUndefined();
    expect(() => parse(`search=${"a".repeat(101)}`)).toThrow(ValidationError);
  });

  it("reads a list of statuses once each, and refuses a code it does not know", () => {
    expect(
      parse("displayStatus=QUERIED,READY_FOR_PHYSICAL,QUERIED").displayStatus
    ).toEqual(["QUERIED", "READY_FOR_PHYSICAL"]);
    expect(() => parse("displayStatus=QUERIED,DONE")).toThrow(ValidationError);
  });

  it("reads plan types and exact filters", () => {
    expect(
      parse(
        "planType=APPROVED%20LAYOUT,DEED&facilitator=Adeyemi%20%26%20Partners&lga=Eti-Osa&ward=Ajah&lcda=Ibeju"
      )
    ).toMatchObject({
      planType: ["APPROVED LAYOUT", "DEED"],
      facilitator: "Adeyemi & Partners",
      lga: "Eti-Osa",
      ward: "Ajah",
      lcda: "Ibeju",
    });
  });

  it("reads provisional as include, exclude or only", () => {
    expect(parse("provisional=exclude").provisional).toBe("exclude");
    expect(parse("provisional=only").provisional).toBe("only");
    expect(() => parse("provisional=maybe")).toThrow(ValidationError);
  });

  it("only sorts by a known column, never by what the caller names", () => {
    expect(parse("sortField=dateOnSurveyPlan&sortOrder=asc")).toMatchObject({
      sortField: "dateOnSurveyPlan",
      sortOrder: "asc",
    });
    for (const field of [
      "redCopyFileUrl",
      "geometry",
      "user",
      "pillars",
      "constructor",
    ]) {
      expect(() => parse(`sortField=${field}`)).toThrow(ValidationError);
    }
    expect(() => parse("sortOrder=sideways")).toThrow(ValidationError);
  });

  describe("dates", () => {
    it("takes a whole day, in UTC, from a plain date", () => {
      const q = parse("dateFrom=2026-01-01&dateTo=2026-10-19");
      expect(q.dateFrom?.toISOString()).toBe("2026-01-01T00:00:00.000Z");
      expect(q.dateTo?.toISOString()).toBe("2026-10-19T23:59:59.999Z");
    });

    it("uses a full date and time as given", () => {
      const q = parse("dateFrom=2026-01-01T10:00:00.000Z");
      expect(q.dateFrom?.toISOString()).toBe("2026-01-01T10:00:00.000Z");
    });

    it("refuses something that is not a date, including a day that does not exist", () => {
      expect(() => parse("dateFrom=yesterday")).toThrow(ValidationError);
      expect(() => parse("dateTo=2026-02-31")).toThrow(ValidationError);
    });

    it("refuses a range that ends before it starts", () => {
      expect(() => parse("dateFrom=2026-10-19&dateTo=2026-01-01")).toThrow(
        ValidationError
      );
    });

    it("allows a one-day range", () => {
      expect(() =>
        parse("dateFrom=2026-10-19&dateTo=2026-10-19")
      ).not.toThrow();
    });
  });

  it("says which field was wrong", () => {
    try {
      parse("scope=nobody");
      throw new Error("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect(JSON.stringify((error as ValidationError).details)).toContain(
        "scope"
      );
    }
  });
});
