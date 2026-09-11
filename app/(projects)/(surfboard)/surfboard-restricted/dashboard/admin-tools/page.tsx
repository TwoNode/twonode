"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface SystemSettings {
  maintenanceMode: boolean;
  allowNewRegistrations: boolean;
  maxFileUploadSize: number;
  sessionTimeout: number;
  enableNotifications: boolean;
  backupFrequency: string;
}

interface UserRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  userCount: number;
}

export default function AdminToolsPage() {
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    maintenanceMode: false,
    allowNewRegistrations: true,
    maxFileUploadSize: 50,
    sessionTimeout: 30,
    enableNotifications: true,
    backupFrequency: "daily",
  });
  const [userRoles, setUserRoles] = useState<UserRole[]>([
    {
      id: "1",
      name: "USER",
      description: "Basic user with limited access",
      permissions: ["view_plans", "create_plans"],
      userCount: 245,
    },
    {
      id: "2",
      name: "ADMIN",
      description: "Administrator with management capabilities",
      permissions: [
        "view_plans",
        "create_plans",
        "approve_plans",
        "manage_users",
      ],
      userCount: 23,
    },
    {
      id: "3",
      name: "SUPERADMIN",
      description: "Super administrator with full system access",
      permissions: [
        "view_plans",
        "create_plans",
        "approve_plans",
        "manage_users",
        "system_settings",
        "security_controls",
      ],
      userCount: 3,
    },
  ]);
  const [activeTab, setActiveTab] = useState("system");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSettingChange = (key: keyof SystemSettings, value: any) => {
    setSystemSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const saveSystemSettings = async () => {
    setLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setLoading(false);
    alert("System settings saved successfully!");
  };

  const backupFrequencyOptions = [
    { value: "hourly", label: "Hourly" },
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
  ];

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
                  Manage system settings, user roles, and administrative
                  controls
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Maintenance Mode
                          </label>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Temporarily disable user access for maintenance
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            handleSettingChange(
                              "maintenanceMode",
                              !systemSettings.maintenanceMode
                            )
                          }
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            systemSettings.maintenanceMode
                              ? "bg-red-600"
                              : "bg-gray-200"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-surface transition-transform ${
                              systemSettings.maintenanceMode
                                ? "translate-x-6"
                                : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Allow New Registrations
                          </label>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Enable or disable new user registrations
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            handleSettingChange(
                              "allowNewRegistrations",
                              !systemSettings.allowNewRegistrations
                            )
                          }
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            systemSettings.allowNewRegistrations
                              ? "bg-green-600"
                              : "bg-gray-200"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-surface transition-transform ${
                              systemSettings.allowNewRegistrations
                                ? "translate-x-6"
                                : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Enable Notifications
                          </label>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            System-wide notification settings
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            handleSettingChange(
                              "enableNotifications",
                              !systemSettings.enableNotifications
                            )
                          }
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            systemSettings.enableNotifications
                              ? "bg-green-600"
                              : "bg-gray-200"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-surface transition-transform ${
                              systemSettings.enableNotifications
                                ? "translate-x-6"
                                : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Max File Upload Size (MB)
                        </label>
                        <input
                          type="number"
                          value={systemSettings.maxFileUploadSize}
                          onChange={(e) =>
                            handleSettingChange(
                              "maxFileUploadSize",
                              parseInt(e.target.value)
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-white/15 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Session Timeout (minutes)
                        </label>
                        <input
                          type="number"
                          value={systemSettings.sessionTimeout}
                          onChange={(e) =>
                            handleSettingChange(
                              "sessionTimeout",
                              parseInt(e.target.value)
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-white/15 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Backup Frequency
                        </label>
                        <select
                          value={systemSettings.backupFrequency}
                          onChange={(e) =>
                            handleSettingChange(
                              "backupFrequency",
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-white/15 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          {backupFrequencyOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-white/10">
                    <button
                      onClick={() =>
                        setSystemSettings({
                          maintenanceMode: false,
                          allowNewRegistrations: true,
                          maxFileUploadSize: 50,
                          sessionTimeout: 30,
                          enableNotifications: true,
                          backupFrequency: "daily",
                        })
                      }
                      className="px-4 py-2 border border-gray-300 dark:border-white/15 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Reset to Defaults
                    </button>
                    <button
                      onClick={saveSystemSettings}
                      disabled={loading}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {loading ? "Saving..." : "Save Settings"}
                    </button>
                  </div>
                </div>
              )}

              {/* User Roles Tab */}
              {activeTab === "roles" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      User Roles & Permissions
                    </h2>
                    <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                      Create New Role
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {userRoles.map((role) => (
                      <div key={role.id} className="bg-gray-50 dark:bg-white/5 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {role.name}
                          </h3>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            {role.userCount} users
                          </span>
                        </div>

                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                          {role.description}
                        </p>

                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Permissions:
                          </h4>
                          <div className="space-y-1">
                            {role.permissions.map((permission, index) => (
                              <div
                                key={index}
                                className="text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-surface px-2 py-1 rounded"
                              >
                                {permission}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex space-x-2">
                          <button className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors">
                            Edit
                          </button>
                          <button className="flex-1 px-3 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors">
                            View Users
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === "security" && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Security & Access Controls
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-red-800 mb-4">
                        Security Alerts
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center text-sm text-red-700">
                          <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                          <span>3 failed login attempts detected</span>
                        </div>
                        <div className="flex items-center text-sm text-red-700">
                          <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                          <span>Unusual activity from IP: 192.168.1.100</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-green-800 mb-4">
                        System Status
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center text-sm text-green-700">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                          <span>All systems operational</span>
                        </div>
                        <div className="flex items-center text-sm text-green-700">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                          <span>Last backup: 2 hours ago</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-surface border border-gray-200 dark:border-white/10 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Access Logs
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          Admin login - 10:30 AM
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">IP: 192.168.1.50</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          User logout - 10:25 AM
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">IP: 192.168.1.75</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          Failed login attempt - 10:20 AM
                        </span>
                        <span className="text-red-500">IP: 192.168.1.100</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-4">
                    <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                      View Security Logs
                    </button>
                    <button className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors">
                      Run Security Scan
                    </button>
                    <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                      Export Audit Trail
                    </button>
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
