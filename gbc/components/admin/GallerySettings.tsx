"use client";

import { useState } from "react";
import { toast } from "sonner";
import { gbcApi } from "@/gbc/apiClient";
import { GBCSettingsData } from "@/gbc/utils/settings";
import { Button } from "@/components/ui/button";

interface Props {
  settings: GBCSettingsData | null;
}

export function GallerySettings({ settings }: Props) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    enabled: settings?.gallery?.enabled ?? true,
    showYearFilter: settings?.gallery?.showYearFilter ?? true,
    defaultYear: settings?.gallery?.defaultYear ?? 2025,
    itemsPerPage: settings?.gallery?.itemsPerPage ?? 12,
  });

  const handleChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const result = await gbcApi.settings.update({ gallery: formData });

      if (result.success) {
        toast.success("Gallery settings updated");
      } else {
        throw new Error(result.error || "Failed to update");
      }
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Failed to update gallery settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div>
          <h3 className="font-medium">Enable Gallery</h3>
          <p className="text-sm text-gray-500">
            Show the gallery section on the public site
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={formData.enabled}
            onChange={(e) => handleChange("enabled", e.target.checked)}
            disabled={loading}
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 disabled:opacity-50"></div>
        </label>
      </div>

      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div>
          <h3 className="font-medium">Show Year Filter</h3>
          <p className="text-sm text-gray-500">
            Allow users to filter gallery items by year
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={formData.showYearFilter}
            onChange={(e) => handleChange("showYearFilter", e.target.checked)}
            disabled={loading}
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 disabled:opacity-50"></div>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Default Year
          </label>
          <input
            type="number"
            value={formData.defaultYear}
            onChange={(e) =>
              handleChange("defaultYear", parseInt(e.target.value))
            }
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            disabled={loading}
          />
          <p className="text-xs text-gray-500 mt-1">
            The year to show by default when visiting the gallery
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Items Per Page
          </label>
          <input
            type="number"
            value={formData.itemsPerPage}
            onChange={(e) =>
              handleChange("itemsPerPage", parseInt(e.target.value))
            }
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            disabled={loading}
          />
          <p className="text-xs text-gray-500 mt-1">
            Number of items to load initially
          </p>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button
          onClick={handleSubmit}
          disabled={loading}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {loading ? "Saving..." : "Save Gallery Settings"}
        </Button>
      </div>
    </div>
  );
}
