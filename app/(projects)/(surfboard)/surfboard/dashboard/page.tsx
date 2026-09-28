"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiRefreshCw } from "react-icons/fi";
import {
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { surfboardApi } from "@/surfboard/apiClient";
import { AnalyticsDashboard } from "./analytics/AnalyticsDashboard";
import { SURFBOARD_COLORS } from "@/surfboard/colors";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { DashboardBadge } from "@/components/dashboard/DashboardBadge";
import { DateRangeFilter, type DateRangeValue } from "@/components/dashboard/DateRangeFilter";
import {
  surfboardPlanStatusLabel,
  surfboardPlanStatusTone,
} from "@/surfboard/statusTone";

interface Plan {
  id: string;
  planNumber: string;
  surveyTitle: string; // Changed from title to surveyTitle
  status: string;
  updatedAt: string | Date;
  createdAt: string | Date;
  facilitator?: string;
  isOwner?: boolean;
}

export default function DashboardHome() {
  const [activeTab, setActiveTab] = useState<"analytics" | "recent" | "shared">(
    "analytics"
  );
  const [stats, setStats] = useState({
    totalPlans: 0,
    sharedPlans: 0,
    pending: 0,
    lodged: 0,
    queried: 0,
    underReview: 0,
  });

  const [recentPlans, setRecentPlans] = useState<Plan[]>([]);
  const [sharedPlans, setSharedPlans] = useState<Plan[]>([]);
  const [planHealth, setPlanHealth] = useState({ sharedAwaitingResponse: 0, qrEarningsThisMonth: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState<DateRangeValue>({});
  const [firstName, setFirstName] = useState("");

  useEffect(() => {
    surfboardApi.profile.get().then((res) => {
      if (res.success) setFirstName(res.data.firstName || "");
    });
  }, []);

  const timeOfDayGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setRefreshing(true);
      setError(null);

      const dateFilters = { dateFrom: dateRange.from, dateTo: dateRange.to };
      const [plansResult, sharedResult, sharedWithMeResult, sharedAwaitingResponseResult, earningsThisMonthResult] =
        await Promise.all([
          surfboardApi.plans.list({ noPagination: true, filters: dateFilters }),
          surfboardApi.plans.shared(undefined, undefined, dateFilters),
          surfboardApi.plans.sharedWithMe(undefined, undefined, dateFilters),
          surfboardApi.plans.sharedAwaitingResponseCount(),
          surfboardApi.qr.earningsThisMonth(),
        ]);

      setPlanHealth({
        sharedAwaitingResponse: sharedAwaitingResponseResult.success ? sharedAwaitingResponseResult.data.count : 0,
        qrEarningsThisMonth: earningsThisMonthResult.success ? earningsThisMonthResult.data.amount : 0,
      });

      if (
        plansResult.success &&
        sharedResult.success &&
        sharedWithMeResult.success
      ) {
        const plans = plansResult.data?.plans || [];
        const sharedPlans = sharedResult.data || [];
        const sharedWithMe = sharedWithMeResult.data || [];

        // Calculate stats
        const totalPlans = plans.length || 0;
        const pending =
          plans.filter((plan: any) => plan.status === "PENDING").length || 0;
        const lodged =
          plans.filter((plan: any) => plan.status === "LODGED").length || 0;
        const queried =
          plans.filter((plan: any) => plan.status === "QUERIED").length || 0;
        const underReview =
          plans.filter((plan: any) => plan.status === "UNDER_REVIEW").length ||
          0;

        setStats({
          totalPlans,
          sharedPlans:
            typeof sharedPlans === "object" && "plans" in sharedPlans
              ? sharedPlans.plans.length || 0
              : 0,
          pending,
          lodged,
          queried,
          underReview,
        });

        // Get recent plans (last 5 updated)
        const recent = [...plans]
          .sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          )
          .slice(0, 5);

        setRecentPlans(recent);
        if (
          sharedWithMe &&
          typeof sharedWithMe === "object" &&
          "plans" in sharedWithMe
        ) {
          setSharedPlans(sharedWithMe.plans);
        }
      } else {
        setError("Failed to load data. Please try again.");
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("An error occurred while fetching data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange.from, dateRange.to]);

  const handleRefresh = () => {
    fetchData();
  };

  const STATUS_ICON: Record<string, typeof CheckCircle> = {
    LODGED: CheckCircle,
    PENDING: Clock,
    QUERIED: AlertCircle,
    UNDER_REVIEW: CheckCircle,
  };

  const getStatusBadge = (status: string) => (
    <DashboardBadge tone={surfboardPlanStatusTone(status)} icon={STATUS_ICON[status]}>
      {surfboardPlanStatusLabel(status)}
    </DashboardBadge>
  );

  return (
    <div className="space-y-6">
      <DashboardHero
        greeting={firstName ? `${timeOfDayGreeting()}, ${firstName}` : "Welcome back."}
        title="Dashboard"
        description="Here's what's happening with your survey plans, real-time updates as you store, secure and submit record copies of your plans."
        pills={[
          `${stats.totalPlans} Plans`,
          `${stats.sharedPlans} Shared`,
          `${stats.pending} Pending`,
        ]}
        gradient={`linear-gradient(120deg, #0A0F16 0%, ${SURFBOARD_COLORS.primary.dark} 55%, ${SURFBOARD_COLORS.primary.main} 100%)`}
        cta={{ label: "New Plan", href: "/surfboard/dashboard/newplan", icon: Plus }}
      />

      {/* Tabs + Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-white/10 dark:bg-white/5">
          {(
            [
              { id: "analytics", label: "Analytics" },
              { id: "recent", label: "Recent Activity" },
              { id: "shared", label: "Shared with Me" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? "bg-white text-[#1D4ED8] shadow-sm dark:bg-white/10 dark:text-white"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="flex flex-wrap items-center gap-3">
          <DateRangeFilter value={dateRange} onChange={setDateRange} />

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center px-4 py-2 border rounded-lg shadow-sm text-sm font-medium border-gray-300 text-gray-700 bg-white hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-gray-200 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2563EB] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiRefreshCw
              className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {error && (
          <div
            className="border-l-4 p-4 mb-6"
            style={{
              backgroundColor: `${SURFBOARD_COLORS.error.main}1A`,
              borderColor: SURFBOARD_COLORS.error.main,
            }}
          >
            <div className="flex">
              <div className="shrink-0">
                <svg
                  className="h-5 w-5"
                  style={{ color: SURFBOARD_COLORS.error.main }}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p
                  className="text-sm"
                  style={{ color: SURFBOARD_COLORS.error.dark }}
                >
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "analytics" && (
          <AnalyticsDashboard
            dateRange={dateRange}
            planHealth={{
              lodged: stats.lodged,
              totalPlans: stats.totalPlans,
              queried: stats.queried,
              underReview: stats.underReview,
              sharedAwaitingResponse: planHealth.sharedAwaitingResponse,
              qrEarningsThisMonth: planHealth.qrEarningsThisMonth,
            }}
          />
        )}

        {activeTab === "recent" && (
          <div className="bg-white shadow-sm overflow-hidden rounded-2xl border border-gray-200 dark:bg-white/3 dark:shadow-none dark:border-white/10">
            <ul role="list" className="divide-y divide-gray-200 dark:divide-white/10">
              {recentPlans.length > 0 ? (
                recentPlans.map((plan) => (
                  <li key={plan.id}>
                    <Link
                      href={`/surfboard/dashboard/plan?planId=${plan.id}`}
                      className="block hover:bg-gray-50 dark:hover:bg-white/5"
                    >
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-[#2563EB] truncate">
                            {plan.planNumber} - {plan.surveyTitle}
                          </p>
                          <div className="ml-2 shrink-0 flex">
                            {getStatusBadge(plan.status)}
                          </div>
                        </div>
                        <div className="mt-2 flex justify-between">
                          <div className="sm:flex">
                            <p className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                              {plan.facilitator || "No facilitator"}
                            </p>
                          </div>
                          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                            <p>
                              Updated{" "}
                              <time
                                dateTime={new Date(
                                  plan?.updatedAt || ""
                                ).toISOString()}
                              >
                                {new Date(
                                  plan?.updatedAt || ""
                                ).toLocaleDateString()}
                              </time>
                            </p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500 dark:text-gray-400">No recent plans found</p>
                </div>
              )}
            </ul>
          </div>
        )}

        {activeTab === "shared" && (
          <div className="bg-white shadow-sm overflow-hidden rounded-2xl border border-gray-200 dark:bg-white/3 dark:shadow-none dark:border-white/10">
            <ul role="list" className="divide-y divide-gray-200 dark:divide-white/10">
              {sharedPlans.length > 0 ? (
                sharedPlans.map((plan) => (
                  <li key={plan.id}>
                    <Link
                      href={`/surfboard/dashboard/plan?planId=${plan.id}`}
                      className="block hover:bg-gray-50 dark:hover:bg-white/5"
                    >
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-[#2563EB] truncate">
                            {plan.planNumber} - {plan.surveyTitle}
                          </p>
                          <div className="ml-2 shrink-0 flex">
                            {getStatusBadge(plan.status)}
                            {!plan.isOwner && (
                              <span
                                className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                                style={{
                                  backgroundColor: `${SURFBOARD_COLORS.secondary.main}1A`,
                                  color: SURFBOARD_COLORS.secondary.dark,
                                }}
                              >
                                Shared
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 flex justify-between">
                          <div className="sm:flex">
                            <p className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                              {plan.facilitator || "No facilitator"}
                            </p>
                          </div>
                          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                            <p>
                              Shared on{" "}
                              <time
                                dateTime={new Date(
                                  plan?.updatedAt || ""
                                ).toISOString()}
                              >
                                {new Date(
                                  plan?.updatedAt || ""
                                ).toLocaleDateString()}
                              </time>
                            </p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500 dark:text-gray-400">No shared plans found</p>
                </div>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
