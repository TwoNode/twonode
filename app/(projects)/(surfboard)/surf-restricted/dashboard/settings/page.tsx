"use client"

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface AdminProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  department: string;
  phone: string;
  avatar: string;
  preferences: {
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
    theme: "light" | "dark" | "auto";
    language: string;
    timezone: string;
  };
  security: {
    twoFactorEnabled: boolean;
    lastPasswordChange: string;
    loginHistory: Array<{
      date: string;
      ip: string;
      device: string;
      location: string;
    }>;
  };
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profile");
  const [saving, setSaving] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showTwoFactorModal, setShowTwoFactorModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Simulate fetching admin profile data
    const fetchProfile = async () => {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mock profile data
      const mockProfile: AdminProfile = {
        id: "1",
        firstName: "John",
        lastName: "Smith",
        email: "john.smith@company.com",
        role: "ADMIN",
        department: "Survey Operations",
        phone: "+27 82 123 4567",
        avatar: "",
        preferences: {
          notifications: {
            email: true,
            push: true,
            sms: false,
          },
          theme: "light",
          language: "en",
          timezone: "Africa/Johannesburg",
        },
        security: {
          twoFactorEnabled: false,
          lastPasswordChange: "2024-01-01T00:00:00Z",
          loginHistory: [
            {
              date: "2024-01-15T10:30:00Z",
              ip: "192.168.1.50",
              device: "Chrome on Windows 10",
              location: "Cape Town, South Africa",
            },
            {
              date: "2024-01-14T16:45:00Z",
              ip: "192.168.1.50",
              device: "Chrome on Windows 10",
              location: "Cape Town, South Africa",
            },
            {
              date: "2024-01-13T09:15:00Z",
              ip: "192.168.1.50",
              device: "Chrome on Windows 10",
              location: "Cape Town, South Africa",
            },
          ],
        },
      };

      setProfile(mockProfile);
      setLoading(false);
    };

    fetchProfile();
  }, []);

  const handleProfileUpdate = async () => {
    setSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSaving(false);
    alert("Profile updated successfully!");
  };

  const handlePreferenceChange = (
    category: string,
    setting: string,
    value: any
  ) => {
    if (!profile) return;

    setProfile((prev) => {
      if (!prev) return prev;
      const currentCategory =
        prev.preferences[category as keyof typeof prev.preferences];
      return {
        ...prev,
        preferences: {
          ...prev.preferences,
          [category]: {
            ...(typeof currentCategory === "object" ? currentCategory : {}),
            [setting]: value,
          },
        },
      };
    });
  };

  const handlePasswordChange = async (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ) => {
    if (newPassword !== confirmPassword) {
      alert("New passwords do not match!");
      return;
    }

    setSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSaving(false);
    setShowPasswordModal(false);
    alert("Password changed successfully!");
  };

  const handleTwoFactorToggle = async () => {
    if (!profile) return;

    setSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setProfile((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        security: {
          ...prev.security,
          twoFactorEnabled: !prev.security.twoFactorEnabled,
        },
      };
    });

    setSaving(false);
    setShowTwoFactorModal(false);
    alert(
      `Two-factor authentication ${
        profile.security.twoFactorEnabled ? "disabled" : "enabled"
      } successfully!`
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Failed to load profile data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
                <p className="text-gray-600 mt-2">
                  Manage your profile, preferences, and security settings
                </p>
              </div>
              <button
                onClick={() => router.push("/surf-restricted/dashboard")}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>

          {/* Settings Navigation */}
          <div className="bg-white rounded-lg shadow-lg mb-8">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                <button
                  onClick={() => setActiveTab("profile")}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "profile"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Profile
                </button>
                <button
                  onClick={() => setActiveTab("preferences")}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "preferences"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Preferences
                </button>
                <button
                  onClick={() => setActiveTab("security")}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "security"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Security
                </button>
                <button
                  onClick={() => setActiveTab("notifications")}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "notifications"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Notifications
                </button>
              </nav>
            </div>

            <div className="p-6">
              {/* Profile Tab */}
              {activeTab === "profile" && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Profile Information
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={profile.firstName}
                        onChange={(e) =>
                          setProfile((prev) =>
                            prev ? { ...prev, firstName: e.target.value } : null
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={profile.lastName}
                        onChange={(e) =>
                          setProfile((prev) =>
                            prev ? { ...prev, lastName: e.target.value } : null
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={profile.email}
                        onChange={(e) =>
                          setProfile((prev) =>
                            prev ? { ...prev, email: e.target.value } : null
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={profile.phone}
                        onChange={(e) =>
                          setProfile((prev) =>
                            prev ? { ...prev, phone: e.target.value } : null
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Department
                      </label>
                      <input
                        type="text"
                        value={profile.department}
                        onChange={(e) =>
                          setProfile((prev) =>
                            prev
                              ? { ...prev, department: e.target.value }
                              : null
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Role
                      </label>
                      <input
                        type="text"
                        value={profile.role}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                    <button
                      onClick={() =>
                        setProfile({
                          id: "1",
                          firstName: "John",
                          lastName: "Smith",
                          email: "john.smith@company.com",
                          role: "ADMIN",
                          department: "Survey Operations",
                          phone: "+27 82 123 4567",
                          avatar: "",
                          preferences: {
                            notifications: {
                              email: true,
                              push: true,
                              sms: false,
                            },
                            theme: "light",
                            language: "en",
                            timezone: "Africa/Johannesburg",
                          },
                          security: {
                            twoFactorEnabled: false,
                            lastPasswordChange: "2024-01-01T00:00:00Z",
                            loginHistory: [],
                          },
                        })
                      }
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Reset
                    </button>
                    <button
                      onClick={handleProfileUpdate}
                      disabled={saving}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>
              )}

              {/* Preferences Tab */}
              {activeTab === "preferences" && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Application Preferences
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Theme
                      </label>
                      <select
                        value={profile.preferences.theme}
                        onChange={(e) =>
                          handlePreferenceChange(
                            "theme",
                            "theme",
                            e.target.value
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                        <option value="auto">Auto</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Language
                      </label>
                      <select
                        value={profile.preferences.language}
                        onChange={(e) =>
                          handlePreferenceChange(
                            "language",
                            "language",
                            e.target.value
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="en">English</option>
                        <option value="af">Afrikaans</option>
                        <option value="zu">Zulu</option>
                        <option value="xh">Xhosa</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Timezone
                      </label>
                      <select
                        value={profile.preferences.timezone}
                        onChange={(e) =>
                          handlePreferenceChange(
                            "timezone",
                            "timezone",
                            e.target.value
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="Africa/Johannesburg">
                          Africa/Johannesburg
                        </option>
                        <option value="Africa/Cape_Town">
                          Africa/Cape Town
                        </option>
                        <option value="Africa/Durban">Africa/Durban</option>
                        <option value="UTC">UTC</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                    <button
                      onClick={handleProfileUpdate}
                      disabled={saving}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save Preferences"}
                    </button>
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === "security" && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Security Settings
                  </h2>

                  <div className="space-y-6">
                    <div className="bg-gray-50 rounded-lg p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            Password
                          </h3>
                          <p className="text-sm text-gray-600">
                            Last changed:{" "}
                            {new Date(
                              profile.security.lastPasswordChange
                            ).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={() => setShowPasswordModal(true)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Change Password
                        </button>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            Two-Factor Authentication
                          </h3>
                          <p className="text-sm text-gray-600">
                            Add an extra layer of security to your account
                          </p>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              profile.security.twoFactorEnabled
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {profile.security.twoFactorEnabled
                              ? "Enabled"
                              : "Disabled"}
                          </span>
                          <button
                            onClick={() => setShowTwoFactorModal(true)}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                          >
                            {profile.security.twoFactorEnabled
                              ? "Disable"
                              : "Enable"}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Recent Login Activity
                      </h3>
                      <div className="space-y-3">
                        {profile.security.loginHistory.map((login, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between text-sm"
                          >
                            <div>
                              <span className="text-gray-900">
                                {new Date(login.date).toLocaleString()}
                              </span>
                              <span className="text-gray-500 ml-2">
                                • {login.device}
                              </span>
                            </div>
                            <div className="text-gray-500">
                              {login.ip} • {login.location}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === "notifications" && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Notification Preferences
                  </h2>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">
                          Email Notifications
                        </h3>
                        <p className="text-sm text-gray-600">
                          Receive notifications via email
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          handlePreferenceChange(
                            "notifications",
                            "email",
                            !profile.preferences.notifications.email
                          )
                        }
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          profile.preferences.notifications.email
                            ? "bg-green-600"
                            : "bg-gray-200"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            profile.preferences.notifications.email
                              ? "translate-x-6"
                              : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">
                          Push Notifications
                        </h3>
                        <p className="text-sm text-gray-600">
                          Receive push notifications in browser
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          handlePreferenceChange(
                            "notifications",
                            "push",
                            !profile.preferences.notifications.push
                          )
                        }
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          profile.preferences.notifications.push
                            ? "bg-green-600"
                            : "bg-gray-200"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            profile.preferences.notifications.push
                              ? "translate-x-6"
                              : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">
                          SMS Notifications
                        </h3>
                        <p className="text-sm text-gray-600">
                          Receive notifications via SMS
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          handlePreferenceChange(
                            "notifications",
                            "sms",
                            !profile.preferences.notifications.sms
                          )
                        }
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          profile.preferences.notifications.sms
                            ? "bg-green-600"
                            : "bg-gray-200"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            profile.preferences.notifications.sms
                              ? "translate-x-6"
                              : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                    <button
                      onClick={handleProfileUpdate}
                      disabled={saving}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save Notifications"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Change Password
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Current Password
                  </label>
                  <input
                    type="password"
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    New Password
                  </label>
                  <input
                    type="password"
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-4">
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handlePasswordChange("", "", "")}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {saving ? "Changing..." : "Change Password"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Two-Factor Modal */}
      {showTwoFactorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {profile.security.twoFactorEnabled ? "Disable" : "Enable"}{" "}
                Two-Factor Authentication
              </h2>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">
                {profile.security.twoFactorEnabled
                  ? "Are you sure you want to disable two-factor authentication? This will make your account less secure."
                  : "Two-factor authentication adds an extra layer of security to your account by requiring a second form of verification."}
              </p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setShowTwoFactorModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTwoFactorToggle}
                  disabled={saving}
                  className={`px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${
                    profile.security.twoFactorEnabled
                      ? "bg-red-600 text-white hover:bg-red-700"
                      : "bg-green-600 text-white hover:bg-green-700"
                  }`}
                >
                  {saving
                    ? "Processing..."
                    : profile.security.twoFactorEnabled
                    ? "Disable"
                    : "Enable"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
