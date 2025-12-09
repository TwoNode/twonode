"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  getCurrentSettings,
  updateSettings,
  getSettingsHistory,
  revertToPreviousSettings,
} from "../../../actions/settingsActions";

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

interface LGAFees {
  [lga: string]: number;
}

interface SettingsData {
  lgaFees: LGAFees;
  systemChargePercent: number;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profile");
  const [saving, setSaving] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showTwoFactorModal, setShowTwoFactorModal] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const router = useRouter();

  // LGA Settings state
  const [settings, setSettings] = useState<SettingsData>({
    lgaFees: {},
    systemChargePercent: 10,
  });
  const [originalSettings, setOriginalSettings] = useState<SettingsData>({
    lgaFees: {},
    systemChargePercent: 10,
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [showAddLGA, setShowAddLGA] = useState(false);
  const [newLGA, setNewLGA] = useState({ name: "", rate: "" });

  // CSV Upload state
  const [showCSVPreview, setShowCSVPreview] = useState(false);
  const [csvPreviewData, setCSVPreviewData] = useState<LGAFees>({});
  const [csvErrors, setCSVErrors] = useState<string[]>([]);
  const [showCSVFormatHelp, setShowCSVFormatHelp] = useState(false);

  // Settings History state
  const [showSettingsHistory, setShowSettingsHistory] = useState(false);
  const [settingsHistory, setSettingsHistory] = useState<any[]>([]);

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

  // Fetch LGA settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setSettingsLoading(true);
        const result = await getCurrentSettings();
        if (result.success && result.data) {
          setSettings(result.data);
          setOriginalSettings(result.data);
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setSettingsLoading(false);
      }
    };

    fetchSettings();

    // Fetch current user role - in production this should come from auth context
    // For now, assuming SUPERADMIN for testing
    setCurrentUserRole("SUPERADMIN");
  }, []);

  const handleProfileUpdate = async () => {
    setSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSaving(false);
    alert("Profile updated successfully!");
  };

  // LGA Settings handlers
  const handleSaveSettings = async () => {
    try {
      setSettingsSaving(true);
      const result = await updateSettings(settings);
      if (result.success) {
        toast.success("LGA settings updated successfully");
        setOriginalSettings(settings);
      } else {
        toast.error(result.error || "Failed to update settings");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("An error occurred while saving settings");
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleAddLGA = () => {
    if (!newLGA.name || !newLGA.rate) {
      toast.error("Please enter both LGA name and rate");
      return;
    }

    const rate = parseFloat(newLGA.rate);
    if (isNaN(rate) || rate <= 0) {
      toast.error("Please enter a valid rate");
      return;
    }

    setSettings({
      ...settings,
      lgaFees: {
        ...settings.lgaFees,
        [newLGA.name]: rate,
      },
    });

    setNewLGA({ name: "", rate: "" });
    setShowAddLGA(false);
    toast.success(`Added ${newLGA.name}`);
  };

  const handleRemoveLGA = (lga: string) => {
    const newFees = { ...settings.lgaFees };
    delete newFees[lga];
    setSettings({
      ...settings,
      lgaFees: newFees,
    });
    toast.success(`Removed ${lga}`);
  };

  const handleUpdateLGARate = (lga: string, rate: string) => {
    const parsedRate = parseFloat(rate);
    if (isNaN(parsedRate) || parsedRate < 0) return;

    setSettings({
      ...settings,
      lgaFees: {
        ...settings.lgaFees,
        [lga]: parsedRate,
      },
    });
  };

  // CSV Upload handler
  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n").filter((line) => line.trim());

        if (lines.length < 2) {
          toast.error("CSV file is empty or has no data");
          return;
        }

        // Parse CSV
        const headers = lines[0].split(",").map((h) => h.trim());
        const nameIndex = headers.findIndex(
          (h) =>
            h.toLowerCase().includes("lga") || h.toLowerCase().includes("name")
        );
        const rateIndex = headers.findIndex(
          (h) =>
            h.toLowerCase().includes("rate") ||
            h.toLowerCase().includes("amount")
        );

        if (nameIndex === -1 || rateIndex === -1) {
          toast.error("CSV must have 'LGA Name' and 'Rate' columns");
          return;
        }

        const parsedData: LGAFees = {};
        const errors: string[] = [];

        // Parse data rows
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(",").map((v) => v.trim());
          const lgaName = values[nameIndex];
          const rateValue = values[rateIndex];

          if (!lgaName) {
            errors.push(`Row ${i + 1}: Missing LGA name`);
            continue;
          }

          const rate = parseFloat(rateValue);
          if (isNaN(rate) || rate < 0) {
            errors.push(
              `Row ${i + 1}: Invalid rate '${rateValue}' for ${lgaName}`
            );
            continue;
          }

          parsedData[lgaName] = rate;
        }

        setCSVPreviewData(parsedData);
        setCSVErrors(errors);
        setShowCSVPreview(true);
      } catch (error) {
        console.error("CSV parsing error:", error);
        toast.error("Failed to parse CSV file");
      }
    };

    reader.readAsText(file);
    event.target.value = "";
  };

  // Apply CSV data to settings
  const handleApplyCSV = () => {
    setSettings({
      ...settings,
      lgaFees: {
        ...settings.lgaFees,
        ...csvPreviewData,
      },
    });

    setShowCSVPreview(false);
    setCSVPreviewData({});
    setCSVErrors([]);

    toast.success(
      `Updated ${Object.keys(csvPreviewData).length} LGA fees from CSV`
    );
  };

  // Check if settings have changed
  const hasSettingsChanged = () => {
    if (settings.systemChargePercent !== originalSettings.systemChargePercent) {
      return true;
    }

    const currentLGAs = Object.keys(settings.lgaFees).sort();
    const originalLGAs = Object.keys(originalSettings.lgaFees).sort();

    if (currentLGAs.length !== originalLGAs.length) {
      return true;
    }

    for (const lga of currentLGAs) {
      if (settings.lgaFees[lga] !== originalSettings.lgaFees[lga]) {
        return true;
      }
    }

    return false;
  };

  // Export settings as CSV
  const handleExportSettings = () => {
    try {
      // Create CSV content
      let csvContent = "LGA Name,Rate\n";

      Object.entries(settings.lgaFees)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(([lga, rate]) => {
          csvContent += `${lga},${rate}\n`;
        });

      // Create blob and download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `lga-fees-${new Date().toISOString().split("T")[0]}.csv`
      );
      link.style.visibility = "hidden";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Settings exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export settings");
    }
  };

  // Fetch settings history
  const fetchSettingsHistory = async () => {
    try {
      const result = await getSettingsHistory();
      if (result.success && result.data) {
        setSettingsHistory(result.data);
        setShowSettingsHistory(true);
      } else {
        toast.error(result.error || "Failed to fetch history");
      }
    } catch (error) {
      console.error("Error fetching history:", error);
      toast.error("An error occurred while fetching history");
    }
  };

  // Revert to previous settings
  const handleRevertSettings = async (settingsId: string) => {
    try {
      const result = await revertToPreviousSettings(settingsId);
      if (result.success) {
        toast.success("Settings reverted successfully");
        setShowSettingsHistory(false);
        // Refresh settings
        const settingsResult = await getCurrentSettings();
        if (settingsResult.success && settingsResult.data) {
          setSettings(settingsResult.data);
          setOriginalSettings(settingsResult.data);
        }
      } else {
        toast.error(result.error || "Failed to revert settings");
      }
    } catch (error) {
      console.error("Error reverting settings:", error);
      toast.error("An error occurred while reverting settings");
    }
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
      <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Failed to load profile data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100">
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
                {currentUserRole === "SUPERADMIN" && (
                  <button
                    onClick={() => setActiveTab("lga")}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === "lga"
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    MDA Settings
                  </button>
                )}
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

              {/* LGA Amounts Tab */}
              {activeTab === "lga" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">
                      RedCopy LGA Fee Settings
                    </h2>
                    <div className="flex gap-3">
                      <button
                        onClick={handleExportSettings}
                        disabled={Object.keys(settings.lgaFees).length === 0}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
                          />
                        </svg>
                        Export CSV
                      </button>
                      <button
                        onClick={handleSaveSettings}
                        disabled={settingsSaving}
                        className={`px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 ${
                          hasSettingsChanged()
                            ? "shadow-lg shadow-blue-500/50 animate-pulse"
                            : ""
                        }`}
                      >
                        {settingsSaving ? "Saving..." : "Save Settings"}
                      </button>
                    </div>
                  </div>

                  {/* System Charge */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      System Charge Percentage
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Percentage added to the base fee for system charges
                    </p>
                    <div className="flex items-center gap-4">
                      <label className="text-sm font-medium text-gray-700">
                        Percentage:
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={settings.systemChargePercent}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            systemChargePercent:
                              parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={settingsLoading}
                      />
                      <span className="text-gray-600">%</span>
                    </div>
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-900">
                        <strong>Example:</strong> If base fee is ₦5,000 and
                        system charge is {settings.systemChargePercent}%, the
                        total will be ₦
                        {(
                          5000 *
                          (1 + settings.systemChargePercent / 100)
                        ).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  </div>

                  {/* LGA Fees Table */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          MDA Fee Settings
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Configure LGA fees and system charges
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={fetchSettingsHistory}
                          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          View History
                        </button>
                        <button
                          onClick={handleSaveSettings}
                          disabled={settingsSaving || !hasSettingsChanged()}
                          className={`px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                            hasSettingsChanged() ? "animate-pulse" : ""
                          }`}
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                            />
                          </svg>
                          {settingsSaving ? "Saving..." : "Save Settings"}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          LGA Fee Rates
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Rate per square meter for each Local Government Area
                          (₦/m²)
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowCSVFormatHelp(true)}
                          className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                          title="View CSV format"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          CSV Format
                        </button>
                        <label
                          htmlFor="csv-upload"
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 cursor-pointer"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            />
                          </svg>
                          Upload CSV
                        </label>

                        <input
                          id="csv-upload"
                          type="file"
                          accept=".csv"
                          onChange={handleCSVUpload}
                          className="hidden"
                        />

                        <button
                          onClick={() => setShowAddLGA(true)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 4v16m8-8H4"
                            />
                          </svg>
                          Add LGA
                        </button>
                      </div>
                    </div>

                    {Object.keys(settings.lgaFees).length === 0 ? (
                      <div className="text-center py-12">
                        <svg
                          className="w-12 h-12 text-gray-300 mx-auto mb-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                          />
                        </svg>
                        <p className="text-gray-500">No LGA fees configured</p>
                        <p className="text-sm text-gray-400 mt-1">
                          Click "Add LGA" or "Upload CSV" to get started
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto overflow-y-auto max-h-[50vh]">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                S/N
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                LGA Name
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Rate (₦/m²)
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {Object.entries(settings.lgaFees)
                              .sort((a, b) => a[0].localeCompare(b[0]))
                              .map(([lga, rate], index) => (
                                <tr key={lga}>
                                  <td className="px-2 py-4 text-center whitespace-nowrap text-sm font-medium text-gray-900">
                                    {index + 1}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {lga}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={rate}
                                      onChange={(e) =>
                                        handleUpdateLGARate(lga, e.target.value)
                                      }
                                      className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                      disabled={settingsLoading}
                                    />
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                    <button
                                      onClick={() => handleRemoveLGA(lga)}
                                      className="text-red-600 hover:text-red-900"
                                      disabled={settingsLoading}
                                    >
                                      <svg
                                        className="w-5 h-5"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                        />
                                      </svg>
                                    </button>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CSV Format Help Modal */}
      {showCSVFormatHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                CSV File Format
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Your CSV file must follow this format to upload LGA fees
              </p>
            </div>

            <div className="p-6 space-y-4">
              {/* Required Headers */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">
                  Required Headers
                </h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900 mb-2">
                    Your CSV must include these columns (case-insensitive):
                  </p>
                  <ul className="text-sm text-blue-900 space-y-1 ml-4">
                    <li>
                      • <strong>LGA Name</strong> or <strong>Name</strong> - The
                      name of the Local Government Area
                    </li>
                    <li>
                      • <strong>Rate</strong> or <strong>Amount</strong> - The
                      fee per square meter (₦/m²)
                    </li>
                  </ul>
                </div>
              </div>

              {/* Example Format */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">
                  Example CSV Format
                </h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 font-mono text-sm">
                  <div className="text-gray-600">LGA Name,Rate</div>
                  <div className="text-gray-800">Eti-Osa,15.50</div>
                  <div className="text-gray-800">Ikeja,12.75</div>
                  <div className="text-gray-800">Victoria Island,20.00</div>
                  <div className="text-gray-800">Lekki,18.25</div>
                </div>
              </div>

              {/* Tips */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-green-900 mb-2">
                  💡 Tips
                </h3>
                <ul className="text-sm text-green-800 space-y-1 ml-4">
                  <li>
                    • Column names are flexible (e.g., "LGA" or "Name" works)
                  </li>
                  <li>• Rates must be positive numbers</li>
                  <li>• Uploading existing LGAs will update their rates</li>
                  <li>• You'll see a preview before changes are applied</li>
                </ul>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowCSVFormatHelp(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add LGA Modal */}
      {showAddLGA && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Add New LGA
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Enter the LGA name and rate per square meter
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  LGA Name
                </label>
                <input
                  type="text"
                  value={newLGA.name}
                  onChange={(e) =>
                    setNewLGA({ ...newLGA, name: e.target.value })
                  }
                  placeholder="e.g., Eti-Osa"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rate (₦/m²)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newLGA.rate}
                  onChange={(e) =>
                    setNewLGA({ ...newLGA, rate: e.target.value })
                  }
                  placeholder="e.g., 10"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-4">
              <button
                onClick={() => setShowAddLGA(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddLGA}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add LGA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Preview Modal */}
      {showCSVPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                CSV Upload Preview
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Review the LGA fees from your CSV file before applying
              </p>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {/* Errors Section */}
              {csvErrors.length > 0 && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-red-900 mb-2">
                    Errors Found ({csvErrors.length})
                  </h3>
                  <ul className="text-sm text-red-700 space-y-1">
                    {csvErrors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preview Table */}
              {Object.keys(csvPreviewData).length > 0 ? (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">
                    Valid Entries ({Object.keys(csvPreviewData).length})
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            LGA Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Rate (₦/m²)
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {Object.entries(csvPreviewData)
                          .sort((a, b) => a[0].localeCompare(b[0]))
                          .map(([lga, rate]) => (
                            <tr key={lga}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {lga}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                ₦
                                {rate.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No valid data found in CSV</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-between">
              <button
                onClick={() => {
                  setShowCSVPreview(false);
                  setCSVPreviewData({});
                  setCSVErrors([]);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyCSV}
                disabled={Object.keys(csvPreviewData).length === 0}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Apply {Object.keys(csvPreviewData).length} Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings History Modal */}
      {showSettingsHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Settings History
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    View and revert to previous settings configurations
                  </p>
                </div>
                <button
                  onClick={() => setShowSettingsHistory(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {settingsHistory.length === 0 ? (
                <div className="text-center py-12">
                  <svg
                    className="w-12 h-12 text-gray-300 mx-auto mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-gray-500">No settings history available</p>
                </div>
              ) : (
                settingsHistory.map((item) => (
                  <div
                    key={item.id}
                    className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {new Date(item.updatedAt).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-600">
                          {item.updatedBy
                            ? `Updated by ${item.updatedBy.firstName} ${item.updatedBy.lastName}`
                            : "System update"}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRevertSettings(item.id)}
                        className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                          />
                        </svg>
                        Revert
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium text-gray-700">
                          System Charge: {item.settings.systemChargePercent}%
                        </p>
                        <p className="font-medium text-gray-700 mt-2">
                          LGA Fees ({Object.keys(item.settings.lgaFees).length}
                          ):
                        </p>
                        <div className="max-h-32 overflow-y-auto text-xs text-gray-600 mt-1 space-y-1">
                          {Object.entries(item.settings.lgaFees)
                            .sort((a: any, b: any) => a[0].localeCompare(b[0]))
                            .slice(0, 10)
                            .map(([lga, rate]: any) => (
                              <div key={lga} className="flex justify-between">
                                <span>{lga}:</span>
                                <span>₦{rate}/m²</span>
                              </div>
                            ))}
                          {Object.keys(item.settings.lgaFees).length > 10 && (
                            <p className="text-gray-500 italic">
                              ... and{" "}
                              {Object.keys(item.settings.lgaFees).length - 10}{" "}
                              more
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowSettingsHistory(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
