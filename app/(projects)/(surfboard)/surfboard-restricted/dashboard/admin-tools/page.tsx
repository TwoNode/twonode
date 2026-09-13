"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { surfboardApi } from "@/surfboard/apiClient";

interface UserStats {
  totalUsers: number;
  regularUsers: number;
  admins: number;
  superAdmins: number;
}

interface AuditLogItem {
  id: string;
  action: string;
  entity: string;
  createdAt: string | Date;
  user?: { firstName: string; lastName: string } | null;
}

const ROLE_INFO = [
  {
    key: "regularUsers",
    name: "USER",
    description: "Basic user with limited access",
  },
  {
    key: "admins",
    name: "ADMIN",
    description: "Administrator with management capabilities",
  },
  {
    key: "superAdmins",
    name: "SUPERADMIN",
    description: "Super administrator with full system access",
  },
] as const;

export default function AdminToolsPage() {
  const [activeTab, setActiveTab] = useState("system");
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [recentActions, setRecentActions] = useState<AuditLogItem[]>([]);
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      const [usersRes, logsRes] = await Promise.all([
        surfboardApi.admin.users.stats(),
        surfboardApi.admin.auditLogs.list({ page: 1, pageSize: 5 }),
      ]);
      if (usersRes.success) setUserStats(usersRes.data);
      if (logsRes.success) setRecentActions(logsRes.data?.data || []);
    };
    load();
  }, []);

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 dark:from-background dark:to-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="bg-white dark:bg-surface rounded-lg shadow-lg p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Admin Tools
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  System configuration, user roles, and administrative controls
                </p>
              </div>
              <button
                onClick={() => router.push("/surfboard-restricted/dashboard")}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="bg-white dark:bg-surface rounded-lg shadow-lg mb-8">
            <div className="border-b border-gray-200 dark:border-white/10 overflow-x-auto">
              <nav className="flex space-x-8 px-6 w-max min-w-full">
                <button
                  onClick={() => setActiveTab("system")}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "system"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  System Settings
                </button>
                <button
                  onClick={() => setActiveTab("roles")}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "roles"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  User Roles & Permissions
                </button>
                <button
                  onClick={() => setActiveTab("security")}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "security"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Security & Access
                </button>
              </nav>
            </div>

            <div className="p-6">
              {/* System Settings Tab */}
              {activeTab === "system" && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    System Configuration
                  </h2>
                  <div className="p-4 rounded-lg border border-yellow-300 bg-yellow-50 text-sm text-yellow-800">
                    Not built yet — maintenance mode, registration lockout,
                    upload limits, and session timeout have no backend
                    enforcement behind them, so this tab isn't shown until
                    that's decided and built. Let us know if you need one of
                    these controls and we can scope it properly.
                  </div>
                </div>
              )}

              {/* User Roles Tab */}
              {activeTab === "roles" && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    User Roles & Permissions
                  </h2>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {ROLE_INFO.map((role) => (
                      <div
                        key={role.name}
                        className="bg-gray-50 dark:bg-white/5 rounded-lg p-6"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {role.name}
                          </h3>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            {userStats ? userStats[role.key] : "—"} users
                          </span>
                        </div>

                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                          {role.description}
                        </p>

                        <button
                          onClick={() =>
                            router.push(
                              `/surfboard-restricted/dashboard/user-management?role=${role.name}`,
                            )
                          }
                          className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                        >
                          View Users
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === "security" && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Security & Access
                  </h2>

                  <div className="bg-white dark:bg-surface border border-gray-200 dark:border-white/10 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Recent Admin Actions
                      </h3>
                      <button
                        onClick={() =>
                          router.push(
                            "/surfboard-restricted/dashboard/audit-logs",
                          )
                        }
                        className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        View Full Audit Log
                      </button>
                    </div>
                    {recentActions.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No recent actions.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {recentActions.map((log) => (
                          <div
                            key={log.id}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-gray-600 dark:text-gray-400">
                              {log.action.replace(/_/g, " ")}
                              {log.user
                                ? ` · ${log.user.firstName} ${log.user.lastName}`
                                : ""}
                            </span>
                            <span className="text-gray-500 dark:text-gray-400">
                              {formatDistanceToNow(new Date(log.createdAt), {
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
