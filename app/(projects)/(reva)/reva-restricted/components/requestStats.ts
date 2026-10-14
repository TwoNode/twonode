/** Counting helpers for the REVA admin request page (cards and tabs). Pure, so they are tested. */

export type ReportState = "none" | "review" | "approved";

type RequestLike = {
  report?: { isApproved?: boolean | null } | null;
  paymentStatus?: string | null;
  totalCost?: number | null;
};

export const reportStateOf = (request: RequestLike): ReportState =>
  !request.report ? "none" : request.report.isApproved ? "approved" : "review";

export type RequestTab =
  "all" | "oneTime" | "regular" | "none" | "review" | "approved";

/** The requests a tab shows, from the two lists (one-time and regular). */
export function applyRequestTab<T extends RequestLike>(
  tab: RequestTab,
  oneTime: T[],
  regular: T[]
): { oneTime: T[]; regular: T[] } {
  switch (tab) {
    case "all":
      return { oneTime, regular };
    case "oneTime":
      return { oneTime, regular: [] };
    case "regular":
      return { oneTime: [], regular };
    default:
      return {
        oneTime: oneTime.filter((r) => reportStateOf(r) === tab),
        regular: regular.filter((r) => reportStateOf(r) === tab),
      };
  }
}

export function summarizeRequests<T extends RequestLike>(
  oneTime: T[],
  regular: T[]
) {
  const all = [...oneTime, ...regular];
  const count = (state: ReportState) =>
    all.filter((r) => reportStateOf(r) === state).length;
  return {
    total: all.length,
    oneTime: oneTime.length,
    regular: regular.length,
    needsReport: count("none"),
    inReview: count("review"),
    approved: count("approved"),
    unpaid: all.filter((r) => r.paymentStatus === "Unpaid").length,
    feesPaid: all
      .filter((r) => r.paymentStatus === "Paid")
      .reduce((sum, r) => sum + (Number(r.totalCost) || 0), 0),
  };
}
