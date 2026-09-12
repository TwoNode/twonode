"use client";

import { useState, useEffect } from "react";
import {
  Bell,
  CheckCircle2,
  Info,
  AlertTriangle,
  XCircle,
  Settings,
  Landmark,
  Search,
  Filter,
  Check,
  X,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  Plus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import Link from "next/link";
import { revaApi } from "@/reva/apiClient";
import { REVA_COLORS, REVA_GRADIENTS } from "@/reva/colors";
import { useServerList } from "@/hooks/useServerList";
import { Pagination } from "@/components/ui/pagination";

type NotificationType =
  | "INFO"
  | "SUCCESS"
  | "WARNING"
  | "ERROR"
  | "SYSTEM"
  | "PAYMENT"
  | "PROPERTY";

type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  userIds?: string[];
  readBy: string[];
  dismissedBy: string[];
  metadata?: any;
  link?: string | null;
  createdAt: string;
  updatedAt: string;
};

const typeIconMap: Record<NotificationType, JSX.Element> = {
  SUCCESS: <CheckCircle2 className="text-green-500 w-5 h-5" />,
  INFO: <Info className="text-blue-500 w-5 h-5" />,
  WARNING: <AlertTriangle className="text-yellow-500 w-5 h-5" />,
  ERROR: <XCircle className="text-red-500 w-5 h-5" />,
  SYSTEM: <Settings className="text-muted w-5 h-5" />,
  PAYMENT: <Landmark className="text-indigo-500 w-5 h-5" />,
  PROPERTY: <Bell className="text-purple-500 w-5 h-5" />,
};

const typeColorMap: Record<NotificationType, string> = {
  SUCCESS:
    "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800",
  INFO: "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800",
  WARNING:
    "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800",
  ERROR: "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800",
  SYSTEM: "bg-gray-50 border-gray-200 dark:bg-gray-950/20 dark:border-gray-800",
  PAYMENT:
    "bg-indigo-50 border-indigo-200 dark:bg-indigo-950/20 dark:border-indigo-800",
  PROPERTY:
    "bg-purple-50 border-purple-200 dark:bg-purple-950/20 dark:border-purple-800",
};

interface NotificationFilters {
  type: NotificationType | "ALL";
  status: "ALL" | "UNREAD" | "READ";
  showDismissed: boolean;
}

