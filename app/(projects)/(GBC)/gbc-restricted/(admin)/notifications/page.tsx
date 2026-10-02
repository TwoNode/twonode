"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { gbcApi } from "@/gbc/apiClient";
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
  Shield,
  Globe,
  Loader2,
  Search,
} from "lucide-react";
import { format } from "date-fns";
import type { GBCNotificationItem } from "@/gbc/apiClient";
import { useServerList } from "@/hooks/useServerList";
import { Pagination } from "@/components/ui/pagination";
import { useConfirm } from "@/hooks/useConfirm";

type NotificationType = "INFO" | "SUCCESS" | "WARNING" | "ERROR" | "SYSTEM";
type NotificationAudience = "GENERAL_ADMINS" | "SUPERADMIN" | "ALL_USERS";

const audienceIcons: Record<NotificationAudience, React.ReactNode> = {
  GENERAL_ADMINS: <Users className="h-4 w-4" />,
  SUPERADMIN: <Shield className="h-4 w-4" />,
  ALL_USERS: <Globe className="h-4 w-4" />,
};

const audienceLabels: Record<NotificationAudience, string> = {
  GENERAL_ADMINS: "All Admins",
  SUPERADMIN: "Superadmins Only",
  ALL_USERS: "All Admins (incl. Superadmins)",
};

/**
 * GBC's admin notification composer — mirrors Surfboard's
 * (surfboard-restricted/dashboard/notifications) closely, minus PLAN/
 * SHARING types and per-user targeting (GBC has no admin-facing "assign to
 * specific user" UI yet, same as Surfboard's own create dialog never
 * exposed SPECIFIC_USERS either — it's create-only from userIds server-side).
 */
interface NotificationFilters {
  type: NotificationType | "ALL";
}

export default function GBCAdminNotificationsPage() {
  const { confirm, ConfirmDialog } = useConfirm();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);

  const [formData, setFormData] = useState({
    type: "INFO" as NotificationType,
    title: "",
    message: "",
    audience: "ALL_USERS" as NotificationAudience,
    link: "",
  });

  const {
    items: notifications,
    total,
    totalPages,
    loading,
    page,
    setPage,
    pageSize,
    setPageSize,
    search,
    setSearch,
    filters,
    setFilters,
    reload,
  } = useServerList<GBCNotificationItem, NotificationFilters>(
    async ({ page, pageSize, search, filters }) => {
      const res = await gbcApi.notifications.listPaginated({
        page,
        pageSize,
        search: search || undefined,
        type: filters.type !== "ALL" ? filters.type : undefined,
        includeRead: true,
        includeDismissed: true,
      });
      if (!res.success) toast.error("Failed to load notifications");
      return res;
    },
    { initialFilters: { type: "ALL" } }
  );

  const typeFilter = filters.type;
  const setTypeFilter = (type: NotificationType | "ALL") =>
    setFilters({ type });

  const handleCreate = async () => {
    if (!formData.title.trim() || !formData.message.trim()) {
      toast.error("Title and message are required");
      return;
    }

    try {
      setCreating(true);
      const result = await gbcApi.notifications.create({
        type: formData.type,
        title: formData.title,
        message: formData.message,
        audience: formData.audience,
        link: formData.link || undefined,
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
        });
        reload();
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
        title: "Delete this notification?",
        description: "This action cannot be undone.",
        confirmLabel: "Delete",
        variant: "destructive",
      }))
    )
      return;

    const result = await gbcApi.notifications.remove(notificationId);
    if (result.success) {
      toast.success("Notification deleted");
      reload();
    } else {
      toast.error("Failed to delete notification");
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      {ConfirmDialog}
      <div className="mb-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <Bell className="h-8 w-8 text-purple-600 shrink-0" />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Notification Management
            </h1>
          </div>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Plus className="h-4 w-4 mr-2" />
                Create Notification
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Notification</DialogTitle>
                <DialogDescription>
                  Send a notification to admins
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
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
                    </SelectContent>
                  </Select>
                </div>

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
                      <SelectItem value="ALL_USERS">
                        All Admins (incl. Superadmins)
                      </SelectItem>
                      <SelectItem value="GENERAL_ADMINS">All Admins</SelectItem>
                      <SelectItem value="SUPERADMIN">
                        Superadmins Only
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

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

                <div className="space-y-2">
                  <Label htmlFor="link">Link (optional)</Label>
                  <Input
                    id="link"
                    value={formData.link}
                    onChange={(e) =>
                      setFormData({ ...formData, link: e.target.value })
                    }
                    placeholder="/gbc-restricted/tickets"
                  />
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
        <p className="text-gray-600">Create and manage admin notifications</p>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or message…"
            className="pl-9"
          />
        </div>
        <Select
          value={typeFilter}
          onValueChange={(v) => setTypeFilter(v as NotificationType | "ALL")}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="INFO">Info</SelectItem>
            <SelectItem value="SUCCESS">Success</SelectItem>
            <SelectItem value="WARNING">Warning</SelectItem>
            <SelectItem value="ERROR">Error</SelectItem>
            <SelectItem value="SYSTEM">System</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      )}

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
                        {
                          audienceIcons[
                            notification.audience as NotificationAudience
                          ]
                        }
                        {
                          audienceLabels[
                            notification.audience as NotificationAudience
                          ]
                        }
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
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-sm text-gray-600">
                Page {page} of {totalPages} • {total} notifications
              </p>
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
                pageSize={pageSize}
                onPageSizeChange={setPageSize}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
