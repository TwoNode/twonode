import { describe, expect, it } from "vitest";
import { parseTicketListParams, toTicketFilters } from "@/gbc/utils/ticketListParams";

describe("parseTicketListParams", () => {
  it("applies the page's own check-in default when the param is absent", () => {
    expect(parseTicketListParams({}, { checkedIn: "yes" }).checkedIn).toBe("yes");
    expect(parseTicketListParams({}, { checkedIn: "all" }).checkedIn).toBe("all");
  });

  it("lets an explicit check-in value override the default, including 'all'", () => {
    expect(parseTicketListParams({ checkedIn: "all" }, { checkedIn: "yes" }).checkedIn).toBe("all");
    expect(parseTicketListParams({ checkedIn: "no" }, { checkedIn: "yes" }).checkedIn).toBe("no");
  });

  it("ignores an unrecognised check-in value rather than passing it through", () => {
    expect(parseTicketListParams({ checkedIn: "maybe" }, { checkedIn: "yes" }).checkedIn).toBe("yes");
  });

  it("trims search and treats blank as no search", () => {
    expect(parseTicketListParams({ search: "  jane  " }, { checkedIn: "all" }).search).toBe("jane");
    expect(parseTicketListParams({ search: "   " }, { checkedIn: "all" }).search).toBeUndefined();
  });

  it("defaults edition to 'all' and keeps an explicit key", () => {
    expect(parseTicketListParams({}, { checkedIn: "all" }).edition).toBe("all");
    expect(parseTicketListParams({ edition: "1.0" }, { checkedIn: "all" }).edition).toBe("1.0");
  });

  it("takes the first value when a param is repeated", () => {
    expect(parseTicketListParams({ edition: ["2.0", "1.0"] }, { checkedIn: "all" }).edition).toBe("2.0");
  });

  it("clamps page and pageSize", () => {
    expect(parseTicketListParams({ page: "-1", pageSize: "100000" }, { checkedIn: "all" })).toMatchObject({
      page: 1,
      pageSize: 100,
    });
  });
});

describe("toTicketFilters", () => {
  it("maps 'all' to no filter and yes/no to a boolean", () => {
    const base = { search: undefined, edition: "all" };
    expect(toTicketFilters({ ...base, checkedIn: "all" }).checkedIn).toBeUndefined();
    expect(toTicketFilters({ ...base, checkedIn: "yes" }).checkedIn).toBe(true);
    expect(toTicketFilters({ ...base, checkedIn: "no" }).checkedIn).toBe(false);
  });

  it("maps edition 'all' to no filter and passes a real key through", () => {
    expect(toTicketFilters({ checkedIn: "all", edition: "all" }).edition).toBeUndefined();
    expect(toTicketFilters({ checkedIn: "all", edition: "2.0" }).edition).toBe("2.0");
  });
});
