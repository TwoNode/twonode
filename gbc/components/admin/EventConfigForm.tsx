// components/admin/EventConfigForm.tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Save,
  Calendar,
  MapPin,
  Tag,
  Edit,
  Plus,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { z } from "zod";
import { gbcApi } from "@/gbc/apiClient";
import { GBCSettingsData } from "@/gbc/utils/settings";

// Define form validation schema
const eventFormSchema = z.object({
  name: z.string().min(3, "Event name must be at least 3 characters"),
  date: z.string().min(1, "Event date is required"),
  time: z.string().min(1, "Event time is required"),
  venue: z.string().min(3, "Venue must be at least 3 characters"),
  theme: z.string().min(3, "Theme must be at least 3 characters"),
  subTheme: z.string().optional(),
  description: z.string().min(10, "Description must be at least 10 characters"),
  registrationOpens: z.string().min(1, "Registration open date is required"),
  registrationCloses: z.string().min(1, "Registration close date is required"),
  importantNotices: z.array(z.string()).optional(),
});

type EventFormData = z.infer<typeof eventFormSchema>;

interface Props {
  settings: GBCSettingsData | null;
  /** The edition these settings belong to; saves go to that edition's row. */
  edition?: string;
}

export function EventConfigForm({ settings, edition }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data from settings
  const [formData, setFormData] = useState<EventFormData>({
    name: settings?.event.name ?? "Geospatial Builders Conference 2.0",
    date: settings?.event.date ?? "2025-03-15",
    time: settings?.event.time ?? "09:00",
    venue: settings?.event.venue ?? "Eko Hotel & Suites, Lagos",
    theme:
      settings?.event.theme ??
      "Geospatial Capital: A Catalyst for Inclusive Growth",
    subTheme:
      settings?.event.subTheme ??
      "Driving Transformation in Land Administration and Energy",
    description:
      settings?.event.description ??
      "The premier platform for geospatial innovation in Nigeria",
    registrationOpens: settings?.event.registrationOpens ?? "2025-01-01",
    registrationCloses: settings?.event.registrationCloses ?? "2025-03-10",
    importantNotices: settings?.event.importantNotices ?? [],
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = (): boolean => {
    try {
      eventFormSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          const path = err.path[0] as string;
          newErrors[path] = err.message;
        });
        setErrors(newErrors);

        // Scroll to first error
        const firstError = document.querySelector('[data-error="true"]');
        if (firstError) {
          firstError.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Update all event settings at once
      const result = await gbcApi.settings.update({ event: formData }, edition);

      if (result.success) {
        toast.success("Event configuration updated successfully");
        setIsEditing(false);
      } else {
        throw new Error(result.error || "Failed to update");
      }
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Failed to update event configuration");
    } finally {
      setIsLoading(false);
    }
  };

  const addNotice = () => {
    setFormData((prev) => ({
      ...prev,
      importantNotices: [...(prev.importantNotices || []), ""],
    }));
  };

  const removeNotice = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      importantNotices: (prev.importantNotices || []).filter(
        (_, i) => i !== index
      ),
    }));
  };

  const updateNotice = (index: number, value: string) => {
    const newNotices = [...(formData.importantNotices || [])];
    newNotices[index] = value;
    setFormData((prev) => ({
      ...prev,
      importantNotices: newNotices,
    }));
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return "Not set";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (!isEditing) {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">{formData.name}</h3>
              <p className="text-sm text-gray-500">Event Name</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">
                {formatDate(formData.date)} at {formData.time}
              </h3>
              <p className="text-sm text-gray-500">Event Date & Time</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-green-100 text-green-600">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">{formData.venue}</h3>
              <p className="text-sm text-gray-500">Venue</p>
            </div>
          </div>

          <div className="pt-2">
            <h4 className="font-medium text-gray-900">Theme</h4>
            <p className="text-gray-700">{formData.theme}</p>
            {formData.subTheme && (
              <p className="text-gray-600 mt-1">{formData.subTheme}</p>
            )}
          </div>

          <div className="pt-2">
            <h4 className="font-medium text-gray-900">Description</h4>
            <p className="text-gray-700 whitespace-pre-line">
              {formData.description}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 pt-2">
            <div>
              <h4 className="font-medium text-gray-900">Registration Opens</h4>
              <p className="text-gray-700">
                {formatDate(formData.registrationOpens)}
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Registration Closes</h4>
              <p className="text-gray-700">
                {formatDate(formData.registrationCloses)}
              </p>
            </div>
          </div>
        </div>

        {formData.importantNotices && formData.importantNotices.length > 0 && (
          <div className="pt-2">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 text-yellow-600">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 mb-2">
                  Important Notices
                </h4>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  {formData.importantNotices.map((notice, index) => (
                    <li key={index}>{notice}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="pt-4">
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <Edit className="h-4 w-4" />
            Edit Event Details
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div className={errors.name ? "space-y-1" : ""}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Event Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
              errors.name
                ? "border-red-500 focus:ring-red-200"
                : "border-gray-300 focus:ring-purple-500 focus:border-purple-500"
            }`}
            placeholder="Geospatial Builders Conference 2.0"
            data-error={!!errors.name}
          />
          {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
        </div>

        <div className={errors.date ? "space-y-1" : ""}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Event Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
              errors.date
                ? "border-red-500 focus:ring-red-200"
                : "border-gray-300 focus:ring-purple-500 focus:border-purple-500"
            }`}
            data-error={!!errors.date}
          />
          {errors.date && <p className="text-sm text-red-600">{errors.date}</p>}
        </div>

        <div className={errors.time ? "space-y-1" : ""}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Event Time <span className="text-red-500">*</span>
          </label>
          <input
            type="time"
            name="time"
            value={formData.time}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
              errors.time
                ? "border-red-500 focus:ring-red-200"
                : "border-gray-300 focus:ring-purple-500 focus:border-purple-500"
            }`}
            data-error={!!errors.time}
          />
          {errors.time && <p className="text-sm text-red-600">{errors.time}</p>}
        </div>

        <div className={errors.venue ? "space-y-1" : ""}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Venue <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="venue"
            value={formData.venue}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
              errors.venue
                ? "border-red-500 focus:ring-red-200"
                : "border-gray-300 focus:ring-purple-500 focus:border-purple-500"
            }`}
            placeholder="Eko Hotel & Suites, Lagos"
            data-error={!!errors.venue}
          />
          {errors.venue && (
            <p className="text-sm text-red-600">{errors.venue}</p>
          )}
        </div>
      </div>

      <div className={errors.theme ? "space-y-1" : ""}>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Event Theme <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="theme"
          value={formData.theme}
          onChange={handleChange}
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
            errors.theme
              ? "border-red-500 focus:ring-red-200"
              : "border-gray-300 focus:ring-purple-500 focus:border-purple-500"
          }`}
          placeholder="Geospatial Capital: A Catalyst for Inclusive Growth"
          data-error={!!errors.theme}
        />
        {errors.theme && <p className="text-sm text-red-600">{errors.theme}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Sub-Theme
        </label>
        <input
          type="text"
          name="subTheme"
          value={formData.subTheme || ""}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          placeholder="Driving Transformation in Land Administration and Energy"
        />
      </div>

      <div className={errors.description ? "space-y-1" : ""}>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          rows={4}
          name="description"
          value={formData.description}
          onChange={handleChange}
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
            errors.description
              ? "border-red-500 focus:ring-red-200"
              : "border-gray-300 focus:ring-purple-500 focus:border-purple-500"
          }`}
          placeholder="The premier platform for geospatial innovation in Nigeria"
          data-error={!!errors.description}
        />
        {errors.description && (
          <p className="text-sm text-red-600">{errors.description}</p>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className={errors.registrationOpens ? "space-y-1" : ""}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Registration Opens <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            name="registrationOpens"
            value={formData.registrationOpens}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
              errors.registrationOpens
                ? "border-red-500 focus:ring-red-200"
                : "border-gray-300 focus:ring-purple-500 focus:border-purple-500"
            }`}
            data-error={!!errors.registrationOpens}
          />
          {errors.registrationOpens && (
            <p className="text-sm text-red-600">{errors.registrationOpens}</p>
          )}
        </div>

        <div className={errors.registrationCloses ? "space-y-1" : ""}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Registration Closes <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            name="registrationCloses"
            value={formData.registrationCloses}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
              errors.registrationCloses
                ? "border-red-500 focus:ring-red-200"
                : "border-gray-300 focus:ring-purple-500 focus:border-purple-500"
            }`}
            data-error={!!errors.registrationCloses}
          />
          {errors.registrationCloses && (
            <p className="text-sm text-red-600">{errors.registrationCloses}</p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Important Notices
        </label>
        <div className="space-y-3">
          {formData.importantNotices?.map((notice, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={notice}
                onChange={(e) => updateNotice(index, e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Enter important notice..."
              />
              <button
                type="button"
                onClick={() => removeNotice(index)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addNotice}
            className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700 font-medium"
          >
            <Plus className="h-4 w-4" />
            Add Notice
          </button>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={() => setIsEditing(false)}
          className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          disabled={isLoading}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {isLoading ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
