"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface AnalyticsData {
  totalPlans: number;
  activePlans: number;
  completedPlans: number;
  totalUsers: number;
  activeUsers: number;
  totalSurveys: number;
  monthlyGrowth: number;
  topPerformingRegions: Array<{
    region: string;
    plans: number;
    growth: number;
  }>;
  recentActivity: Array<{
    id: string;
    action: string;
    user: string;
    timestamp: string;
    details: string;
  }>;
}

export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("30d");
  const router = useRouter();

  useEffect(() => {
    // Simulate fetching analytics data
    const fetchAnalyticsData = async () => {
      setLoading(true);
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mock data - in real app, this would come from API
      const mockData: AnalyticsData = {
        totalPlans: 1247,
        activePlans: 89,
        completedPlans: 1158,
        totalUsers: 342,
        activeUsers: 156,
        totalSurveys: 2891,
        monthlyGrowth: 12.5,
        topPerformingRegions: [
          { region: "Western Cape", plans: 234, growth: 15.2 },
          { region: "Gauteng", plans: 198, growth: 8.7 },
          { region: "KwaZulu-Natal", plans: 156, growth: 12.1 },
          { region: "Eastern Cape", plans: 134, growth: 6.3 },
        ],
        recentActivity: [
          {
            id: "1",
            action: "Plan Created",
            user: "John Smith",
            timestamp: "2024-01-15T10:30:00Z",
            details: "New survey plan created for Cape Town CBD",
          },
          {
            id: "2",
            action: "Plan Approved",
            user: "Sarah Johnson",
            timestamp: "2024-01-15T09:15:00Z",
            details: "Survey plan #SP-2024-001 approved",
          },
          {
            id: "3",
            action: "User Registered",
            user: "Mike Wilson",
            timestamp: "2024-01-15T08:45:00Z",
            details: "New user registration completed",
          },
          {
            id: "4",
            action: "Data Export",
            user: "Admin User",
            timestamp: "2024-01-15T08:00:00Z",
            details: "Bulk data export for Q4 2023",
          },
        ],
      };

      setAnalyticsData(mockData);
      setLoading(false);
    };

    fetchAnalyticsData();
  }, [selectedPeriod]);

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 dark:from-background dark:to-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 dark:from-background dark:to-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Failed to load analytics data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 dark:from-background dark:to-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white dark:bg-surface rounded-xl border border-gray-100 dark:border-white/10 shadow-sm hover:shadow-md transition-shadow p-6 mb-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                  Analytics Dashboard
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  Comprehensive insights into platform usage and performance
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="px-4 py-2 border border-gray-300 dark:border-white/15 rounded-lg bg-white dark:bg-surface text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                  <option value="1y">Last year</option>
                </select>
                <button
                  onClick={() => router.push("/surfboard-restricted/dashboard")}
                  className="shrink-0 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-surface rounded-xl border border-gray-100 dark:border-white/10 shadow-sm hover:shadow-md transition-shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Plans
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {analyticsData.totalPlans.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-surface rounded-xl border border-gray-100 dark:border-white/10 shadow-sm hover:shadow-md transition-shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100 dark:bg-green-500/15 text-green-600 dark:text-green-400">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Active Users
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {analyticsData.activeUsers}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-surface rounded-xl border border-gray-100 dark:border-white/10 shadow-sm hover:shadow-md transition-shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Monthly Growth
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    +{analyticsData.monthlyGrowth}%
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-surface rounded-xl border border-gray-100 dark:border-white/10 shadow-sm hover:shadow-md transition-shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-500/15 text-yellow-600 dark:text-yellow-400">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Surveys
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {analyticsData.totalSurveys.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts and Detailed Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Top Performing Regions */}
            <div className="bg-white dark:bg-surface rounded-xl border border-gray-100 dark:border-white/10 shadow-sm hover:shadow-md transition-shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Top Performing Regions
              </h2>
              <div className="space-y-4">
                {analyticsData.topPerformingRegions.map((region, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-500/15 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-semibold text-sm">
                        {index + 1}
                      </div>
                      <span className="ml-3 text-gray-700 dark:text-gray-300">
                        {region.region}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-gray-900 dark:text-white font-semibold">
                        {region.plans} plans
                      </div>
                      <div className="text-green-600 text-sm">
                        +{region.growth}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white dark:bg-surface rounded-xl border border-gray-100 dark:border-white/10 shadow-sm hover:shadow-md transition-shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Recent Activity
              </h2>
              <div className="space-y-4">
                {analyticsData.recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="border-l-4 border-blue-500 pl-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-900 dark:text-white font-medium">
                          {activity.action}
                        </p>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">{activity.user}</p>
                        <p className="text-gray-500 dark:text-gray-400 text-xs">
                          {activity.details}
                        </p>
                      </div>
                      <div className="text-gray-400 dark:text-gray-500 text-xs">
                        {new Date(activity.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Additional Analytics Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Plan Status Distribution */}
            <div className="bg-white dark:bg-surface rounded-xl border border-gray-100 dark:border-white/10 shadow-sm hover:shadow-md transition-shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Plan Status Distribution
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Active Plans</span>
                  <span className="font-semibold">
                    {analyticsData.activePlans}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-white/10 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{
                      width: `${
                        (analyticsData.activePlans / analyticsData.totalPlans) *
                        100
                      }%`,
                    }}
                  ></div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Completed Plans</span>
                  <span className="font-semibold">
                    {analyticsData.completedPlans}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-white/10 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{
                      width: `${
                        (analyticsData.completedPlans /
                          analyticsData.totalPlans) *
                        100
                      }%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>

            {/* User Engagement */}
            <div className="bg-white dark:bg-surface rounded-xl border border-gray-100 dark:border-white/10 shadow-sm hover:shadow-md transition-shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                User Engagement
              </h3>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {Math.round(
                    (analyticsData.activeUsers / analyticsData.totalUsers) * 100
                  )}
                  %
                </div>
                <p className="text-gray-600 dark:text-gray-400">Active User Rate</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  {analyticsData.activeUsers} of {analyticsData.totalUsers}{" "}
                  users
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-surface rounded-xl border border-gray-100 dark:border-white/10 shadow-sm hover:shadow-md transition-shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Quick Actions
              </h3>
              <div className="space-y-3">
                <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                  Export Analytics Report
                </button>
                <button className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm">
                  Generate Insights
                </button>
                <button className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm">
                  Schedule Report
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
