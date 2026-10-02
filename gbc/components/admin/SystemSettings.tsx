"use client";

import { useState } from "react";
import { Database, ShieldCheck, Mail, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { gbcApi } from "@/gbc/apiClient";
import { GBCSettingsData } from "@/gbc/utils/settings";

interface Props {
  settings: GBCSettingsData | null;
  /** The edition these settings belong to; saves go to that edition's row. */
  edition?: string;
}

export function SystemSettings({ settings, edition }: Props) {
  const [maintenanceMode, setMaintenanceMode] = useState(
    settings?.system.maintenanceMode ?? false
  );
  const [debugMode, setDebugMode] = useState(
    settings?.system.debugMode ?? false
  );
  const [emailVerificationEnabled, setEmailVerificationEnabled] = useState(
    settings?.emailVerification?.enabled ?? false
  );
  const [emailVerificationMethod, setEmailVerificationMethod] = useState<
    "OTP" | "LINK"
  >(settings?.emailVerification?.method ?? "OTP");
  const [gracePeriodDays, setGracePeriodDays] = useState<number>(
    settings?.emailVerification?.gracePeriodDays ?? 30
  );

  const [loading, setLoading] = useState<string | null>(null);

  const handleToggle = async (
    key: "maintenanceMode" | "debugMode",
    value: boolean
  ) => {
    setLoading(key);
    // Optimistic update
    if (key === "maintenanceMode") setMaintenanceMode(value);
    if (key === "debugMode") setDebugMode(value);

    try {
      const result = await gbcApi.settings.update(
        { system: { [key]: value } },
        edition
      );

      if (result.success) {
        toast.success(
          `${
            key === "maintenanceMode" ? "Maintenance Mode" : "Debug Mode"
          } updated`
        );
      } else {
        // Revert on failure
        if (key === "maintenanceMode") setMaintenanceMode(!value);
        if (key === "debugMode") setDebugMode(!value);
        throw new Error(result.error || "Failed to update");
      }
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Failed to update setting");
    } finally {
      setLoading(null);
    }
  };

  const handleEmailVerificationUpdate = async (
    updates: Partial<{
      enabled: boolean;
      method: "OTP" | "LINK";
      gracePeriodDays: number;
    }>
  ) => {
    const nextEnabled =
      updates.enabled !== undefined
        ? updates.enabled
        : emailVerificationEnabled;
    const nextMethod =
      updates.method !== undefined ? updates.method : emailVerificationMethod;
    const nextGrace =
      updates.gracePeriodDays !== undefined
        ? updates.gracePeriodDays
        : gracePeriodDays;

    setLoading("emailVerification");
    setEmailVerificationEnabled(nextEnabled);
    setEmailVerificationMethod(nextMethod);
    setGracePeriodDays(nextGrace);

    try {
      const result = await gbcApi.settings.update(
        {
          emailVerification: {
            enabled: nextEnabled,
            method: nextMethod,
            gracePeriodDays: nextGrace,
          },
        },
        edition
      );

      if (result.success) {
        toast.success("Email verification settings updated");
      } else {
        // Revert
        setEmailVerificationEnabled(
          settings?.emailVerification?.enabled ?? false
        );
        setEmailVerificationMethod(
          settings?.emailVerification?.method ?? "OTP"
        );
        setGracePeriodDays(settings?.emailVerification?.gracePeriodDays ?? 30);
        throw new Error(result.error || "Failed to update");
      }
    } catch (error) {
      console.error("Email verification update error:", error);
      toast.error("Failed to update email verification settings");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Email Verification Enforcement Card */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600 shrink-0 mt-0.5">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                Email Verification Enforcement
              </h3>
              <p className="text-sm text-gray-500">
                Require new accounts to verify their email before accessing the
                dashboard. Existing accounts are grandfathered in with a
                configurable grace period.
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={emailVerificationEnabled}
              onChange={(e) =>
                handleEmailVerificationUpdate({ enabled: e.target.checked })
              }
              disabled={loading === "emailVerification"}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 disabled:opacity-50"></div>
          </label>
        </div>

        {/* Verification Method & Grace Period Configuration */}
        <div className="pt-3 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-600">
              Verification Method
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleEmailVerificationUpdate({ method: "OTP" })}
                disabled={loading === "emailVerification"}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-sm font-medium transition ${
                  emailVerificationMethod === "OTP"
                    ? "border-purple-600 bg-purple-50 text-purple-900"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                <KeyRound className="h-4 w-4" />
                <span>OTP Code</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  handleEmailVerificationUpdate({ method: "LINK" })
                }
                disabled={loading === "emailVerification"}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-sm font-medium transition ${
                  emailVerificationMethod === "LINK"
                    ? "border-purple-600 bg-purple-50 text-purple-900"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Mail className="h-4 w-4" />
                <span>Magic Link</span>
              </button>
            </div>
            <p className="text-xs text-gray-500">
              {emailVerificationMethod === "OTP"
                ? "Sends a 6-digit one-time code valid for 15 minutes."
                : "Sends a magic link that verifies account upon click."}
            </p>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="gbc-grace-period"
              className="text-xs font-semibold uppercase tracking-wider text-gray-600"
            >
              Grace Period for Existing Accounts
            </label>
            <div className="flex items-center gap-2">
              <input
                id="gbc-grace-period"
                type="number"
                min={1}
                max={365}
                value={gracePeriodDays}
                onChange={(e) =>
                  setGracePeriodDays(Math.max(1, parseInt(e.target.value) || 1))
                }
                onBlur={() =>
                  handleEmailVerificationUpdate({ gracePeriodDays })
                }
                disabled={loading === "emailVerification"}
                className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-500">days</span>
            </div>
            <p className="text-xs text-gray-500">
              Pre-existing accounts have this many days to verify before
              lockout.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h3 className="font-medium">Maintenance Mode</h3>
            <p className="text-sm text-gray-500">
              Temporarily disable ticket sales
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={maintenanceMode}
              onChange={(e) =>
                handleToggle("maintenanceMode", e.target.checked)
              }
              disabled={loading === "maintenanceMode"}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 disabled:opacity-50"></div>
          </label>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h3 className="font-medium">Debug Mode</h3>
            <p className="text-sm text-gray-500">
              Enable detailed logging for troubleshooting
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={debugMode}
              onChange={(e) => handleToggle("debugMode", e.target.checked)}
              disabled={loading === "debugMode"}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 disabled:opacity-50"></div>
          </label>
        </div>
      </div>
    </div>
  );
}
