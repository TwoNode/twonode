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
  RefreshCw,
  Eye,
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
import { format } from "date-fns";
import { revaApi } from "@/reva/apiClient";
import { REVA_COLORS, REVA_GRADIENTS } from "@/reva/colors";

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

export default function NotificationsList() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<
    Notification[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<NotificationType | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "UNREAD" | "READ">(
    "ALL"
  );
  const [showDismissed, setShowDismissed] = useState(false);
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    fetchUserAndNotifications();
  }, []);

  useEffect(() => {
    filterNotifications();
  }, [notifications, searchTerm, typeFilter, statusFilter, showDismissed]);

  const fetchUserAndNotifications = async () => {
    try {
      setLoading(true);
      const me = await revaApi.auth.me();
      if (me.success) {
        setUserId(me.data.id);
        const result = await revaApi.notifications.list();
        if (result.success) {
          setNotifications(
            (result.data || []).map((notification) => ({
              ...notification,
              createdAt: notification.createdAt.toString(),
              updatedAt: notification.updatedAt.toString(),
            }))
          );
        }
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterNotifications = () => {
    let filtered = notifications;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (notif) =>
          notif.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          notif.message.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by type
    if (typeFilter !== "ALL") {
      filtered = filtered.filter((notif) => notif.type === typeFilter);
    }

    // Filter by status
    if (statusFilter === "UNREAD") {
      filtered = filtered.filter((notif) => !notif.readBy.includes(userId));
    } else if (statusFilter === "READ") {
      filtered = filtered.filter((notif) => notif.readBy.includes(userId));
    }

    // Filter dismissed notifications
    if (!showDismissed) {
      filtered = filtered.filter(
        (notif) => !notif.dismissedBy.includes(userId)
      );
    }

    setFilteredNotifications(filtered);
  };

  const handleMarkAsRead = async (notificationId: string) => {
    if (!userId) return;

    try {
      const result = await revaApi.notifications.markRead(notificationId);
      if (result.success) {
        setNotifications((prev) =>
          prev.map((notif) =>
            notif.id === notificationId
              ? { ...notif, readBy: [...notif.readBy, userId] }
              : notif
          )
        );
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleDismiss = async (notificationId: string) => {
    if (!userId) return;

    try {
      const result = await revaApi.notifications.dismiss(notificationId);
      if (result.success) {
        setNotifications((prev) =>
          prev.map((notif) =>
            notif.id === notificationId
              ? { ...notif, dismissedBy: [...notif.dismissedBy, userId] }
              : notif
          )
        );
      }
    } catch (error) {
      console.error("Error dismissing notification:", error);
    }
  };

  const getUnreadCount = () => {
    return notifications.filter(
      (n) => !n.readBy.includes(userId) && !n.dismissedBy.includes(userId)
    ).length;
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
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="p-3 rounded-full"
            style={{ background: REVA_GRADIENTS.primary }}
          >
            <Bell className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1
              className="text-2xl font-bold"
              style={{ color: REVA_COLORS.text.dark }}
            >
              Notifications
            </h1>
            <p className="text-sm text-muted-foreground">
              {getUnreadCount()} unread notifications
            </p>
          </div>
        </div>
        <Button
          onClick={fetchUserAndNotifications}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
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
              <input
                type="checkbox"
                id="showDismissed"
                checked={showDismissed}
                onChange={(e) => setShowDismissed(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="showDismissed" className="text-sm">
                Show dismissed
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[500px] space-y-4 pr-2">
            {filteredNotifications.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No notifications found</p>
              </div>
            ) : (
              filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`flex items-start gap-4 p-4 border rounded-lg transition-all duration-200 hover:shadow-md ${
                    typeColorMap[notif.type]
                  } ${notif.readBy.includes(userId) ? "opacity-75" : ""} ${
                    notif.dismissedBy.includes(userId) ? "opacity-50" : ""
                  }`}
                >
                  <div className="mt-1">{typeIconMap[notif.type]}</div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="font-medium text-sm">{notif.title}</h3>
                        <p className="text-muted-foreground text-sm mt-1">
                          {notif.message}
                        </p>
                        {notif.metadata && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            {notif.metadata.propertyReference && (
                              <span className="mr-3">
                                Ref: {notif.metadata.propertyReference}
                              </span>
                            )}
                            {notif.metadata.address && (
                              <span className="mr-3">
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
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="text-xs whitespace-nowrap"
                        >
                          {format(new Date(notif.createdAt), "dd MMM, hh:mm a")}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {notif.type}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {notif.link && (
                        <a
                          href={notif.link}
                          className="text-xs text-blue-600 hover:text-blue-800 underline"
                        >
                          View Details
                        </a>
                      )}
                      {!notif.readBy.includes(userId) ? (
                        <Button
                          onClick={() => handleMarkAsRead(notif.id)}
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Mark Read
                        </Button>
                      ) : (
                        <span className="text-xs text-green-600 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Read
                        </span>
                      )}
                      {!notif.dismissedBy.includes(userId) ? (
                        <Button
                          onClick={() => handleDismiss(notif.id)}
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs"
                        >
                          <X className="w-3 h-3 mr-1" />
                          Dismiss
                        </Button>
                      ) : (
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <X className="w-3 h-3" />
                          Dismissed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