export default function AdminNotificationsList() {
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>(
    []
  );
  const [adminUserId, setAdminUserId] = useState<string>("");
  const [userRole, setUserRole] = useState<string>("");
  const [unreadCount, setUnreadCount] = useState(0);

  const {
    items: filteredNotifications,
    total,
    totalPages,
    loading,
    page,
    setPage,
    pageSize,
    setPageSize,
    search: searchTerm,
    setSearch: setSearchTerm,
    filters,
    setFilters,
    reload,
  } = useServerList<Notification, NotificationFilters>(
    async ({ page, pageSize, search, filters }) => {
      const res = await revaApi.notifications.listPaginated({
        page,
        pageSize,
        search: search || undefined,
        type: filters.type !== "ALL" ? filters.type : undefined,
        status: filters.status,
        includeDismissed: filters.showDismissed,
      });
      if (!res.success || !res.data) return res as any;
      return {
        ...res,
        data: {
          ...res.data,
          data: res.data.data.map((n) => ({
            ...n,
            createdAt: n.createdAt.toString(),
            updatedAt: n.updatedAt.toString(),
          })),
        },
      };
    },
    { initialFilters: { type: "ALL", status: "ALL", showDismissed: false } }
  );

  const typeFilter = filters.type;
  const statusFilter = filters.status;
  const showDismissed = filters.showDismissed;
  const setTypeFilter = (type: NotificationType | "ALL") => setFilters((f) => ({ ...f, type }));
  const setStatusFilter = (status: "ALL" | "UNREAD" | "READ") => setFilters((f) => ({ ...f, status }));
  const setShowDismissed = (showDismissed: boolean) => setFilters((f) => ({ ...f, showDismissed }));

  const loadUnreadCount = async () => {
    const result = await revaApi.notifications.unreadCount();
    if (result.success) setUnreadCount(result.data.count);
  };

  useEffect(() => {
    (async () => {
      const admin = await revaApi.auth.me();
      if (admin.success) {
        setAdminUserId(admin.data.id);
        // /api/v1/auth/me lowercases role; this component's comparisons expect the Prisma enum casing
        setUserRole(admin.data.role.toUpperCase());
      }
    })();
    loadUnreadCount();
  }, []);

  const refresh = async () => {
    await Promise.all([reload(), loadUnreadCount()]);
  };

  const handleMarkAsRead = async (notificationId: string) => {
    if (!adminUserId) return;
    try {
      const result = await revaApi.notifications.markRead(notificationId);
      if (result.success) await refresh();
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleDismiss = async (notificationId: string) => {
    if (!adminUserId) return;
    try {
      const result = await revaApi.notifications.dismiss(notificationId);
      if (result.success) await refresh();
    } catch (error) {
      console.error("Error dismissing notification:", error);
    }
  };

  const handleSelectAll = () => {
    if (selectedNotifications.length === filteredNotifications.length) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications(filteredNotifications.map((n) => n.id));
    }
  };

  const handleBulkMarkAsRead = async () => {
    try {
      for (const notificationId of selectedNotifications) {
        await revaApi.notifications.markRead(notificationId);
      }
      setSelectedNotifications([]);
      await refresh();
    } catch (error) {
      console.error("Error bulk marking notifications as read:", error);
    }
  };

  const handleBulkDismiss = async () => {
    try {
      for (const notificationId of selectedNotifications) {
        await revaApi.notifications.dismiss(notificationId);
      }
      setSelectedNotifications([]);
      await refresh();
    } catch (error) {
      console.error("Error bulk dismissing notifications:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading notifications...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
        <div className="flex items-center gap-3">
          <div
            className="p-2 sm:p-3 rounded-full"
            style={{ background: REVA_GRADIENTS.primary }}
          >
            <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <h1
              className="text-xl sm:text-2xl font-bold"
              style={{ color: REVA_COLORS.text.dark }}
            >
              {userRole === "SUPERADMIN" ? "Super Admin" : "Admin"}{" "}
              Notifications
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {unreadCount} unread notifications
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {userRole === "SUPERADMIN" && (
            <Link
              href="/reva-restricted/dashboard/notifications/create"
              className="flex-1 sm:flex-none"
            >
              <Button
                size="sm"
                className="flex items-center gap-2 w-full sm:w-auto"
                style={{ background: REVA_GRADIENTS.primary }}
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Create Notification</span>
                <span className="sm:hidden">Create</span>
              </Button>
            </Link>
          )}
          <Button
            onClick={refresh}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Filter className="w-4 h-4 sm:w-5 sm:h-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <Select
                value={typeFilter}
                onValueChange={(value) =>
                  setTypeFilter(value as NotificationType | "ALL")
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  <SelectItem value="SUCCESS">Success</SelectItem>
                  <SelectItem value="INFO">Info</SelectItem>
                  <SelectItem value="WARNING">Warning</SelectItem>
                  <SelectItem value="ERROR">Error</SelectItem>
                  <SelectItem value="SYSTEM">System</SelectItem>
                  <SelectItem value="PAYMENT">Payment</SelectItem>
                  <SelectItem value="PROPERTY">Property</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(value as "ALL" | "UNREAD" | "READ")
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="UNREAD">Unread</SelectItem>
                  <SelectItem value="READ">Read</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showDismissed"
                  checked={showDismissed}
                  onCheckedChange={(checked) =>
                    setShowDismissed(checked as boolean)
                  }
                />
                <label htmlFor="showDismissed" className="text-sm">
                  Show dismissed
                </label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedNotifications.length > 0 && (
        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
              <span className="text-xs sm:text-sm text-muted-foreground">
                {selectedNotifications.length} notification(s) selected
              </span>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  onClick={handleBulkMarkAsRead}
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-2 flex-1 sm:flex-none"
                >
                  <Eye className="w-4 h-4" />
                  <span className="hidden sm:inline">Mark as Read</span>
                  <span className="sm:hidden">Read</span>
                </Button>
                <Button
                  onClick={handleBulkDismiss}
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-2 flex-1 sm:flex-none"
                >
                  <X className="w-4 h-4" />
                  <span className="hidden sm:inline">Dismiss</span>
                  <span className="sm:hidden">Dismiss</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notifications List */}
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base sm:text-lg">
              Recent Notifications
            </CardTitle>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={
                  selectedNotifications.length ===
                    filteredNotifications.length &&
                  filteredNotifications.length > 0
                }
                onCheckedChange={handleSelectAll}
              />
              <span className="text-xs sm:text-sm text-muted-foreground">
                Select all
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-2 sm:p-6">
          <ScrollArea className="max-h-[600px] space-y-3 sm:space-y-4 pr-2">
            {filteredNotifications.length === 0 ? (
              <div className="text-center py-6 sm:py-8">
                <Bell className="w-8 h-8 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                <p className="text-sm text-muted-foreground">
                  No notifications found
                </p>
              </div>
            ) : (
              filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`flex items-start gap-2 sm:gap-4 p-3 sm:p-4 border rounded-lg transition-all duration-200 hover:shadow-md ${
                    typeColorMap[notif.type]
                  } ${notif.readBy.includes(adminUserId) ? "opacity-75" : ""} ${
                    notif.dismissedBy.includes(adminUserId) ? "opacity-50" : ""
                  }`}
                >
                  <div className="flex items-start gap-2 sm:gap-3 flex-1">
                    <Checkbox
                      checked={selectedNotifications.includes(notif.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedNotifications((prev) => [
                            ...prev,
                            notif.id,
                          ]);
                        } else {
                          setSelectedNotifications((prev) =>
                            prev.filter((id) => id !== notif.id)
                          );
                        }
                      }}
                      className="mt-1"
                    />
                    <div className="mt-1">{typeIconMap[notif.type]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-2 sm:gap-0 mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-xs sm:text-sm truncate">
                            {notif.title}
                          </h3>
                          <p className="text-muted-foreground text-xs sm:text-sm mt-1 line-clamp-2 sm:line-clamp-none">
                            {notif.message}
                          </p>
                          {notif.metadata && (
                            <div className="mt-2 text-xs text-muted-foreground flex flex-wrap gap-2">
                              {notif.metadata.propertyReference && (
                                <span>
                                  Ref: {notif.metadata.propertyReference}
                                </span>
                              )}
                              {notif.metadata.address && (
                                <span className="truncate max-w-[200px]">
                                  Address: {notif.metadata.address}
                                </span>
                              )}
                              {notif.metadata.amount && (
                                <span>
                                  Amount: ₦
                                  {notif.metadata.amount.toLocaleString()}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                          <Badge
                            variant="outline"
                            className="text-[10px] sm:text-xs whitespace-nowrap"
                          >
                            {format(
                              new Date(notif.createdAt),
                              "dd MMM, hh:mm a"
                            )}
                          </Badge>
                          <Badge
                            variant="secondary"
                            className="text-[10px] sm:text-xs"
                          >
                            {notif.type}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {notif.link && (
                          <a
                            href={notif.link}
                            className="text-[10px] sm:text-xs text-blue-600 hover:text-blue-800 underline"
                          >
                            View Details
                          </a>
                        )}
                        {notif.readBy.includes(adminUserId) ? (
                          <span className="text-[10px] sm:text-xs text-green-600 flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Read
                          </span>
                        ) : (
                          <Button
                            onClick={() => handleMarkAsRead(notif.id)}
                            size="sm"
                            variant="ghost"
                            className="h-5 sm:h-6 px-1 sm:px-2 text-[10px] sm:text-xs"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Mark Read
                          </Button>
                        )}
                        {notif.dismissedBy.includes(adminUserId) ? (
                          <span className="text-[10px] sm:text-xs text-gray-500 flex items-center gap-1">
                            <X className="w-3 h-3" />
                            Dismissed
                          </span>
                        ) : (
                          <Button
                            onClick={() => handleDismiss(notif.id)}
                            size="sm"
                            variant="ghost"
                            className="h-5 sm:h-6 px-1 sm:px-2 text-[10px] sm:text-xs"
                          >
                            <X className="w-3 h-3 mr-1" />
                            Dismiss
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </ScrollArea>
          {totalPages > 1 && (
            <div className="mt-4 pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs sm:text-sm text-muted-foreground">
                Page {page} of {totalPages} • {total} notifications
              </p>
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} pageSize={pageSize} onPageSizeChange={setPageSize} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
