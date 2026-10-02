"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2,
  ArrowLeft,
  User,
  Settings as SettingsIcon,
  Sun,
  Moon,
  Monitor,
  Mail,
  Shield,
  FileText,
  Save,
  RotateCcw,
  Eye,
  Percent,
} from "lucide-react";
import { surfboardApi } from "@/surfboard/apiClient";
import type { RecordCopyVerificationTolerances } from "@/surfboard/services/settingsService";

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

interface MDASettings {
  codAcceptanceText: string;
  codPolicyContent: string;
  queryResponseFeePercent: number;
  recordCopyTolerances: RecordCopyVerificationTolerances;
  // Keep the full settings shape for save
  zoneFees: any[];
  systemChargePercent: number;
}

const roleNames: Record<string, string> = {
  ACCOUNTS: "Accounts Admin",
  CHARTING: "Charting Admin",
  SURCON: "SURCON Admin",
  RECORDS_I: "Records I Admin",
  RECORDS_II: "Records II Admin",
  INTAKE: "Intake Admin",
  ARCHIVE: "Archive Admin",
  SUPERADMIN: "Super Administrator",
  MDA_SUPERADMIN: "MDA Super Administrator",
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

  // MDA Settings state
  const [mdaSettings, setMdaSettings] = useState<MDASettings | null>(null);
  const [originalMdaSettings, setOriginalMdaSettings] =
    useState<MDASettings | null>(null);
  const [mdaSettingsLoading, setMdaSettingsLoading] = useState(false);
  const [mdaSettingsSaving, setMdaSettingsSaving] = useState(false);
  const [showPolicyPreview, setShowPolicyPreview] = useState(false);

  const isSuperAdmin = profile?.role === "SUPERADMIN";

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const result = await surfboardApi.session.get();

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

  // Fetch MDA settings when tab is activated
  useEffect(() => {
    if (activeTab === "mda-settings" && !mdaSettings && isSuperAdmin) {
      fetchMdaSettings();
    }
  }, [activeTab, isSuperAdmin]);

  const fetchMdaSettings = async () => {
    try {
      setMdaSettingsLoading(true);
      const result = await surfboardApi.settings.get();
      if (result.success) {
        const s: MDASettings = {
          codAcceptanceText: result.data.codAcceptanceText,
          codPolicyContent: result.data.codPolicyContent,
          queryResponseFeePercent: result.data.queryResponseFeePercent,
          recordCopyTolerances: result.data.recordCopyTolerances || {
            tolAnchor: 0.05,
            tolWCB: 0.05,
            tolDist: 0.05,
            tolArea: 0.01,
            tolPass: 95,
            tolWarn: 80,
          },
          zoneFees: result.data.zoneFees,
          systemChargePercent: result.data.systemChargePercent,
        };
        setMdaSettings(s);
        setOriginalMdaSettings({ ...s });
      } else {
        toast.error(result.error || "Failed to load MDA settings");
      }
    } catch (error) {
      console.error("Error fetching MDA settings:", error);
      toast.error("Failed to load MDA settings");
    } finally {
      setMdaSettingsLoading(false);
    }
  };

  const hasMdaSettingsChanged = () => {
    if (!mdaSettings || !originalMdaSettings) return false;
    return (
      mdaSettings.codAcceptanceText !== originalMdaSettings.codAcceptanceText ||
      mdaSettings.codPolicyContent !== originalMdaSettings.codPolicyContent ||
      mdaSettings.queryResponseFeePercent !==
        originalMdaSettings.queryResponseFeePercent ||
      JSON.stringify(mdaSettings.recordCopyTolerances) !==
        JSON.stringify(originalMdaSettings.recordCopyTolerances)
    );
  };

  const handleSaveMdaSettings = async () => {
    if (!mdaSettings) return;
    try {
      setMdaSettingsSaving(true);
      const result = await surfboardApi.settings.update({
        zoneFees: mdaSettings.zoneFees,
        systemChargePercent: mdaSettings.systemChargePercent,
        codAcceptanceText: mdaSettings.codAcceptanceText,
        codPolicyContent: mdaSettings.codPolicyContent,
        queryResponseFeePercent: mdaSettings.queryResponseFeePercent,
        recordCopyTolerances: mdaSettings.recordCopyTolerances,
      });
      if (result.success) {
        toast.success("MDA settings updated successfully");
        setOriginalMdaSettings({ ...mdaSettings });
      } else {
        toast.error(result.error || "Failed to save settings");
      }
    } catch (error) {
      console.error("Error saving MDA settings:", error);
      toast.error("An error occurred while saving settings");
    } finally {
      setMdaSettingsSaving(false);
    }
  };

  const handleResetMdaSettings = () => {
    if (originalMdaSettings) {
      setMdaSettings({ ...originalMdaSettings });
      toast.info("Changes discarded");
    }
  };

  const handleSavePreferences = async () => {
    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSaving(false);
    toast.success("Preferences saved successfully!");
  };

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Loading settings...
          </p>
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Settings
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage your profile and preferences
            </p>
          </div>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>

        {/* Settings Card */}
        <div className="bg-white dark:bg-surface rounded-2xl shadow-lg overflow-hidden">
          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-white/10">
            <nav className="flex px-6 overflow-x-auto">
              <button
                onClick={() => setActiveTab("profile")}
                className={`py-4 px-4 border-b-2 font-medium text-sm flex items-center gap-2 whitespace-nowrap ${
                  activeTab === "profile"
                    ? "border-purple-500 text-purple-600"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <User className="w-4 h-4" />
                Profile
              </button>
              <button
                onClick={() => setActiveTab("preferences")}
                className={`py-4 px-4 border-b-2 font-medium text-sm flex items-center gap-2 whitespace-nowrap ${
                  activeTab === "preferences"
                    ? "border-purple-500 text-purple-600"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <SettingsIcon className="w-4 h-4" />
                Preferences
              </button>
              {isSuperAdmin && (
                <button
                  onClick={() => setActiveTab("mda-settings")}
                  className={`py-4 px-4 border-b-2 font-medium text-sm flex items-center gap-2 whitespace-nowrap ${
                    activeTab === "mda-settings"
                      ? "border-purple-500 text-purple-600"
                      : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  MDA Settings
                </button>
              )}
            </nav>
          </div>

          <div className="p-8">
            {/* Profile Tab */}
            {activeTab === "profile" && profile && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Profile Information
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={profile.firstName}
                      disabled
                      className="w-full px-4 py-3 border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-gray-300"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={profile.lastName}
                      disabled
                      className="w-full px-4 py-3 border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-gray-300"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={profile.email}
                      disabled
                      className="w-full px-4 py-3 border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-gray-300"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Role
                    </label>
                    <div className="w-full px-4 py-3 border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-purple-600" />
                      <span className="text-gray-700 dark:text-gray-300 font-medium">
                        {roleNames[profile.role] || profile.role}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Info Banner */}
                <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4">
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
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Application Preferences
                </h2>

                {/* Theme Selection */}
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
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
                          : "border-gray-200 dark:border-white/10 hover:border-gray-300"
                      }`}
                    >
                      <Sun
                        className={`w-6 h-6 ${
                          preferences.theme === "light"
                            ? "text-purple-600"
                            : "text-gray-500 dark:text-gray-400"
                        }`}
                      />
                      <span
                        className={`text-sm font-medium ${
                          preferences.theme === "light"
                            ? "text-purple-600"
                            : "text-gray-600 dark:text-gray-400"
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
                          : "border-gray-200 dark:border-white/10 hover:border-gray-300"
                      }`}
                    >
                      <Moon
                        className={`w-6 h-6 ${
                          preferences.theme === "dark"
                            ? "text-purple-600"
                            : "text-gray-500 dark:text-gray-400"
                        }`}
                      />
                      <span
                        className={`text-sm font-medium ${
                          preferences.theme === "dark"
                            ? "text-purple-600"
                            : "text-gray-600 dark:text-gray-400"
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
                          : "border-gray-200 dark:border-white/10 hover:border-gray-300"
                      }`}
                    >
                      <Monitor
                        className={`w-6 h-6 ${
                          preferences.theme === "auto"
                            ? "text-purple-600"
                            : "text-gray-500 dark:text-gray-400"
                        }`}
                      />
                      <span
                        className={`text-sm font-medium ${
                          preferences.theme === "auto"
                            ? "text-purple-600"
                            : "text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        Auto
                      </span>
                    </button>
                  </div>
                </div>

                {/* Email Notifications */}
                <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-white/10 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Mail className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                        Email Notifications
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
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
                      className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-surface transition-transform ${
                        preferences.emailNotifications
                          ? "translate-x-6"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-white/10">
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

            {/* MDA Settings Tab - Superadmin Only */}
            {activeTab === "mda-settings" && isSuperAdmin && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    MDA Administration Settings
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Configure CoD submission policy, acceptance text, and query
                    response fees
                  </p>
                </div>

                {mdaSettingsLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto" />
                      <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                        Loading MDA settings...
                      </p>
                    </div>
                  </div>
                ) : mdaSettings ? (
                  <>
                    {/* CoD Acceptance Text */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-purple-600" />
                        <label className="text-sm font-semibold text-gray-900 dark:text-white">
                          CoD Acceptance Affirmation Text
                        </label>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        This is the text surveyors must accept when submitting a
                        CoD batch. It appears as a checkbox label in the
                        submission modal.
                      </p>
                      <textarea
                        value={mdaSettings.codAcceptanceText}
                        onChange={(e) =>
                          setMdaSettings({
                            ...mdaSettings,
                            codAcceptanceText: e.target.value,
                          })
                        }
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-white/15 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm resize-none"
                        placeholder="I hereby affirm that the information provided..."
                      />
                      <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">
                          Preview:
                        </p>
                        <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <input
                            type="checkbox"
                            checked
                            disabled
                            className="mt-1 rounded"
                          />
                          <span>
                            {mdaSettings.codAcceptanceText || "No text set"}
                          </span>
                        </label>
                      </div>
                    </div>

                    {/* Divider */}
                    <hr className="border-gray-200 dark:border-white/10" />

                    {/* CoD Policy Content */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Shield className="w-5 h-5 text-purple-600" />
                          <label className="text-sm font-semibold text-gray-900 dark:text-white">
                            CoD Submission Policy Content
                          </label>
                        </div>
                        <button
                          onClick={() =>
                            setShowPolicyPreview(!showPolicyPreview)
                          }
                          className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          {showPolicyPreview ? "Hide Preview" : "Show Preview"}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Full policy text shown to surveyors before submission.
                        Supports line breaks for formatting.
                      </p>
                      <textarea
                        value={mdaSettings.codPolicyContent}
                        onChange={(e) =>
                          setMdaSettings({
                            ...mdaSettings,
                            codPolicyContent: e.target.value,
                          })
                        }
                        rows={8}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-white/15 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm font-mono resize-y"
                        placeholder="Official CoD Submission Policy..."
                      />
                      {showPolicyPreview && (
                        <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-4">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">
                            Policy Preview (as seen by surveyors):
                          </p>
                          <div className="bg-white dark:bg-surface rounded-lg p-4 border border-gray-100 dark:border-white/10 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-h-48 overflow-y-auto">
                            {mdaSettings.codPolicyContent ||
                              "No policy content set"}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Divider */}
                    <hr className="border-gray-200 dark:border-white/10" />

                    {/* Query Response Fee Percentage */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Percent className="w-5 h-5 text-purple-600" />
                        <label className="text-sm font-semibold text-gray-900 dark:text-white">
                          Query Response Fee Percentage
                        </label>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Additional percentage charged when a surveyor responds
                        to a query and resubmits.
                      </p>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={mdaSettings.queryResponseFeePercent}
                          onChange={(e) =>
                            setMdaSettings({
                              ...mdaSettings,
                              queryResponseFeePercent:
                                parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-32 px-4 py-3 border border-gray-300 dark:border-white/15 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                          %
                        </span>
                      </div>
                      <div className="bg-violet-50 border border-violet-200 rounded-lg p-3">
                        <p className="text-xs text-violet-800">
                          <strong>Example:</strong> If the original CoD fee was
                          ₦10,000 and the query response fee is{" "}
                          {mdaSettings.queryResponseFeePercent}%, the surveyor
                          pays{" "}
                          <strong>
                            ₦
                            {(
                              (10000 * mdaSettings.queryResponseFeePercent) /
                              100
                            ).toLocaleString(undefined, {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            })}
                          </strong>{" "}
                          to resubmit (i.e.{" "}
                          {mdaSettings.queryResponseFeePercent}% of ₦10,000 —
                          not the full CoD fee again ).
                        </p>
                      </div>
                    </div>

                    {/* Divider */}
                    <hr className="border-gray-200 dark:border-white/10" />

                    {/* Record Copy Verification Tolerances */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-purple-600" />
                        <label className="text-sm font-semibold text-gray-900 dark:text-white">
                          Record Copy Verification Tolerances
                        </label>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        These tolerances dictate how strict the automated Record
                        Copy validation is when comparing the PDF with the
                        entered survey coordinates.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-200 dark:border-white/10">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Anchor Coord (m)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={mdaSettings.recordCopyTolerances.tolAnchor}
                            onChange={(e) =>
                              setMdaSettings({
                                ...mdaSettings,
                                recordCopyTolerances: {
                                  ...mdaSettings.recordCopyTolerances,
                                  tolAnchor: parseFloat(e.target.value) || 0,
                                },
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-white/15 rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Bearing WCB (°)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={mdaSettings.recordCopyTolerances.tolWCB}
                            onChange={(e) =>
                              setMdaSettings({
                                ...mdaSettings,
                                recordCopyTolerances: {
                                  ...mdaSettings.recordCopyTolerances,
                                  tolWCB: parseFloat(e.target.value) || 0,
                                },
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-white/15 rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Distance (m)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={mdaSettings.recordCopyTolerances.tolDist}
                            onChange={(e) =>
                              setMdaSettings({
                                ...mdaSettings,
                                recordCopyTolerances: {
                                  ...mdaSettings.recordCopyTolerances,
                                  tolDist: parseFloat(e.target.value) || 0,
                                },
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-white/15 rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Area (sq m)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={mdaSettings.recordCopyTolerances.tolArea}
                            onChange={(e) =>
                              setMdaSettings({
                                ...mdaSettings,
                                recordCopyTolerances: {
                                  ...mdaSettings.recordCopyTolerances,
                                  tolArea: parseFloat(e.target.value) || 0,
                                },
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-white/15 rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Pass Threshold (%)
                          </label>
                          <input
                            type="number"
                            step="1"
                            value={mdaSettings.recordCopyTolerances.tolPass}
                            onChange={(e) =>
                              setMdaSettings({
                                ...mdaSettings,
                                recordCopyTolerances: {
                                  ...mdaSettings.recordCopyTolerances,
                                  tolPass: parseFloat(e.target.value) || 0,
                                },
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-white/15 rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Warn Threshold (%)
                          </label>
                          <input
                            type="number"
                            step="1"
                            value={mdaSettings.recordCopyTolerances.tolWarn}
                            onChange={(e) =>
                              setMdaSettings({
                                ...mdaSettings,
                                recordCopyTolerances: {
                                  ...mdaSettings.recordCopyTolerances,
                                  tolWarn: parseFloat(e.target.value) || 0,
                                },
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-white/15 rounded-lg text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-white/10">
                      <button
                        onClick={handleResetMdaSettings}
                        disabled={!hasMdaSettingsChanged() || mdaSettingsSaving}
                        className="px-4 py-2.5 border border-gray-300 dark:border-white/15 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Discard Changes
                      </button>
                      <button
                        onClick={handleSaveMdaSettings}
                        disabled={!hasMdaSettingsChanged() || mdaSettingsSaving}
                        className={`px-6 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium ${
                          hasMdaSettingsChanged() ? "animate-pulse" : ""
                        }`}
                      >
                        {mdaSettingsSaving ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            Save MDA Settings
                          </>
                        )}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Failed to load MDA settings
                    </p>
                    <button
                      onClick={fetchMdaSettings}
                      className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                    >
                      Retry
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
