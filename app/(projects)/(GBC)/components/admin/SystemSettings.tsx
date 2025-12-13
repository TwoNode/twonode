"use client";

import { useState } from "react";
import { Database } from "lucide-react";
import { toast } from "sonner";
import { updateGBCSetting } from "../../actions/settings-actions";
import { GBCSettingsData } from "../../utils/settings";

interface Props {
  settings: GBCSettingsData | null;
}

export function SystemSettings({ settings }: Props) {
  const [maintenanceMode, setMaintenanceMode] = useState(
    settings?.system.maintenanceMode ?? false
  );
  const [debugMode, setDebugMode] = useState(
    settings?.system.debugMode ?? false
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
      const result = await updateGBCSetting(`system.${key}`, value);

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

  return (
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
            onChange={(e) => handleToggle("maintenanceMode", e.target.checked)}
            disabled={loading === "maintenanceMode"}
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 disabled:opacity-50"></div>
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
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 disabled:opacity-50"></div>
        </label>
      </div>
    </div>
  );
}
