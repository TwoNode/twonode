"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { surfboardApi } from "@/surfboard/apiClient";

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

import { COD_FEES, type ZoneFeeRow } from "../../../utils/CoDFees";
import { nigerianStates, DEFAULT_COORDINATE_SHIFTS } from "@/lib/constants";

interface SettingsData {
  zoneFees: ZoneFeeRow[];
  systemChargePercent: number;
  codAcceptanceText: string;
  codPolicyContent: string;
  queryResponseFeePercent: number;
  coordinateShifts?: Record<
    string,
    { eastingShift: number; northingShift: number }
  >;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Zone Fee Settings state
  const [settings, setSettings] = useState<SettingsData>({
    zoneFees: COD_FEES,
    systemChargePercent: 10,
    codAcceptanceText: "",
    codPolicyContent: "",
    queryResponseFeePercent: 10,
    coordinateShifts: DEFAULT_COORDINATE_SHIFTS,
  });
  const [originalSettings, setOriginalSettings] = useState<SettingsData>({
    zoneFees: COD_FEES,
    systemChargePercent: 10,
    codAcceptanceText: "",
    codPolicyContent: "",
    queryResponseFeePercent: 10,
    coordinateShifts: DEFAULT_COORDINATE_SHIFTS,
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [editingFeeIndex, setEditingFeeIndex] = useState<number | null>(null);

  // CSV Upload state
  const [showCSVPreview, setShowCSVPreview] = useState(false);
  const [csvPreviewData, setCSVPreviewData] = useState<ZoneFeeRow[]>([]);
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
        const result = await surfboardApi.settings.get();
        if (result.success) {
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

  // Zone Fee Settings handlers
  const handleSaveSettings = async () => {
    try {
      setSettingsSaving(true);
      const result = await surfboardApi.settings.update(settings);
      if (result.success) {
        toast.success("Zone fee settings updated successfully");
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

  const handleUpdateZoneFee = (
    index: number,
    field: keyof ZoneFeeRow,
    value: number,
  ) => {
    const updatedFees = [...settings.zoneFees];
    updatedFees[index] = {
      ...updatedFees[index],
      [field]: value,
    };
    setSettings({
      ...settings,
      zoneFees: updatedFees,
    });
  };

  const handleCoordinateShiftChange = (
    stateName: string,
    field: "eastingShift" | "northingShift",
    value: string,
  ) => {
    const numValue = value === "" ? 0 : parseFloat(value);
    const key = stateName.toLowerCase();

    setSettings((prev) => {
      const currentShifts = prev.coordinateShifts || {};
      const stateShift = currentShifts[key] || {
        eastingShift: 0,
        northingShift: 0,
      };

      const updatedShifts = {
        ...currentShifts,
        [key]: {
          ...stateShift,
          [field]: isNaN(numValue) ? 0 : numValue,
        },
      };

      // Clean up states with both 0 to keep the settings lean
      if (
        updatedShifts[key].eastingShift === 0 &&
        updatedShifts[key].northingShift === 0 &&
        key !== "lagos"
      ) {
        delete updatedShifts[key];
      }

      return {
        ...prev,
        coordinateShifts: updatedShifts,
      };
    });
  };

  // Check if settings have changed
  const hasSettingsChanged = () => {
    if (settings.systemChargePercent !== originalSettings.systemChargePercent) {
      return true;
    }

    if (
      JSON.stringify(settings.coordinateShifts || {}) !==
      JSON.stringify(originalSettings.coordinateShifts || {})
    ) {
      return true;
    }

    if (settings.zoneFees.length !== originalSettings.zoneFees.length) {
      return true;
    }

    for (let i = 0; i < settings.zoneFees.length; i++) {
      const current = settings.zoneFees[i];
      const original = originalSettings.zoneFees[i];
      if (
        current.lagosZoneA !== original.lagosZoneA ||
        current.lagosZoneB !== original.lagosZoneB ||
        current.lagosZoneC !== original.lagosZoneC ||
        current.lagosZoneD !== original.lagosZoneD
      ) {
        return true;
      }
    }

    return false;
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

        // Parse CSV Headers
        const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

        // Map headers to fields
        const rangeIdx = headers.findIndex((h) => h === "range");
        const startIdx = headers.findIndex((h) => h === "start");
        const endIdx = headers.findIndex((h) => h === "end");

        // Headers for zones might vary slightly e.g., "Zone A" or "Lagos Zone A"
        const zoneAIdx = headers.findIndex((h) => h.includes("zone a"));
        const zoneBIdx = headers.findIndex((h) => h.includes("zone b"));
        const zoneCIdx = headers.findIndex((h) => h.includes("zone c"));
        const zoneDIdx = headers.findIndex((h) => h.includes("zone d"));

        if (
          rangeIdx === -1 ||
          startIdx === -1 ||
          endIdx === -1 ||
          zoneAIdx === -1 ||
          zoneBIdx === -1 ||
          zoneCIdx === -1 ||
          zoneDIdx === -1
        ) {
          toast.error("CSV missing required columns. Please check format.");
          return;
        }

        const parsedData: ZoneFeeRow[] = [];
        const errors: string[] = [];

        // Parse data rows
        for (let i = 1; i < lines.length; i++) {
          // Handle potential commas within quotes if complex CSV needs support,
          // but for now simple split is usually sufficient for numbers/simple strings.
          // Better regex for CSV split: .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
          const values = lines[i]
            .split(",")
            .map((v) => v.trim().replace(/^"|"$/g, ""));

          if (values.length < headers.length) {
            // skip empty or malformed lines
            continue;
          }

          const range = values[rangeIdx];
          const start = parseFloat(values[startIdx]);
          const end = parseFloat(values[endIdx]);
          const zoneA = parseFloat(values[zoneAIdx]);
          const zoneB = parseFloat(values[zoneBIdx]);
          const zoneC = parseFloat(values[zoneCIdx]);
          const zoneD = parseFloat(values[zoneDIdx]);

          if (!range) {
            errors.push(`Row ${i + 1}: Missing Range`);
            continue;
          }
          if (isNaN(start) || start < 0) {
            errors.push(`Row ${i + 1}: Invalid Start area`);
            continue;
          }
          if (isNaN(end) || end < start) {
            errors.push(`Row ${i + 1}: Invalid End area`);
            continue;
          }
          if (isNaN(zoneA) || isNaN(zoneB) || isNaN(zoneC) || isNaN(zoneD)) {
            errors.push(`Row ${i + 1}: Invalid fee amounts`);
            continue;
          }

          parsedData.push({
            range,
            start,
            end,
            lagosZoneA: zoneA,
            lagosZoneB: zoneB,
            lagosZoneC: zoneC,
            lagosZoneD: zoneD,
          });
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
      zoneFees: csvPreviewData,
    });

    setShowCSVPreview(false);
    setCSVPreviewData([]);
    setCSVErrors([]);

    toast.success(`Updated ${csvPreviewData.length} zone fee tiers from CSV`);
  };

  // Export settings as CSV
  const handleExportSettings = () => {
    try {
      // Create CSV content
      let csvContent =
        "Range,Start,End,Lagos Zone A,Lagos Zone B,Lagos Zone C,Lagos Zone D\n";

      settings.zoneFees.forEach((fee) => {
        csvContent += `"${fee.range}",${fee.start},${fee.end},${fee.lagosZoneA},${fee.lagosZoneB},${fee.lagosZoneC},${fee.lagosZoneD}\n`;
      });

      // Create blob and download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `zone-fees-${new Date().toISOString().split("T")[0]}.csv`,
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
      const result = await surfboardApi.settings.history();
      if (result.success) {
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
      const result = await surfboardApi.settings.revert(settingsId);
      if (result.success) {
        toast.success("Settings reverted successfully");
        setShowSettingsHistory(false);
        // Refresh settings
        const settingsResult = await surfboardApi.settings.get();
        if (settingsResult.success) {
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

  const handleResetToDefaults = async () => {
    if (
      !window.confirm(
        "Are you sure you want to reset all settings to their defaults? This action will create a backup, but it replaces all current configurations immediately.",
      )
    ) {
      return;
    }

    try {
      setSettingsSaving(true);
      const result = await surfboardApi.settings.reset();
      if (result.success) {
        toast.success("Settings reset to defaults successfully");
        const settingsResult = await surfboardApi.settings.get();
        if (settingsResult.success) {
          setSettings(settingsResult.data);
          setOriginalSettings(settingsResult.data);
        }
      } else {
        toast.error(result.error || "Failed to reset settings");
      }
    } catch (error) {
      console.error("Error resetting settings:", error);
      toast.error("An error occurred while resetting settings");
    } finally {
      setSettingsSaving(false);
    }
  };

  const handlePreferenceChange = (
    category: string,
    setting: string,
    value: any,
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
    confirmPassword: string,
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
      } successfully!`,
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
                onClick={() => router.push("/surfboard-restricted/dashboard")}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>

          {/* Settings Navigation */}
          <div className="bg-white rounded-lg shadow-lg mb-8">
            <div className="border-b border-gray-200 overflow-x-auto">
              <nav className="flex space-x-8 px-6 w-max min-w-full">
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
                            prev
                              ? { ...prev, firstName: e.target.value }
                              : null,
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
                            prev ? { ...prev, lastName: e.target.value } : null,
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
                            prev ? { ...prev, email: e.target.value } : null,
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
                            prev ? { ...prev, phone: e.target.value } : null,
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
                              : null,
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
                            e.target.value,
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
                            e.target.value,
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
                            e.target.value,
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
                              profile.security.lastPasswordChange,
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
                            !profile.preferences.notifications.email,
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
                            !profile.preferences.notifications.push,
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
                            !profile.preferences.notifications.sms,
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

              {/* Zone Fees Tab */}
              {activeTab === "lga" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">
                      Lagos Zone Fee Settings
                    </h2>
                    <div className="flex flex-wrap gap-3">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleCSVUpload}
                        className="hidden"
                        accept=".csv"
                      />
                      <button
                        onClick={handleResetToDefaults}
                        disabled={settingsSaving}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                        title="Reset to Defaults"
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
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                        Reset Defaults
                      </button>
                      <button
                        onClick={() => setShowCSVFormatHelp(true)}
                        className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
                        title="CSV Format Help"
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
                        Format
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
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
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                          />
                        </svg>
                        Upload CSV
                      </button>
                      <button
                        onClick={handleExportSettings}
                        disabled={settings.zoneFees.length === 0}
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
                  {/* Coordinate Shifts */}
                  <div className="bg-gray-50 rounded-lg p-6 mt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      Coordinate Visualization Shifts
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Set Easting and Northing adjustments for map visualization
                      per state.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-h-96 overflow-y-auto pr-2">
                      {nigerianStates.map((stateObj) => {
                        const state =
                          stateObj.name === "Federal Capital Territory"
                            ? "FCT"
                            : stateObj.name;
                        const key = state.toLowerCase();
                        const shift = settings.coordinateShifts?.[key] || {
                          eastingShift: 0,
                          northingShift: 0,
                        };
                        return (
                          <div
                            key={state}
                            className="p-4 border border-gray-200 rounded-lg bg-white"
                          >
                            <h4 className="font-semibold text-gray-800 mb-3">
                              {state}
                            </h4>
                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">
                                  Easting Shift
                                </label>
                                <input
                                  type="number"
                                  step="0.001"
                                  value={
                                    shift.eastingShift === 0
                                      ? ""
                                      : shift.eastingShift
                                  }
                                  placeholder="0.000"
                                  onChange={(e) =>
                                    handleCoordinateShiftChange(
                                      state,
                                      "eastingShift",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">
                                  Northing Shift
                                </label>
                                <input
                                  type="number"
                                  step="0.001"
                                  value={
                                    shift.northingShift === 0
                                      ? ""
                                      : shift.northingShift
                                  }
                                  placeholder="0.000"
                                  onChange={(e) =>
                                    handleCoordinateShiftChange(
                                      state,
                                      "northingShift",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Zone Fees Table */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Zone Fee Rates by Area
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Fixed fees based on area range and Lagos zone
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
                      </div>
                    </div>

                    <div className="overflow-x-auto overflow-y-auto max-h-[50vh]">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100 sticky top-0">
                          <tr>
                            <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              S/N
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Area Range
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Zone A (₦)
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Zone B (₦)
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Zone C (₦)
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Zone D (₦)
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {settings.zoneFees.map((fee, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-2 py-3 text-center whitespace-nowrap text-sm text-gray-500">
                                {index + 1}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                {fee.range}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-right">
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={fee.lagosZoneA}
                                  onChange={(e) =>
                                    handleUpdateZoneFee(
                                      index,
                                      "lagosZoneA",
                                      parseFloat(e.target.value) || 0,
                                    )
                                  }
                                  className="w-28 px-2 py-1 text-right border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                  disabled={settingsLoading}
                                />
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-right">
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={fee.lagosZoneB}
                                  onChange={(e) =>
                                    handleUpdateZoneFee(
                                      index,
                                      "lagosZoneB",
                                      parseFloat(e.target.value) || 0,
                                    )
                                  }
                                  className="w-28 px-2 py-1 text-right border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                  disabled={settingsLoading}
                                />
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-right">
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={fee.lagosZoneC}
                                  onChange={(e) =>
                                    handleUpdateZoneFee(
                                      index,
                                      "lagosZoneC",
                                      parseFloat(e.target.value) || 0,
                                    )
                                  }
                                  className="w-28 px-2 py-1 text-right border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                  disabled={settingsLoading}
                                />
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-right">
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={fee.lagosZoneD}
                                  onChange={(e) =>
                                    handleUpdateZoneFee(
                                      index,
                                      "lagosZoneD",
                                      parseFloat(e.target.value) || 0,
                                    )
                                  }
                                  className="w-28 px-2 py-1 text-right border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                  disabled={settingsLoading}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        <strong>Note:</strong> Fees are determined by
                        intersecting the survey plan geometry with the
                        Scale_of_fees spatial dataset to determine the zone (A,
                        B, C, or D). Corporate titles or titles with more than 2
                        names are charged double.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

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
                          Zone Fees: {item.settings.zoneFees?.length || 0}{" "}
                          ranges
                        </p>
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

      {/* CSV Format Help Modal */}
      {showCSVFormatHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                CSV Format Guide
              </h2>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">
                Your CSV file must include the following headers
                (case-insensitive):
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm text-gray-700 mb-4">
                <li>
                  <strong>Range</strong> (e.g., "0 - 1000")
                </li>
                <li>
                  <strong>Start</strong> (Start area in sqm)
                </li>
                <li>
                  <strong>End</strong> (End area in sqm)
                </li>
                <li>
                  <strong>Zone A</strong> (Fee for Zone A)
                </li>
                <li>
                  <strong>Zone B</strong> (Fee for Zone B)
                </li>
                <li>
                  <strong>Zone C</strong> (Fee for Zone C)
                </li>
                <li>
                  <strong>Zone D</strong> (Fee for Zone D)
                </li>
              </ul>
              <div className="bg-gray-50 p-3 rounded text-xs font-mono mb-4 overflow-x-auto">
                Range,Start,End,Zone A,Zone B,Zone C,Zone D<br />
                "0 - 1000",0,1000,5000,4000,3000,2000
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setShowCSVFormatHelp(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSV Preview Modal */}
      {showCSVPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Preview CSV Data
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Review the data before applying. This will replace all current
                zone fees.
              </p>
            </div>
            <div className="p-6">
              {csvErrors.length > 0 && (
                <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">
                  <h4 className="font-medium mb-2">Errors found:</h4>
                  <ul className="list-disc list-inside text-sm">
                    {csvErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-sm font-medium">
                    Please fix these errors in your CSV file and try again.
                  </p>
                </div>
              )}

              {csvPreviewData.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Range
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Start
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          End
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Zone A
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Zone B
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Zone C
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Zone D
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {csvPreviewData.slice(0, 10).map((row, i) => (
                        <tr key={i}>
                          <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">
                            {row.range}
                          </td>
                          <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500 text-right">
                            {row.start}
                          </td>
                          <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500 text-right">
                            {row.end}
                          </td>
                          <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                            ₦{row.lagosZoneA.toLocaleString()}
                          </td>
                          <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500 text-right">
                            ₦{row.lagosZoneB.toLocaleString()}
                          </td>
                          <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500 text-right">
                            ₦{row.lagosZoneC.toLocaleString()}
                          </td>
                          <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500 text-right">
                            ₦{row.lagosZoneD.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {csvPreviewData.length > 10 && (
                    <p className="text-center text-sm text-gray-500 mt-2">
                      ...and {csvPreviewData.length - 10} more rows
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-end space-x-4 mt-6">
                <button
                  onClick={() => setShowCSVPreview(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyCSV}
                  disabled={csvErrors.length > 0}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Apply Changes
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
