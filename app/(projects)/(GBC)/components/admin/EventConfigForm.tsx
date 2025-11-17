// components/admin/EventConfigForm.tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Save, Calendar, MapPin, Tag, Edit } from "lucide-react";
import { z } from "zod";
import { updateGBCSetting } from "../../actions/settings-actions";

// Define form validation schema
const eventFormSchema = z.object({
  event_name: z.string().min(3, "Event name must be at least 3 characters"),
  event_date: z.string().min(1, "Event date is required"),
  event_time: z.string().min(1, "Event time is required"),
  event_venue: z.string().min(3, "Venue must be at least 3 characters"),
  event_theme: z.string().min(3, "Theme must be at least 3 characters"),
  event_sub_theme: z.string().optional(),
  event_description: z
    .string()
    .min(10, "Description must be at least 10 characters"),
  registration_opens: z.string().min(1, "Registration open date is required"),
  registration_closes: z.string().min(1, "Registration close date is required"),
});

type EventFormData = z.infer<typeof eventFormSchema>;

interface Setting {
  id: string;
  key: string;
  value: string;
  description?: string | null;
  category?: string | null;
}

interface Props {
  settings: Setting[];
}

export function EventConfigForm({ settings }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data from settings
  const getSetting = (key: string, defaultValue: string = "") => {
    const setting = settings.find((s) => s.key === key);
    return setting?.value || defaultValue;
  };

  const [formData, setFormData] = useState<EventFormData>({
    event_name: getSetting("event_name", "Geospatial Builders Conference 2.0"),
    event_date: getSetting("event_date", "2025-03-15"),
    event_time: getSetting("event_time", "09:00 AM"),
    event_venue: getSetting("event_venue", "Eko Hotel & Suites, Lagos"),
    event_theme: getSetting(
      "event_theme",
      "Geospatial Capital: A Catalyst for Inclusive Growth"
    ),
    event_sub_theme: getSetting(
      "event_sub_theme",
      "Driving Transformation in Land Administration and Energy"
    ),
    event_description: getSetting(
      "event_description",
      "The premier platform for geospatial innovation in Nigeria"
    ),
    registration_opens: getSetting("registration_opens", "2025-01-01"),
    registration_closes: getSetting("registration_closes", "2025-03-10"),
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
      // Update all settings
      const updates = Object.entries(formData).map(([key, value]) =>
        updateGBCSetting(key, String(value))
      );

      const results = await Promise.all(updates);

      if (results.every((r) => r.success)) {
        toast.success("Event configuration updated successfully");
        setIsEditing(false);
      } else {
        throw new Error("Some settings failed to update");
      }
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Failed to update event configuration");
    } finally {
      setIsLoading(false);
    }
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
              <h3 className="font-medium text-gray-900">
                {formData.event_name}
              </h3>
              <p className="text-sm text-gray-500">Event Name</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">
                {formatDate(formData.event_date)} at {formData.event_time}
              </h3>
              <p className="text-sm text-gray-500">Event Date & Time</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-green-100 text-green-600">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">
                {formData.event_venue}
              </h3>
              <p className="text-sm text-gray-500">Venue</p>
            </div>
          </div>

          <div className="pt-2">
            <h4 className="font-medium text-gray-900">Theme</h4>
            <p className="text-gray-700">{formData.event_theme}</p>
            {formData.event_sub_theme && (
              <p className="text-gray-600 mt-1">{formData.event_sub_theme}</p>
            )}
          </div>

          <div className="pt-2">
            <h4 className="font-medium text-gray-900">Description</h4>
            <p className="text-gray-700 whitespace-pre-line">
              {formData.event_description}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 pt-2">
            <div>
              <h4 className="font-medium text-gray-900">Registration Opens</h4>
              <p className="text-gray-700">
                {formatDate(formData.registration_opens)}
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Registration Closes</h4>
              <p className="text-gray-700">
                {formatDate(formData.registration_closes)}
              </p>
            </div>
          </div>
        </div>

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
        <div className={errors.event_name ? "space-y-1" : ""}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Event Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="event_name"
            value={formData.event_name}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
              errors.event_name
                ? "border-red-500 focus:ring-red-200"
                : "border-gray-300 focus:ring-purple-500 focus:border-purple-500"
            }`}
            placeholder="Geospatial Builders Conference 2.0"
            data-error={!!errors.event_name}
          />
          {errors.event_name && (
            <p className="text-sm text-red-600">{errors.event_name}</p>
          )}
        </div>

        <div className={errors.event_date ? "space-y-1" : ""}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Event Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            name="event_date"
            value={formData.event_date}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
              errors.event_date
                ? "border-red-500 focus:ring-red-200"
                : "border-gray-300 focus:ring-purple-500 focus:border-purple-500"
            }`}
            data-error={!!errors.event_date}
          />
          {errors.event_date && (
            <p className="text-sm text-red-600">{errors.event_date}</p>
          )}
        </div>

        <div className={errors.event_time ? "space-y-1" : ""}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Event Time <span className="text-red-500">*</span>
          </label>
          <input
            type="time"
            name="event_time"
            value={formData.event_time}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
              errors.event_time
                ? "border-red-500 focus:ring-red-200"
                : "border-gray-300 focus:ring-purple-500 focus:border-purple-500"
            }`}
            data-error={!!errors.event_time}
          />
          {errors.event_time && (
            <p className="text-sm text-red-600">{errors.event_time}</p>
          )}
        </div>

        <div className={errors.event_venue ? "space-y-1" : ""}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Venue <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="event_venue"
            value={formData.event_venue}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
              errors.event_venue
                ? "border-red-500 focus:ring-red-200"
                : "border-gray-300 focus:ring-purple-500 focus:border-purple-500"
            }`}
            placeholder="Eko Hotel & Suites, Lagos"
            data-error={!!errors.event_venue}
          />
          {errors.event_venue && (
            <p className="text-sm text-red-600">{errors.event_venue}</p>
          )}
        </div>
      </div>

      <div className={errors.event_theme ? "space-y-1" : ""}>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Event Theme <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="event_theme"
          value={formData.event_theme}
          onChange={handleChange}
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
            errors.event_theme
              ? "border-red-500 focus:ring-red-200"
              : "border-gray-300 focus:ring-purple-500 focus:border-purple-500"
          }`}
          placeholder="Geospatial Capital: A Catalyst for Inclusive Growth"
          data-error={!!errors.event_theme}
        />
        {errors.event_theme && (
          <p className="text-sm text-red-600">{errors.event_theme}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Sub-Theme
        </label>
        <input
          type="text"
          name="event_sub_theme"
          value={formData.event_sub_theme || ""}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          placeholder="Driving Transformation in Land Administration and Energy"
        />
      </div>

      <div className={errors.event_description ? "space-y-1" : ""}>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          rows={4}
          name="event_description"
          value={formData.event_description}
          onChange={handleChange}
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
            errors.event_description
              ? "border-red-500 focus:ring-red-200"
              : "border-gray-300 focus:ring-purple-500 focus:border-purple-500"
          }`}
          placeholder="The premier platform for geospatial innovation in Nigeria"
          data-error={!!errors.event_description}
        />
        {errors.event_description && (
          <p className="text-sm text-red-600">{errors.event_description}</p>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className={errors.registration_opens ? "space-y-1" : ""}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Registration Opens <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            name="registration_opens"
            value={formData.registration_opens}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
              errors.registration_opens
                ? "border-red-500 focus:ring-red-200"
                : "border-gray-300 focus:ring-purple-500 focus:border-purple-500"
            }`}
            data-error={!!errors.registration_opens}
          />
          {errors.registration_opens && (
            <p className="text-sm text-red-600">{errors.registration_opens}</p>
          )}
        </div>

        <div className={errors.registration_closes ? "space-y-1" : ""}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Registration Closes <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            name="registration_closes"
            value={formData.registration_closes}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
              errors.registration_closes
                ? "border-red-500 focus:ring-red-200"
                : "border-gray-300 focus:ring-purple-500 focus:border-purple-500"
            }`}
            data-error={!!errors.registration_closes}
          />
          {errors.registration_closes && (
            <p className="text-sm text-red-600">{errors.registration_closes}</p>
          )}
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
