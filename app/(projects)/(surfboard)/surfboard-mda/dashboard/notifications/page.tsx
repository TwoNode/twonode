"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { surfboardApi } from "@/surfboard/apiClient";
import { Button } from "@/components/ui/button";
import { Bell, Check, X, Loader2 } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

type NotificationType =
  "INFO" | "SUCCESS" | "WARNING" | "ERROR" | "SYSTEM" | "PLAN" | "SHARING";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  createdAt: string;
  isRead: boolean;
  isDismissed: boolean;
}

const typeColors: Record<NotificationType, string> = {
  INFO: "border-l-blue-500",
  SUCCESS: "border-l-green-500",
  WARNING: "border-l-yellow-500",
  ERROR: "border-l-red-500",
  SYSTEM: "border-l-indigo-500",
  PLAN: "border-l-purple-500",
  SHARING: "border-l-pink-500",
};

/**
 * MDA's own notifications page — the admin one
 * (surfboard-restricted/dashboard/notifications) has a full create/delete
 * composer that's ADMIN/SUPERADMIN-only at the route level anyway, and MDA
 * roles live under a separate route tree that can't reach it. This is the
 * read-only counterpart: list, mark read, dismiss — same underlying API
 * (GET/POST .../read and .../dismiss are open to any authenticated
 * Surfboard role; only DELETE is admin-gated, so it's not offered here).
 */
export default function SurfboardMdaNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const result = await surfboardApi.notifications.list({
        includeDismissed: false,
      });
      if (result.success)
        setNotifications(result.data as unknown as Notification[]);
    } catch {
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleMarkRead = async (id: string) => {
    setBusyId(id);
    try {
      const result = await surfboardApi.notifications.markRead(id);
      if (result.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleDismiss = async (id: string) => {
    setBusyId(id);
    try {
      const result = await surfboardApi.notifications.dismiss(id);
      if (result.success) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-6">
        <Bell className="h-7 w-7 text-violet-600 shrink-0" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Notifications
        </h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No notifications</div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-3 rounded-lg border-l-4 bg-white p-4 shadow-sm dark:bg-slate-900 ${typeColors[n.type]} ${
                n.isRead ? "opacity-70" : ""
              }`}
            >
              <div className="min-w-0 flex-1">
                {n.link ? (
                  <Link
                    href={n.link}
                    className="font-semibold text-gray-900 hover:underline dark:text-gray-100"
                  >
                    {n.title}
                  </Link>
                ) : (
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {n.title}
                  </p>
                )}
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {n.message}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  {format(new Date(n.createdAt), "MMM d, yyyy · h:mm a")}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                {!n.isRead && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={busyId === n.id}
                    onClick={() => handleMarkRead(n.id)}
                    title="Mark as read"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={busyId === n.id}
                  onClick={() => handleDismiss(n.id)}
                  title="Dismiss"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
