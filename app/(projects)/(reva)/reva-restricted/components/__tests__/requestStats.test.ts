import { describe, expect, it } from "vitest";
import {
  applyRequestTab,
  reportStateOf,
  summarizeRequests,
} from "../requestStats";

const none = { id: "n", paymentStatus: "Unpaid", totalCost: 100, report: null };
const review = {
  id: "r",
  paymentStatus: "Paid",
  totalCost: 250,
  report: { isApproved: false },
};
const approved = {
  id: "a",
  paymentStatus: "Paid",
  totalCost: 500,
  report: { isApproved: true },
};

describe("request stats", () => {
  it("classifies the report state", () => {
    expect(reportStateOf(none)).toBe("none");
    expect(reportStateOf(review)).toBe("review");
    expect(reportStateOf(approved)).toBe("approved");
    expect(reportStateOf({})).toBe("none");
  });

  it("summarizes counts and paid fees", () => {
    const s = summarizeRequests([approved], [none, review]);
    expect(s).toMatchObject({
      total: 3,
      oneTime: 1,
      regular: 2,
      needsReport: 1,
      inReview: 1,
      approved: 1,
      unpaid: 1,
      feesPaid: 750,
    });
  });

  it("tabs choose which lists and rows show", () => {
    const o = [approved, none];
    const r = [review];
    expect(applyRequestTab("all", o, r)).toEqual({ oneTime: o, regular: r });
    expect(applyRequestTab("oneTime", o, r)).toEqual({
      oneTime: o,
      regular: [],
    });
    expect(applyRequestTab("regular", o, r)).toEqual({
      oneTime: [],
      regular: r,
    });
    expect(applyRequestTab("none", o, r)).toEqual({
      oneTime: [none],
      regular: [],
    });
    expect(applyRequestTab("review", o, r)).toEqual({
      oneTime: [],
      regular: [review],
    });
    expect(applyRequestTab("approved", o, r)).toEqual({
      oneTime: [approved],
      regular: [],
    });
  });
});
