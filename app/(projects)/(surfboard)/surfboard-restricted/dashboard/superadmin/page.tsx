"use client";

import React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { surfboardApi } from "@/surfboard/apiClient";
import { Platform } from "@/utils/platform";
import { ConfirmedLogoutLink } from "@/components/ConfirmedLogoutLink";
import type { StatCards } from "@/surfboard/services/analyticsService";

interface UserData {
  platform: string;
  role: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface UserStats {
  totalUsers: number;
  admins: number;
  superAdmins: number;
}

interface ActivityItem {
  id: string;
  action: string;
  entity: string;
  createdAt: string | Date;
  user?: { firstName: string; lastName: string } | null;
}

export default function SurfboardSuperAdminPage() {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statCards, setStatCards] = useState<StatCards | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const router = useRouter();

  useEffect(() => {
    const loadStats = async () => {
      const [statsRes, usersRes, activityRes] = await Promise.all([
        surfboardApi.analytics.stats(),
        surfboardApi.admin.users.stats(),
        surfboardApi.admin.auditLogs.list({ page: 1, pageSize: 5 }),
      ]);
      if (statsRes.success) setStatCards(statsRes.data);
      if (usersRes.success) setUserStats(usersRes.data);
      if (activityRes.success) setRecentActivity(activityRes.data?.data || []);
    };
    loadStats();
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const result = await surfboardApi.session.get();
        if (result.success && result.data) {
          const data = result.data;

          // Multi-platform awareness: Get specifically the Surfboard portal session
          const surfboardSession =
            data.platforms?.[Platform.SURFBOARD] ||
            (data.platform === Platform.SURFBOARD ? { role: data.role } : null);

          if (!surfboardSession || surfboardSession.role !== "SUPERADMIN") {
            console.log("❌ Unauthorized access to SuperAdmin dashboard");
            router.push("/surfboard-restricted/login");
            return;
          }

          setUserData({
            ...data,
            platform: Platform.SURFBOARD,
            role: surfboardSession.role,
          });
        } else {
          router.push("/surfboard-restricted/login");
          return;
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        router.push("/surfboard-restricted/login");
        return;
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 dark:from-background dark:to-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!userData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 dark:from-background dark:to-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="bg-white dark:bg-surface rounded-lg shadow-lg p-6 mb-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                  Surfboard SuperAdmin Dashboard
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  Welcome back, {userData.firstName} {userData.lastName}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Platform: {userData.platform} | Role: {userData.role}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <button
                  onClick={() => router.push("/surfboard-restricted/dashboard")}
                  className="shrink-0 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Admin Dashboard
                </button>
                <ConfirmedLogoutLink
                  onConfirm={() => {
                    fetch("/api/auth/logout_redirect");
                    router.push("/surfboard-restricted/login");
                  }}
                  trigger={
                    <button className="shrink-0 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                      Logout
                    </button>
                  }
                />
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* User Management */}
            <div className="bg-white dark:bg-surface rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                User Management
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Manage all Surfboard users, roles, and permissions.
              </p>
              <button
                onClick={() =>
                  router.push("/surfboard-restricted/dashboard/user-management")
                }
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Manage Users
              </button>
            </div>

            {/* System Settings */}
            <div className="bg-white dark:bg-surface rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                System Settings
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Configure platform settings, integrations, and system
                preferences.
              </p>
              <button
                onClick={() =>
                  router.push("/surfboard-restricted/dashboard/admin-tools")
                }
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                System Settings
              </button>
            </div>

            {/* Analytics */}
            <div className="bg-white dark:bg-surface rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Analytics & Reports
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                View detailed analytics, reports, and platform insights.
              </p>
              <button
                onClick={() =>
                  router.push("/surfboard-restricted/dashboard/analytics")
                }
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                View Analytics
              </button>
            </div>

            {/* Secure Plans */}
            <div className="bg-white dark:bg-surface rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Secure Plans
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Review, approve, and manage confidential survey plans.
              </p>
              <button
                onClick={() =>
                  router.push("/surfboard-restricted/dashboard/secure-plans")
                }
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Manage Plans
              </button>
            </div>

            {/* Security */}
            <div className="bg-white dark:bg-surface rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Security & Access
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Monitor security logs, manage access controls, and audit trails.
              </p>
              <button
                onClick={() =>
                  router.push("/surfboard-restricted/dashboard/admin-tools")
                }
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Security Dashboard
              </button>
            </div>
          </div>

          {/* Platform Overview */}
          <div className="mt-8 bg-white dark:bg-surface rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Platform Overview
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {userStats?.totalUsers ?? "—"}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Total Users
                </div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {(userStats?.admins ?? 0) + (userStats?.superAdmins ?? 0) ||
                    "—"}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Admins
                </div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {statCards?.pendingBatchesCount ?? "—"}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Pending Batches
                </div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {statCards?.pendingCertificatePlansCount ?? "—"}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Pending Certificates
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="mt-8 bg-white dark:bg-surface rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Recent System Activity
            </h2>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No recent activity.
              </p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-3 shrink-0"></div>
                      <span className="text-gray-900 dark:text-white">
                        {activity.action.replace(/_/g, " ")}
                        {activity.user
                          ? ` · ${activity.user.firstName} ${activity.user.lastName}`
                          : ""}
                      </span>
                    </div>
                    <span className="text-gray-500 dark:text-gray-400 shrink-0 ml-3">
                      {formatDistanceToNow(new Date(activity.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
