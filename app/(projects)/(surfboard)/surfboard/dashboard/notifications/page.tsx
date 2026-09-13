"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { surfboardApi } from "@/surfboard/apiClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  Check,
  X,
  Info,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Settings,
  Share2,
  FileText,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

type NotificationType =
  | "INFO"
  | "SUCCESS"
  | "WARNING"
  | "ERROR"
  | "SYSTEM"
  | "PLAN"
  | "SHARING";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  createdAt: Date;
  isRead: boolean;
  isDismissed: boolean;
}

const typeIcons: Record<NotificationType, React.ReactNode> = {
  INFO: <Info className="h-5 w-5 text-blue-500" />,
  SUCCESS: <CheckCircle className="h-5 w-5 text-green-500" />,
  WARNING: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
  ERROR: <AlertCircle className="h-5 w-5 text-red-500" />,
  SYSTEM: <Settings className="h-5 w-5 text-purple-500" />,
  PLAN: <FileText className="h-5 w-5 text-indigo-500" />,
  SHARING: <Share2 className="h-5 w-5 text-pink-500" />,
};

const typeColors: Record<NotificationType, string> = {
  INFO: "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20",
  SUCCESS: "bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20",
  WARNING: "bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/20",
  ERROR: "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20",
  SYSTEM: "bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20",
  PLAN: "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20",
  SHARING: "bg-pink-50 dark:bg-pink-500/10 border-pink-200 dark:border-pink-500/20",
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const result = await surfboardApi.notifications.list({
        includeRead: filter === "all",
        includeDismissed: false,
        limit: 50,
      });

      if (result.success) {
        setNotifications(result.data);
      } else {
        toast.error("Failed to load notifications");
      }

      // Get unread count
      const countResult = await surfboardApi.notifications.unreadCount();
      if (countResult.success) {
        setUnreadCount(countResult.data.count);
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
  }, [filter]);

  const handleMarkAsRead = async (notificationId: string) => {
    const result = await surfboardApi.notifications.markRead(notificationId);
    if (result.success) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } else {
      toast.error("Failed to mark as read");
    }
  };

  const handleDismiss = async (notificationId: string) => {
    const result = await surfboardApi.notifications.dismiss(notificationId);
    if (result.success) {
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      toast.success("Notification dismissed");
    } else {
      toast.error("Failed to dismiss notification");
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Bell className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Notifications</h1>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-sm">
                {unreadCount} unread
              </Badge>
            )}
          </div>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Stay updated with your survey plans and system notifications
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-white/10">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 font-medium transition-colors ${
            filter === "all"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
          }`}
        >
          All Notifications
        </button>
        <button
          onClick={() => setFilter("unread")}
          className={`px-4 py-2 font-medium transition-colors ${
            filter === "unread"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
          }`}
        >
          Unread
          {unreadCount > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-600 rounded-full">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      )}

      {/* Notifications List */}
      {!loading && (
        <div className="space-y-3">
          {notifications.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10">
              <Bell className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">
                No notifications
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                {filter === "unread"
                  ? "You're all caught up!"
                  : "You don't have any notifications yet"}
              </p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`relative border rounded-lg p-4 transition-all ${
                  typeColors[notification.type]
                } ${notification.isRead ? "opacity-75" : "shadow-sm"}`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="shrink-0 mt-1">
                    {typeIcons[notification.type]}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {notification.title}
                      </h3>
                      <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {format(
                          new Date(notification.createdAt),
                          "MMM d, h:mm a"
                        )}
                      </span>
                    </div>

                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                      {notification.message}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {notification.link && (
                        <Link href={notification.link}>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={() => {
                              if (!notification.isRead) {
                                handleMarkAsRead(notification.id);
                              }
                            }}
                          >
                            View Details
                          </Button>
                        </Link>
                      )}

                      {!notification.isRead && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs"
                          onClick={() => handleMarkAsRead(notification.id)}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Mark as Read
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-600"
                        onClick={() => handleDismiss(notification.id)}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Dismiss
                      </Button>
                    </div>
                  </div>

                  {/* Unread Indicator */}
                  {!notification.isRead && (
                    <div className="absolute top-4 right-4">
                      <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
