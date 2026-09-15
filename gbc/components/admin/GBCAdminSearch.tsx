"use client";

import { useCallback } from "react";
import {
  DashboardSearch,
  type DashboardSearchResult,
} from "@/components/dashboard/DashboardSearch";
import { gbcApi } from "@/gbc/apiClient";
import { GBC_ROUTES } from "@/gbc/access/routes";
import type { BadgeTone } from "@/components/dashboard/DashboardBadge";

interface GBCAdminSearchProps {
  className?: string;
  placeholder?: string;
  variant?: "default" | "translucent";
}

export function GBCAdminSearch({
  className,
  placeholder = "Search tickets, attendees, sections…",
  variant = "default",
}: GBCAdminSearchProps) {
  const handleSearch = useCallback(async (query: string): Promise<DashboardSearchResult[]> => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return [];

    const results: DashboardSearchResult[] = [];

    // 1. Match GBC admin navigation routes
    const matchingRoutes = GBC_ROUTES.filter(
      (r) =>
        r.group === "admin" &&
        (r.label.toLowerCase().includes(trimmed) ||
          r.path.toLowerCase().includes(trimmed))
    ).slice(0, 3);

    for (const route of matchingRoutes) {
      results.push({
        id: `route-${route.path}`,
        title: route.label,
        subtitle: `Navigate to ${route.path}`,
        href: route.path,
        badge: { label: "Page", tone: "info" },
      });
    }

    // 2. Fetch matching tickets & attendees from GBC API
    try {
      const ticketsRes = await gbcApi.tickets.admin.list({
        search: query.trim(),
        limit: 5,
      });

      if (ticketsRes && ticketsRes.success && Array.isArray(ticketsRes.data)) {
        for (const ticket of ticketsRes.data) {
          const isCheckedIn = Boolean(ticket.checkedIn);
          const tone: BadgeTone = isCheckedIn
            ? "success"
            : ticket.paymentStatus === "COMPLETED"
              ? "neutral"
              : "warning";
          const badgeLabel = isCheckedIn
            ? "Checked In"
            : ticket.paymentStatus || "Ticket";

          results.push({
            id: `ticket-${ticket.ticketNumber}`,
            title: `${ticket.name} (${ticket.ticketNumber})`,
            subtitle: `${ticket.email} • ${ticket.ticketType || "Ticket"}`,
            href: `/gbc-restricted/tickets?search=${encodeURIComponent(ticket.ticketNumber)}`,
            badge: { label: badgeLabel, tone },
          });
        }
      }
    } catch {
      // If live ticket query fails, return route results gracefully
    }

    return results;
  }, []);

  return (
    <DashboardSearch
      placeholder={placeholder}
      onSearch={handleSearch}
      viewAllHref={(q) => `/gbc-restricted/tickets?search=${encodeURIComponent(q)}`}
      className={className}
      variant={variant}
    />
  );
}
