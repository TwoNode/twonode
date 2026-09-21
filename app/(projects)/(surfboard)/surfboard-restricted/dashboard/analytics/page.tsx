"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { surfboardApi } from "@/surfboard/apiClient";
import type {
  StatCards,
  DimensionBreakdownRow,
  TimeTrendPoint,
  TopSurveyorRow,
} from "@/surfboard/services/analyticsService";

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  admins: number;
  superAdmins: number;
  regularUsers: number;
  usersWithActiveSubscriptions: number;
}

interface RecentActivityItem {
  id: string;
  action: string;
  entity: string;
  createdAt: string | Date;
  user?: { firstName: string; lastName: string; email: string } | null;
}

export default function AnalyticsPage() {
  const [statCards, setStatCards] = useState<StatCards | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [topLgas, setTopLgas] = useState<DimensionBreakdownRow[]>([]);
  const [topSurveyors, setTopSurveyors] = useState<TopSurveyorRow[]>([]);
  const [trend, setTrend] = useState<TimeTrendPoint[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [statsRes, usersRes, lgaRes, surveyorRes, trendRes, activityRes] =
        await Promise.all([
          surfboardApi.analytics.stats(),
          surfboardApi.admin.users.stats(),
          surfboardApi.analytics.dimension("lga"),
          surfboardApi.analytics.topSurveyors(5),
          surfboardApi.analytics.timeTrend(),
          surfboardApi.admin.auditLogs.list({ page: 1, pageSize: 6 }),
        ]);

      if (statsRes.success) setStatCards(statsRes.data);
      if (usersRes.success) setUserStats(usersRes.data);
      if (lgaRes.success) setTopLgas((lgaRes.data || []).slice(0, 5));
      if (surveyorRes.success) setTopSurveyors(surveyorRes.data || []);
      if (trendRes.success) setTrend(trendRes.data || []);
      if (activityRes.success) setRecentActivity(activityRes.data?.data || []);

      setLoading(false);
    };

    load();
  }, []);

  const maxTrendCount = Math.max(1, ...trend.map((t) => t.count));
  const maxLgaCount = Math.max(1, ...topLgas.map((t) => t.count));
  const maxSurveyorCount = Math.max(1, ...topSurveyors.map((t) => t.count));

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 dark:from-background dark:to-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Loading analytics...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 dark:from-background dark:to-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white dark:bg-surface rounded-xl border border-gray-100 dark:border-white/10 shadow-sm p-6 mb-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                  Analytics Dashboard
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  Platform-wide plan and user metrics, all-time
                </p>
              </div>
              <button
                onClick={() => router.push("/surfboard-restricted/dashboard")}
                className="shrink-0 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatTile
              label="Total Plans"
              value={statCards?.totalPlansCount ?? 0}
              color="blue"
            />
            <StatTile
              label="Provisional Plans"
              value={statCards?.provisionalPlansCount ?? 0}
              color="purple"
            />
            <StatTile
              label="Pending Batches"
              value={statCards?.pendingBatchesCount ?? 0}
              color="yellow"
            />
            <StatTile
              label="Pending Certificates"
              value={statCards?.pendingCertificatePlansCount ?? 0}
              color="green"
            />
          </div>

          {/* Charts and Detailed Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="space-y-8">
            {/* Top LGAs */}
            <div className="bg-white dark:bg-surface rounded-xl border border-gray-100 dark:border-white/10 shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Top LGAs by Plan Count
              </h2>
              {topLgas.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No plan data yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {topLgas.map((row, index) => (
                    <div key={row.key} className="flex items-center gap-3">
                      <div className="w-6 h-6 shrink-0 bg-blue-100 dark:bg-blue-500/15 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-semibold text-xs">
                        {index + 1}
                      </div>
                      <span className="w-32 shrink-0 truncate text-gray-700 dark:text-gray-300 text-sm">
                        {row.key}
                      </span>
                      <div className="flex-1 bg-gray-100 dark:bg-white/10 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${(row.count / maxLgaCount) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="w-12 shrink-0 text-right text-gray-900 dark:text-white font-semibold text-sm">
                        {row.count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top surveyors */}
            <div className="bg-white dark:bg-surface rounded-xl border border-gray-100 dark:border-white/10 shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Top Surveyors by Plan Count
              </h2>
              {topSurveyors.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No plan data yet.
                </p>
              ) : (
                <ol className="space-y-4">
                  {topSurveyors.map((row, index) => (
                    <li key={row.userId} className="flex items-center gap-3">
                      <div className="w-6 h-6 shrink-0 bg-blue-100 dark:bg-blue-500/15 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-semibold text-xs">
                        {index + 1}
                      </div>
                      <div className="w-40 shrink-0 min-w-0">
                        <p className="truncate text-sm text-gray-800 dark:text-gray-200">{row.name}</p>
                        {row.companyName && (
                          <p className="truncate text-xs text-gray-500 dark:text-gray-400">{row.companyName}</p>
                        )}
                      </div>
                      <div className="flex-1 bg-gray-100 dark:bg-white/10 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${(row.count / maxSurveyorCount) * 100}%` }}
                        />
                      </div>
                      <span className="w-12 shrink-0 text-right text-gray-900 dark:text-white font-semibold text-sm">
                        {row.count}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white dark:bg-surface rounded-xl border border-gray-100 dark:border-white/10 shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Recent Activity
              </h2>
              {recentActivity.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No recent activity.
                </p>
              ) : (
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="border-l-4 border-blue-500 pl-4"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-gray-900 dark:text-white font-medium truncate">
                            {activity.action.replace(/_/g, " ")}
                          </p>
                          <p className="text-gray-600 dark:text-gray-400 text-sm truncate">
                            {activity.user
                              ? `${activity.user.firstName} ${activity.user.lastName}`
                              : "System"}
                            {" · "}
                            {activity.entity}
                          </p>
                        </div>
                        <div className="text-gray-400 dark:text-gray-500 text-xs shrink-0">
                          {new Date(activity.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Additional Analytics Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 12-Month Creation Trend */}
            <div className="bg-white dark:bg-surface rounded-xl border border-gray-100 dark:border-white/10 shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Plans Created — Last 12 Months
              </h3>
              {trend.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No plan data yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {trend.map((point) => (
                    <div key={point.period} className="flex items-center gap-3">
                      <span className="w-16 shrink-0 text-xs text-gray-600 dark:text-gray-400">
                        {point.period}
                      </span>
                      <div className="flex-1 bg-gray-100 dark:bg-white/10 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{
                            width: `${(point.count / maxTrendCount) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="w-10 shrink-0 text-right text-sm font-semibold text-gray-900 dark:text-white">
                        {point.count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* User Engagement */}
            <div className="bg-white dark:bg-surface rounded-xl border border-gray-100 dark:border-white/10 shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                User Engagement
              </h3>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {userStats && userStats.totalUsers > 0
                    ? Math.round(
                        (userStats.activeUsers / userStats.totalUsers) * 100,
                      )
                    : 0}
                  %
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  Active User Rate
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  {userStats?.activeUsers ?? 0} of {userStats?.totalUsers ?? 0}{" "}
                  users
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {userStats?.usersWithActiveSubscriptions ?? 0} with active
                  subscriptions
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "blue" | "purple" | "yellow" | "green";
}) {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400",
    purple:
      "bg-purple-100 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400",
    yellow:
      "bg-yellow-100 dark:bg-yellow-500/15 text-yellow-600 dark:text-yellow-400",
    green:
      "bg-green-100 dark:bg-green-500/15 text-green-600 dark:text-green-400",
  };

  return (
    <div className="bg-white dark:bg-surface rounded-xl border border-gray-100 dark:border-white/10 shadow-sm p-6">
      <div className="flex items-center">
        <div className={`p-3 rounded-full ${colorClasses[color]}`}>
          <div className="w-6 h-6" />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {label}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {value.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
