"use client";

import { useState, useEffect } from "react";
import { updateGBCSetting } from "../../actions/settings-actions";
import { toast } from "sonner";
import { Bell, Mail, Smartphone, Save, X, Edit } from "lucide-react";

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

type NotificationType = {
  key: string;
  title: string;
  description: string;
  icon: any;
  iconColor: string;
  defaultValue: boolean;
};

export function NotificationSettings({ settings }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    const initialSettings = settings.reduce((acc, setting) => {
      if (setting.key.startsWith("email_") || setting.key.startsWith("sms_")) {
        acc[setting.key] = setting.value === "true";
      }
      return acc;
    }, {} as Record<string, boolean>);

    setNotificationSettings(initialSettings);
  }, [settings]);

  const notificationTypes: NotificationType[] = [
    {
      key: "email_ticket_confirmation",
      title: "Ticket Confirmation",
      description: "Send email when a ticket is purchased",
      icon: Mail,
      iconColor: "text-blue-500",
      defaultValue: true,
    },
    {
      key: "email_event_reminder_7days",
      title: "Event Reminder (7 Days)",
      description: "Send reminder email 7 days before the event",
      icon: Mail,
      iconColor: "text-blue-500",
      defaultValue: true,
    },
    {
      key: "email_event_reminder_1day",
      title: "Event Reminder (1 Day)",
      description: "Send reminder email 1 day before the event",
      icon: Mail,
      iconColor: "text-blue-500",
      defaultValue: true,
    },
    {
      key: "email_admin_new_ticket",
      title: "Admin Notification",
      description: "Notify admins when a new ticket is purchased",
      icon: Bell,
      iconColor: "text-purple-500",
      defaultValue: true,
    },
    {
      key: "email_checkin_confirmation",
      title: "Check-in Confirmation",
      description: "Send confirmation email when attendee checks in",
      icon: Mail,
      iconColor: "text-green-500",
      defaultValue: false,
    },
    {
      key: "sms_ticket_confirmation",
      title: "SMS Confirmation",
      description: "Send SMS when ticket is purchased",
      icon: Smartphone,
      iconColor: "text-green-600",
      defaultValue: false,
    },
  ];

  const handleToggle = (key: string) => {
    setNotificationSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const updates = Object.entries(notificationSettings).map(([key, value]) =>
        updateGBCSetting(key, String(value))
      );

      const results = await Promise.all(updates);

      if (results.every((r) => r.success)) {
        toast.success("Notification settings updated successfully");
        setIsEditing(false);
      } else {
        throw new Error("Some settings failed to update");
      }
    } catch (error) {
      toast.error("Failed to update notification settings");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Notification Settings</h2>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200"
          >
            <Edit className="h-4 w-4" />
            Edit Notifications
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(false)}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              disabled={isLoading}
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {isLoading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {notificationTypes.map((notification) => {
          const Icon = notification.icon;
          const isEnabled =
            notificationSettings[notification.key] ?? notification.defaultValue;

          return (
            <div
              key={notification.key}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-lg ${notification.iconColor.replace(
                    "text-",
                    "bg-"
                  )} bg-opacity-10`}
                >
                  <Icon className={`h-5 w-5 ${notification.iconColor}`} />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">
                    {notification.title}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {notification.description}
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={isEnabled}
                  onChange={() => isEditing && handleToggle(notification.key)}
                  disabled={!isEditing || isLoading}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 disabled:opacity-50"></div>
              </label>
            </div>
          );
        })}
      </div>

      {isEditing && (
        <div className="flex justify-end gap-3 pt-6 mt-6 border-t">
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isLoading}
            className="px-4 py-2 text-sm text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}
    </div>
  );
}
