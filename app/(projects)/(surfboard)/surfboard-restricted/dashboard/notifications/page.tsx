"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { surfboardApi } from "@/surfboard/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  Plus,
  Trash2,
  Send,
  Users,
  UserCheck,
  Shield,
  Globe,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";

type NotificationType =
  | "INFO"
  | "SUCCESS"
  | "WARNING"
  | "ERROR"
  | "SYSTEM"
  | "PLAN"
  | "SHARING";
type NotificationAudience =
  | "SPECIFIC_USERS"
  | "GENERAL_ADMINS"
  | "SUPERADMIN"
  | "ALL_USERS";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  audience: NotificationAudience;
  link: string | null;
  createdAt: Date;
  isRead: boolean;
  isDismissed: boolean;
}

const audienceIcons: Record<NotificationAudience, React.ReactNode> = {
  SPECIFIC_USERS: <UserCheck className="h-4 w-4" />,
  GENERAL_ADMINS: <Users className="h-4 w-4" />,
  SUPERADMIN: <Shield className="h-4 w-4" />,
  ALL_USERS: <Globe className="h-4 w-4" />,
};

const audienceLabels: Record<NotificationAudience, string> = {
  SPECIFIC_USERS: "Specific Users",
  GENERAL_ADMINS: "All Admins",
  SUPERADMIN: "Superadmins Only",
  ALL_USERS: "All Users",
};

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    type: "INFO" as NotificationType,
    title: "",
    message: "",
    audience: "ALL_USERS" as NotificationAudience,
    link: "",
    sendEmail: false,
  });

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const result = await surfboardApi.notifications.list({
        includeRead: true,
        includeDismissed: true,
        limit: 100,
      });

      if (result.success) {
        setNotifications(result.data);
      } else {
        toast.error("Failed to load notifications");
      }
    } catch (error) {
      console.error("Error loading notifications:", error);
      toast.error("Error loading notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleCreate = async () => {
    if (!formData.title.trim() || !formData.message.trim()) {
      toast.error("Title and message are required");
      return;
    }

    try {
      setCreating(true);
      const result = await surfboardApi.notifications.create({
        type: formData.type,
        title: formData.title,
        message: formData.message,
        audience: formData.audience,
        link: formData.link || undefined,
        sendEmail: formData.sendEmail,
      });

      if (result.success) {
        toast.success("Notification created successfully");
        setShowCreateDialog(false);
        setFormData({
          type: "INFO",
          title: "",
          message: "",
          audience: "ALL_USERS",
          link: "",
          sendEmail: false,
        });
        loadNotifications();
      } else {
        toast.error(result.error || "Failed to create notification");
      }
    } catch (error) {
      console.error("Error creating notification:", error);
      toast.error("Error creating notification");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (notificationId: string) => {
    if (!confirm("Are you sure you want to delete this notification?")) {
      return;
    }

    const result = await surfboardApi.notifications.remove(notificationId);
    if (result.success) {
      toast.success("Notification deleted");
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } else {
      toast.error("Failed to delete notification");
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Bell className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              Notification Management
            </h1>
          </div>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Create Notification
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Notification</DialogTitle>
                <DialogDescription>
                  Send a notification to users or admins
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Type */}
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: NotificationType) =>
                      setFormData({ ...formData, type: value })
                    }
                  >
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INFO">Info</SelectItem>
                      <SelectItem value="SUCCESS">Success</SelectItem>
                      <SelectItem value="WARNING">Warning</SelectItem>
                      <SelectItem value="ERROR">Error</SelectItem>
                      <SelectItem value="SYSTEM">System</SelectItem>
                      <SelectItem value="PLAN">Plan</SelectItem>
                      <SelectItem value="SHARING">Sharing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Audience */}
                <div className="space-y-2">
                  <Label htmlFor="audience">Audience</Label>
                  <Select
                    value={formData.audience}
                    onValueChange={(value: NotificationAudience) =>
                      setFormData({ ...formData, audience: value })
                    }
                  >
                    <SelectTrigger id="audience">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL_USERS">All Users</SelectItem>
                      <SelectItem value="GENERAL_ADMINS">All Admins</SelectItem>
                      <SelectItem value="SUPERADMIN">
                        Superadmins Only
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="Enter notification title"
                  />
                </div>

                {/* Message */}
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) =>
                      setFormData({ ...formData, message: e.target.value })
                    }
                    placeholder="Enter notification message"
                    rows={4}
                  />
                </div>

                {/* Link */}
                <div className="space-y-2">
                  <Label htmlFor="link">Link (optional)</Label>
                  <Input
                    id="link"
                    value={formData.link}
                    onChange={(e) =>
                      setFormData({ ...formData, link: e.target.value })
                    }
                    placeholder="/surfboard/dashboard/plan?planId=..."
                  />
                </div>

                {/* Send Email */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="sendEmail"
                    checked={formData.sendEmail}
                    onChange={(e) =>
                      setFormData({ ...formData, sendEmail: e.target.checked })
                    }
                    className="h-4 w-4 text-blue-600 rounded border-gray-300"
                  />
                  <Label htmlFor="sendEmail" className="cursor-pointer">
                    Send email notification
                  </Label>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={creating}>
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Create & Send
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <p className="text-gray-600">
          Create and manage system-wide notifications
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      )}

      {/* Notifications Table */}
      {!loading && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Audience
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {notifications.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No notifications yet</p>
                  </td>
                </tr>
              ) : (
                notifications.map((notification) => (
                  <tr key={notification.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant="outline">{notification.type}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {notification.title}
                      </div>
                      <div className="text-sm text-gray-500 truncate max-w-md">
                        {notification.message}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        {audienceIcons[notification.audience]}
                        {audienceLabels[notification.audience]}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(notification.createdAt), "MMM d, yyyy")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(notification.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
