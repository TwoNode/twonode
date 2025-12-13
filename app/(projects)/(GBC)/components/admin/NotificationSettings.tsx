"use client";

import { useState } from "react";
import { updateGBCSettingsSection } from "../../actions/settings-actions";
import { toast } from "sonner";
import { Bell, Mail, Smartphone, Save, X, Edit } from "lucide-react";
import { GBCSettingsData } from "../../utils/settings";

interface Props {
  settings: GBCSettingsData | null;
}

type NotificationType = {
  key: keyof NotificationSettings;
  title: string;
  description: string;
  icon: any;
  iconColor: string;
  defaultValue: boolean;
};

type NotificationSettings = {
  emailTicketConfirmation: boolean;
  emailEventReminder7Days: boolean;
  emailEventReminder1Day: boolean;
  emailAdminNewTicket: boolean;
  emailCheckinConfirmation: boolean;
  smsTicketConfirmation: boolean;
};

export function NotificationSettings({ settings }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettings>({
      emailTicketConfirmation:
        settings?.notifications.emailTicketConfirmation ?? true,
      emailEventReminder7Days:
        settings?.notifications.emailEventReminder7Days ?? true,
      emailEventReminder1Day:
        settings?.notifications.emailEventReminder1Day ?? true,
      emailAdminNewTicket: settings?.notifications.emailAdminNewTicket ?? true,
      emailCheckinConfirmation:
        settings?.notifications.emailCheckinConfirmation ?? false,
      smsTicketConfirmation:
        settings?.notifications.smsTicketConfirmation ?? false,
    });

  const notificationTypes: NotificationType[] = [
    {
      key: "emailTicketConfirmation",
      title: "Ticket Confirmation",
      description: "Send email when a ticket is purchased",
      icon: Mail,
      iconColor: "text-blue-500",
      defaultValue: true,
    },
    {
      key: "emailEventReminder7Days",
      title: "Event Reminder (7 Days)",
      description: "Send reminder email 7 days before the event",
      icon: Mail,
      iconColor: "text-blue-500",
      defaultValue: true,
    },
    {
      key: "emailEventReminder1Day",
      title: "Event Reminder (1 Day)",
      description: "Send reminder email 1 day before the event",
      icon: Mail,
      iconColor: "text-blue-500",
      defaultValue: true,
    },
    {
      key: "emailAdminNewTicket",
      title: "Admin Notification",
      description: "Notify admins when a new ticket is purchased",
      icon: Bell,
      iconColor: "text-purple-500",
      defaultValue: true,
    },
    {
      key: "emailCheckinConfirmation",
      title: "Check-in Confirmation",
      description: "Send confirmation email when attendee checks in",
      icon: Mail,
      iconColor: "text-green-500",
      defaultValue: false,
    },
    {
      key: "smsTicketConfirmation",
      title: "SMS Confirmation",
      description: "Send SMS when ticket is purchased",
      icon: Smartphone,
      iconColor: "text-green-600",
      defaultValue: false,
    },
  ];

  const handleToggle = (key: keyof NotificationSettings) => {
    setNotificationSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const result = await updateGBCSettingsSection(
        "notifications",
        notificationSettings
      );

      if (result.success) {
        toast.success("Notification settings updated successfully");
        setIsEditing(false);
      } else {
        throw new Error(result.error || "Failed to update");
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
          const isEnabled = notificationSettings[notification.key];

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
    </div>
  );
}
