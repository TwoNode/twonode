import { parsePageParams } from "@/lib/api/pagination";
import { firstParam } from "@/lib/searchParams";

export type CheckedInFilter = "all" | "yes" | "no";

type RawParams = Record<string, string | string[] | undefined>;

export interface TicketListParams {
  search?: string;
  checkedIn: CheckedInFilter;
  /** "all" or an edition key. */
  edition: string;
  page: number;
  pageSize: number;
}

/**
 * One parser for the Attendees page, the Certificates page and the
 * select-all endpoint, so a URL means the same list everywhere. `defaults`
 * exists because the two pages open on different check-in views.
 */
export function parseTicketListParams(
  raw: RawParams,
  defaults: { checkedIn: CheckedInFilter }
): TicketListParams {
  const checkedIn = firstParam(raw.checkedIn);
  const { page, pageSize } = parsePageParams({ page: firstParam(raw.page), pageSize: firstParam(raw.pageSize) });

  return {
    search: firstParam(raw.search)?.trim() || undefined,
    checkedIn: checkedIn === "all" || checkedIn === "yes" || checkedIn === "no" ? checkedIn : defaults.checkedIn,
    edition: firstParam(raw.edition) || "all",
    page,
    pageSize,
  };
}

/** Maps the URL-shaped params onto the service-layer filter object. */
export function toTicketFilters(params: Pick<TicketListParams, "search" | "checkedIn" | "edition">) {
  return {
    search: params.search,
    checkedIn: params.checkedIn === "all" ? undefined : params.checkedIn === "yes",
    edition: params.edition === "all" ? undefined : params.edition,
  };
}
