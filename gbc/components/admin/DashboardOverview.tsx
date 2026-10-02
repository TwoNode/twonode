"use client";

import { Ticket, DollarSign, CheckCircle, Clock } from "lucide-react";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { StatCard } from "@/components/dashboard/StatCard";
import { GBC_GRADIENTS } from "@/gbc/colors";

export interface DashboardOverviewStats {
  completedTickets: number;
  checkedInTickets: number;
  pendingTickets: number;
  availableTickets: number;
  totalRevenue: number;
}

/**
 * Lucide icon components are functions — a Server Component (the admin
 * dashboard's page.tsx) can't pass them as props into a Client Component
 * (StatCard/DashboardHero) without React throwing "Functions cannot be
 * passed directly to Client Components". Same gotcha DashboardShell's own
 * doc comment already flags; the fix there was resolving icons
 * client-side instead of on the server, which is what this component
 * does — page.tsx now only passes plain numbers down.
 */
export function DashboardOverview({
  userName,
  stats,
}: {
  userName: string;
  stats: DashboardOverviewStats;
}) {
  return (
    <>
      <DashboardHero
        greeting={`Welcome back, ${userName}.`}
        title="Dashboard"
        description="Ticket sales, check-ins, and payments update automatically as attendees register and check in."
        pills={[
          `${stats.completedTickets} Sold`,
          `${stats.checkedInTickets} Checked In`,
          `${stats.pendingTickets} Pending`,
        ]}
        gradient={GBC_GRADIENTS.hero}
        cta={{
          label: "Tickets",
          href: "/gbc-restricted/tickets",
          icon: Ticket,
        }}
        className="mb-6 sm:mb-8"
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4 mb-6 sm:mb-8">
        <StatCard
          label="Total Tickets Sold"
          value={stats.completedTickets}
          breakdown={`${stats.availableTickets} remaining`}
          icon={Ticket}
          tone="brand"
        />
        <StatCard
          label="Total Revenue"
          value={`₦${(stats.totalRevenue / 1000).toFixed(0)}K`}
          breakdown="From completed sales"
          icon={DollarSign}
          tone="success"
        />
        <StatCard
          label="Checked In"
          value={stats.checkedInTickets}
          breakdown={`${stats.completedTickets - stats.checkedInTickets} pending`}
          icon={CheckCircle}
          tone="info"
        />
        <StatCard
          label="Pending Payments"
          value={stats.pendingTickets}
          breakdown="Awaiting payment"
          icon={Clock}
          tone="warning"
        />
      </div>
    </>
  );
}
