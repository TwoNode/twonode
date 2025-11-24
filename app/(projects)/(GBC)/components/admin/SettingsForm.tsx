"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateMultipleGBCSettings } from "../../actions/settings-actions";
import { Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface GBCSetting {
  id: string;
  key: string;
  value: string | number | boolean | null;
  description?: string | null;
  // createdAt: Date;
  updatedAt: Date;
  category?: string | null;
}

interface SettingsFormProps {
  settings: GBCSetting[];
}

export function SettingsForm({ settings }: SettingsFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>(
    settings.reduce((acc, setting) => {
      acc[setting.key] = setting?.value?.toString() || "";
      return acc;
    }, {} as Record<string, string>)
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const settingsToUpdate = Object.entries(formData).map(([key, value]) => ({
        path: key,
        value,
      }));

      const result = await updateMultipleGBCSettings(settingsToUpdate);

      if (result.success) {
        toast.success("Settings updated successfully");
      } else {
        toast.error(result.error || "Failed to update settings");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleChange(key: string, value: string) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  // Define common settings
  const commonSettings = [
    {
      key: "event_name",
      label: "Event Name",
      type: "text",
      placeholder: "Geospatial Builders Conference 2025",
    },
    {
      key: "event_theme",
      label: "Event Theme",
      type: "text",
      placeholder: "Geospatial Capital: A Catalyst for Inclusive Growth",
    },
    {
      key: "event_sub_theme",
      label: "Event Sub-Theme",
      type: "text",
      placeholder: "Driving Transformation in Land Administration and Energy",
    },
    {
      key: "event_date",
      label: "Event Date",
      type: "date",
      placeholder: "2025-05-15",
    },
    {
      key: "event_location",
      label: "Event Location",
      type: "text",
      placeholder: "Lagos, Nigeria",
    },
    {
      key: "event_venue",
      label: "Event Venue",
      type: "text",
      placeholder: "Conference Center, Lagos",
    },
    {
      key: "event_description",
      label: "Event Description",
      type: "textarea",
      placeholder: "Brief description of the event",
    },
    {
      key: "registration_open",
      label: "Registration Open",
      type: "select",
      options: [
        { value: "true", label: "Yes" },
        { value: "false", label: "No" },
      ],
    },
    {
      key: "early_bird_deadline",
      label: "Early Bird Deadline",
      type: "date",
      placeholder: "2025-04-01",
    },
    {
      key: "contact_email",
      label: "Contact Email",
      type: "email",
      placeholder: "info@twonodetechnologies.com",
    },
    {
      key: "contact_phone",
      label: "Contact Phone",
      type: "tel",
      placeholder: "+234-916-0002-740",
    },
    {
      key: "social_twitter",
      label: "Twitter/X Handle",
      type: "text",
      placeholder: "@GBC2.0",
    },
    {
      key: "social_linkedin",
      label: "LinkedIn Page URL",
      type: "url",
      placeholder: "https://linkedin.com/company/gbc",
    },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {commonSettings.map((setting) => (
          <div
            key={setting.key}
            className={setting.type === "textarea" ? "md:col-span-2" : ""}
          >
            <Label htmlFor={setting.key}>{setting.label}</Label>

            {setting.type === "textarea" ? (
              <Textarea
                id={setting.key}
                value={formData[setting.key] || ""}
                onChange={(e) => handleChange(setting.key, e.target.value)}
                placeholder={setting.placeholder}
                rows={4}
                disabled={isSubmitting}
                className="mt-1"
              />
            ) : setting.type === "select" ? (
              <select
                id={setting.key}
                value={formData[setting.key] || ""}
                onChange={(e) => handleChange(setting.key, e.target.value)}
                disabled={isSubmitting}
                className="mt-1 w-full px-4 py-2 border rounded-lg"
              >
                {setting.options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                id={setting.key}
                type={setting.type}
                value={formData[setting.key] || ""}
                onChange={(e) => handleChange(setting.key, e.target.value)}
                placeholder={setting.placeholder}
                disabled={isSubmitting}
                className="mt-1"
              />
            )}
          </div>
        ))}
      </div>

      {/* Additional custom settings */}
      <div className="border-t pt-6">
        <h3 className="font-bold text-lg mb-4">Custom Settings</h3>

        {settings
          .filter((s) => !commonSettings.some((cs) => cs.key === s.key))
          .map((setting) => (
            <div key={setting.key} className="mb-4">
              <Label htmlFor={setting.key}>
                {setting.key.replace(/_/g, " ").toUpperCase()}
              </Label>
              <Input
                id={setting.key}
                value={formData[setting.key] || ""}
                onChange={(e) => handleChange(setting.key, e.target.value)}
                disabled={isSubmitting}
                className="mt-1"
              />
              {setting.description && (
                <p className="text-xs text-gray-500 mt-1">
                  {setting.description}
                </p>
              )}
            </div>
          ))}
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => window.location.reload()}
          disabled={isSubmitting}
        >
          Reset
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
