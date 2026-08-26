"use client";

import React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUserData } from "@/app/(projects)/(surfboard)/actions/authActions";
import { Platform } from "@/utils/platform";

interface UserData {
  platform: string;
  role: string;
  email: string;
  firstName: string;
  lastName: string;
}

export default function SurfboardSuperAdminPage() {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const result = await getUserData();
        if (result.success && result.data) {
          const data = result.data;
          
          // Multi-platform awareness: Get specifically the Surfboard portal session
          const surfboardSession = data.platforms?.[Platform.SURFBOARD] || 
                                  (data.platform === Platform.SURFBOARD ? { role: data.role } : null);

          if (!surfboardSession || surfboardSession.role !== "SUPERADMIN") {
             console.log("❌ Unauthorized access to SuperAdmin dashboard");
             router.push("/surfboard-restricted/login");
             return;
          }

          setUserData({
              ...data,
              platform: Platform.SURFBOARD,
              role: surfboardSession.role
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
      <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!userData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Surfboard SuperAdmin Dashboard
                </h1>
                <p className="text-gray-600 mt-2">
                  Welcome back, {userData.firstName} {userData.lastName}
                </p>
                <p className="text-sm text-gray-500">
                  Platform: {userData.platform} | Role: {userData.role}
                </p>
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={() => router.push("/surfboard-restricted/dashboard")}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Admin Dashboard
                </button>
                <button
                  onClick={() => {
                    fetch("/api/auth/logout_redirect");
                    router.push("/surfboard-restricted/login");
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* User Management */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                User Management
              </h2>
              <p className="text-gray-600 mb-4">
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
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                System Settings
              </h2>
              <p className="text-gray-600 mb-4">
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
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Analytics & Reports
              </h2>
              <p className="text-gray-600 mb-4">
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
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Secure Plans
              </h2>
              <p className="text-gray-600 mb-4">
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
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Security & Access
              </h2>
              <p className="text-gray-600 mb-4">
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

            {/* Backup & Recovery */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Backup & Recovery
              </h2>
              <p className="text-gray-600 mb-4">
                Manage data backups, recovery procedures, and system
                maintenance.
              </p>
              <button className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                Backup Management
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Platform Overview
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">1,234</div>
                <div className="text-sm text-gray-600">Total Users</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">567</div>
                <div className="text-sm text-gray-600">Active Sessions</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">89</div>
                <div className="text-sm text-gray-600">Pending Requests</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">99.9%</div>
                <div className="text-sm text-gray-600">Uptime</div>
              </div>
            </div>
          </div>

          {/* System Health */}
          <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              System Health
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border border-green-200 rounded-lg bg-green-50">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                  <div>
                    <div className="font-semibold text-green-800">Database</div>
                    <div className="text-sm text-green-600">
                      All systems operational
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4 border border-green-200 rounded-lg bg-green-50">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                  <div>
                    <div className="font-semibold text-green-800">
                      API Services
                    </div>
                    <div className="text-sm text-green-600">
                      Running smoothly
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4 border border-green-200 rounded-lg bg-green-50">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                  <div>
                    <div className="font-semibold text-green-800">
                      File Storage
                    </div>
                    <div className="text-sm text-green-600">85% capacity</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Recent System Activity
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  <span className="text-gray-900">
                    System backup completed successfully
                  </span>
                </div>
                <span className="text-gray-500">2 hours ago</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  <span className="text-gray-900">
                    New user registration: john.doe@company.com
                  </span>
                </div>
                <span className="text-gray-500">4 hours ago</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></div>
                  <span className="text-gray-900">
                    Security scan completed - 0 threats found
                  </span>
                </div>
                <span className="text-gray-500">6 hours ago</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                  <span className="text-gray-900">
                    System maintenance window completed
                  </span>
                </div>
                <span className="text-gray-500">1 day ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
