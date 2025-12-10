"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  ArrowLeft,
  User,
  Bell,
  Settings as SettingsIcon,
  Sun,
  Moon,
  Monitor,
  Mail,
  Shield,
} from "lucide-react";
import { getUserData } from "../../../actions/authActions";

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface Preferences {
  theme: "light" | "dark" | "auto";
  emailNotifications: boolean;
}

const roleNames: Record<string, string> = {
  ACCOUNTS: "Accounts Admin",
  CHARTING: "Charting Admin",
  SURCON: "SURCON Admin",
  RECORDS_I: "Records I Admin",
  RECORDS_II: "Records II Admin",
  SUPERADMIN: "Super Administrator",
};

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profile");
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>({
    theme: "light",
    emailNotifications: true,
  });
  const router = useRouter();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const result = await getUserData();

        if (result.success && result.data) {
          setProfile({
            firstName: result.data.firstName,
            lastName: result.data.lastName,
            email: result.data.email,
            role: result.data.role,
          });
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleSavePreferences = async () => {
    setSaving(true);
    // Simulate API call - preferences would be saved to backend
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSaving(false);
    alert("Preferences saved successfully!");
  };

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600 mt-2">
              Manage your profile and preferences
            </p>
          </div>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>

        {/* Settings Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex px-6">
              <button
                onClick={() => setActiveTab("profile")}
                className={`py-4 px-4 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === "profile"
                    ? "border-purple-500 text-purple-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <User className="w-4 h-4" />
                Profile
              </button>
              <button
                onClick={() => setActiveTab("preferences")}
                className={`py-4 px-4 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === "preferences"
                    ? "border-purple-500 text-purple-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <SettingsIcon className="w-4 h-4" />
                Preferences
              </button>
            </nav>
          </div>

          <div className="p-8">
            {/* Profile Tab */}
            {activeTab === "profile" && profile && (
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
                      disabled
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-700"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={profile.lastName}
                      disabled
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-700"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={profile.email}
                      disabled
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-700"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Role
                    </label>
                    <div className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-purple-600" />
                      <span className="text-gray-700 font-medium">
                        {roleNames[profile.role] || profile.role}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Info Banner */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-sm text-amber-800">
                    <strong>Note:</strong> Profile information is managed by
                    your system administrator. Contact them to make changes.
                  </p>
                </div>
              </div>
            )}

            {/* Preferences Tab */}
            {activeTab === "preferences" && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Application Preferences
                </h2>

                {/* Theme Selection */}
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Theme
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    <button
                      onClick={() =>
                        setPreferences({ ...preferences, theme: "light" })
                      }
                      className={`p-4 border-2 rounded-xl flex flex-col items-center gap-2 transition-all ${
                        preferences.theme === "light"
                          ? "border-purple-500 bg-purple-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <Sun
                        className={`w-6 h-6 ${
                          preferences.theme === "light"
                            ? "text-purple-600"
                            : "text-gray-500"
                        }`}
                      />
                      <span
                        className={`text-sm font-medium ${
                          preferences.theme === "light"
                            ? "text-purple-600"
                            : "text-gray-600"
                        }`}
                      >
                        Light
                      </span>
                    </button>

                    <button
                      onClick={() =>
                        setPreferences({ ...preferences, theme: "dark" })
                      }
                      className={`p-4 border-2 rounded-xl flex flex-col items-center gap-2 transition-all ${
                        preferences.theme === "dark"
                          ? "border-purple-500 bg-purple-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <Moon
                        className={`w-6 h-6 ${
                          preferences.theme === "dark"
                            ? "text-purple-600"
                            : "text-gray-500"
                        }`}
                      />
                      <span
                        className={`text-sm font-medium ${
                          preferences.theme === "dark"
                            ? "text-purple-600"
                            : "text-gray-600"
                        }`}
                      >
                        Dark
                      </span>
                    </button>

                    <button
                      onClick={() =>
                        setPreferences({ ...preferences, theme: "auto" })
                      }
                      className={`p-4 border-2 rounded-xl flex flex-col items-center gap-2 transition-all ${
                        preferences.theme === "auto"
                          ? "border-purple-500 bg-purple-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <Monitor
                        className={`w-6 h-6 ${
                          preferences.theme === "auto"
                            ? "text-purple-600"
                            : "text-gray-500"
                        }`}
                      />
                      <span
                        className={`text-sm font-medium ${
                          preferences.theme === "auto"
                            ? "text-purple-600"
                            : "text-gray-600"
                        }`}
                      >
                        Auto
                      </span>
                    </button>
                  </div>
                </div>

                {/* Email Notifications */}
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Mail className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">
                        Email Notifications
                      </h3>
                      <p className="text-sm text-gray-500">
                        Receive email updates about plan approvals and queries
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setPreferences({
                        ...preferences,
                        emailNotifications: !preferences.emailNotifications,
                      })
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      preferences.emailNotifications
                        ? "bg-purple-600"
                        : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        preferences.emailNotifications
                          ? "translate-x-6"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-6 border-t border-gray-200">
                  <button
                    onClick={handleSavePreferences}
                    disabled={saving}
                    className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2 font-medium"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Preferences"
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
