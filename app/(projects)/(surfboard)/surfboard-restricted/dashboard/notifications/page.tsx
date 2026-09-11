"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
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
import {
  Bell,
  BellRing,
  Plus,
  Trash2,
  Send,
  Users,
  UserCheck,
  Shield,
  Globe,
  Loader2,
  Search,
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Cog,
  FileText,
  Share2,
  X,
} from "lucide-react";
import { format, isToday } from "date-fns";
import { useConfirm } from "@/hooks/useConfirm";
import { PageLoader } from "@/components/ui/spinner";

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
  SPECIFIC_USERS: <UserCheck className="h-3.5 w-3.5" />,
  GENERAL_ADMINS: <Users className="h-3.5 w-3.5" />,
  SUPERADMIN: <Shield className="h-3.5 w-3.5" />,
  ALL_USERS: <Globe className="h-3.5 w-3.5" />,
};

const audienceLabels: Record<NotificationAudience, string> = {
  SPECIFIC_USERS: "Specific Users",
  GENERAL_ADMINS: "All Admins",
  SUPERADMIN: "Superadmins Only",
  ALL_USERS: "All Users",
};

const TYPE_TONE: Record<NotificationType, string> = {
  INFO: "bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30",
  SUCCESS: "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30",
  WARNING: "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30",
  ERROR: "bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/30",
  SYSTEM: "bg-slate-100 dark:bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-500/30",
  PLAN: "bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-500/30",
  SHARING: "bg-teal-100 dark:bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-500/30",
};

const TYPE_ICONS: Record<NotificationType, React.ReactNode> = {
  INFO: <Info className="h-3.5 w-3.5" />,
  SUCCESS: <CheckCircle2 className="h-3.5 w-3.5" />,
  WARNING: <AlertTriangle className="h-3.5 w-3.5" />,
  ERROR: <XCircle className="h-3.5 w-3.5" />,
  SYSTEM: <Cog className="h-3.5 w-3.5" />,
  PLAN: <FileText className="h-3.5 w-3.5" />,
  SHARING: <Share2 className="h-3.5 w-3.5" />,
};

export default function AdminNotificationsPage() {
  const { confirm, ConfirmDialog } = useConfirm();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<NotificationType | "ALL">("ALL");
  const [audienceFilter, setAudienceFilter] = useState<NotificationAudience | "ALL">("ALL");

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
    if (
      !(await confirm({
        title: "Delete notification?",
        description: "Are you sure you want to delete this notification?",
        confirmLabel: "Delete",
        variant: "destructive",
      }))
    ) {
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

  const stats = [
    {
      label: "Total Notifications",
      value: notifications.length,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-500/10",
    },
    {
      label: "Unread",
      value: notifications.filter((n) => !n.isRead).length,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-500/10",
    },
    {
      label: "Sent Today",
      value: notifications.filter((n) => isToday(new Date(n.createdAt))).length,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-500/10",
    },
    {
      label: "Broadcast to All Users",
      value: notifications.filter((n) => n.audience === "ALL_USERS").length,
      color: "text-violet-600 dark:text-violet-400",
      bgColor: "bg-violet-50 dark:bg-violet-500/10",
    },
  ];

  const filteredNotifications = notifications.filter((n) => {
    const matchesSearch =
      !search.trim() ||
      n.title.toLowerCase().includes(search.trim().toLowerCase()) ||
      n.message.toLowerCase().includes(search.trim().toLowerCase());
    const matchesType = typeFilter === "ALL" || n.type === typeFilter;
    const matchesAudience = audienceFilter === "ALL" || n.audience === audienceFilter;
    return matchesSearch && matchesType && matchesAudience;
  });

  const hasActiveFilters = !!search.trim() || typeFilter !== "ALL" || audienceFilter !== "ALL";

  const clearFilters = () => {
    setSearch("");
    setTypeFilter("ALL");
    setAudienceFilter("ALL");
  };

  return (
    <div className="min-h-full space-y-6">
      {ConfirmDialog}
      {/* Header */}
      <div className="mb-2">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <Bell className="h-8 w-8 text-blue-600 shrink-0" />
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                Notification Management
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Create and manage system-wide notifications
            </p>
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
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 dark:border-white/15"
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

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className={`${stat.bgColor} rounded-lg p-4 border border-gray-100 dark:border-white/10`}
            >
              <div className={`text-2xl font-bold ${stat.color} mb-1`}>
                {stat.value}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-surface rounded-lg border border-gray-100 dark:border-white/10 p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or message…"
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as NotificationType | "ALL")}>
            <SelectTrigger className="w-full lg:w-44">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              <SelectItem value="INFO">Info</SelectItem>
              <SelectItem value="SUCCESS">Success</SelectItem>
              <SelectItem value="WARNING">Warning</SelectItem>
              <SelectItem value="ERROR">Error</SelectItem>
              <SelectItem value="SYSTEM">System</SelectItem>
              <SelectItem value="PLAN">Plan</SelectItem>
              <SelectItem value="SHARING">Sharing</SelectItem>
            </SelectContent>
          </Select>
          <Select value={audienceFilter} onValueChange={(v) => setAudienceFilter(v as NotificationAudience | "ALL")}>
            <SelectTrigger className="w-full lg:w-48">
              <SelectValue placeholder="Audience" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Audiences</SelectItem>
              <SelectItem value="ALL_USERS">All Users</SelectItem>
              <SelectItem value="GENERAL_ADMINS">All Admins</SelectItem>
              <SelectItem value="SUPERADMIN">Superadmins Only</SelectItem>
              <SelectItem value="SPECIFIC_USERS">Specific Users</SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button
              variant="outline"
              onClick={clearFilters}
              className="shrink-0"
            >
              <X className="h-4 w-4 mr-2" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && <PageLoader label="Loading notifications…" />}

      {/* Notifications Table */}
      {!loading && (
        <div className="bg-white dark:bg-surface rounded-lg border border-gray-100 dark:border-white/10 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-white/10">
            <thead className="bg-gray-50 dark:bg-white/5">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Audience
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-surface divide-y divide-gray-200 dark:divide-white/10">
              {filteredNotifications.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Bell className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">
                      {notifications.length === 0
                        ? "No notifications yet"
                        : "No notifications match your filters"}
                    </p>
                    {hasActiveFilters && notifications.length > 0 && (
                      <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4">
                        Clear filters
                      </Button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredNotifications.map((notification) => (
                  <tr
                    key={notification.id}
                    className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-semibold rounded-full border ${TYPE_TONE[notification.type]}`}
                      >
                        {TYPE_ICONS[notification.type]}
                        {notification.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {!notification.isRead && (
                          <BellRing
                            className="h-3.5 w-3.5 text-blue-500 shrink-0"
                            aria-label="Unread"
                          />
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {notification.title}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-md">
                            {notification.message}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        {audienceIcons[notification.audience]}
                        {audienceLabels[notification.audience]}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {format(new Date(notification.createdAt), "MMM d, yyyy")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(notification.id)}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-500/10"
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
