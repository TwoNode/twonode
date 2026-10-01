import type { BadgeTone } from "@/components/dashboard/DashboardBadge";

/** Shared status -> badge-tone mapping, used by the dashboard stat/list cards and the topbar search results. */
export function surfboardPlanStatusTone(status: string): BadgeTone {
  switch (status) {
    case "LODGED":
      return "success";
    case "PENDING":
      return "warning";
    case "QUERIED":
      return "danger";
    case "UNDER_REVIEW":
      return "info";
    default:
      return "neutral";
  }
}

export function surfboardPlanStatusLabel(status: string): string {
  if (status === "UNDER_REVIEW") return "Under Review";
  if (!status) return "Unknown";
  return status.charAt(0) + status.slice(1).toLowerCase();
}
