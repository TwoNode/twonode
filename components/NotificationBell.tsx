"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Bell } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { playNotificationSound } from "@/lib/notificationSound";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { surfboardApi } from "@/surfboard/apiClient";
import { revaApi } from "@/reva/apiClient";
import { gbcApi } from "@/gbc/apiClient";

type Platform = "surfboard" | "reva" | "gbc";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  link?: string | null;
  createdAt: string | Date;
  isRead: boolean;
}

interface NotificationApi {
  list: (params?: { limit?: number }) => Promise<{ success: boolean; data?: NotificationItem[] }>;
  unreadCount: () => Promise<{ success: boolean; data?: { count: number } }>;
  markRead: (id: string) => Promise<{ success: boolean }>;
}

const API_BY_PLATFORM: Record<Platform, NotificationApi> = {
  surfboard: surfboardApi.notifications,
  reva: revaApi.notifications as unknown as NotificationApi,
  gbc: gbcApi.notifications as unknown as NotificationApi,
};

interface NotificationBellProps {
  platform: Platform;
  /** Full notifications page — the dropdown's footer link, and every item's
   * fallback destination when it has no link of its own. */
  viewAllHref: string;
  className?: string;
  iconClassName?: string;
}

/**
 * Shared dropdown notification bell for all three products. Previously each
 * product either had no bell at all (Surfboard admin, GBC) or a bare
 * badge-and-link with no preview (REVA, Surfboard user) — this replaces both
 * with one dropdown: recent items, an inline "Mark all read", and a
 * "View all notifications" link to the platform's full notifications page.
 * "Mark all read" loops individual markRead calls rather than a bulk
 * endpoint — REVA and Surfboard's existing notification APIs don't have one,
 * and the dropdown only ever shows a handful of items at a time anyway.
 */
export default function NotificationBell({ platform, viewAllHref, className = "", iconClassName = "" }: NotificationBellProps) {
  const api = API_BY_PLATFORM[platform];
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const lastSeenAtRef = useRef<number>(0);
  const isFirstPollRef = useRef(true);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const result = await api.unreadCount();
      if (result.success && result.data) setUnreadCount(result.data.count);
    } catch {
      // Non-fatal — the badge just stays at its last known value.
    }
  }, [api]);

  // Toast pop-ups for genuinely new notifications, independent of whether
  // the dropdown is open — the badge alone is easy to miss. The first poll
  // only records the current latest timestamp rather than toasting it, so
  // opening the app doesn't dump every historical notification as a toast.
  const pollForNewNotifications = useCallback(async () => {
    try {
      const result = await api.list({ limit: 5 });
      if (!result.success || !result.data?.length) return;
      const sorted = [...result.data].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      if (isFirstPollRef.current) {
        isFirstPollRef.current = false;
        lastSeenAtRef.current = new Date(sorted[0].createdAt).getTime();
        return;
      }

      const fresh = sorted.filter((n) => new Date(n.createdAt).getTime() > lastSeenAtRef.current);
      if (fresh.length) playNotificationSound();
      fresh
        .slice()
        .reverse()
        .forEach((n) => {
          toast(n.title, {
            description: n.message,
            action: n.link ? { label: "View", onClick: () => (window.location.href = n.link!) } : undefined,
          });
        });

      if (fresh.length) lastSeenAtRef.current = new Date(sorted[0].createdAt).getTime();
    } catch {
      // Non-fatal — a missed poll just means fewer toasts, the bell badge still works.
    }
  }, [api]);

  useEffect(() => {
    refreshUnreadCount();
    pollForNewNotifications();
    const interval = setInterval(() => {
      refreshUnreadCount();
      pollForNewNotifications();
    }, 60000);
    return () => clearInterval(interval);
  }, [refreshUnreadCount, pollForNewNotifications]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    api
      .list({ limit: 8 })
      .then((result) => {
        if (!cancelled && result.success && result.data) setItems(result.data.slice(0, 8));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, api]);

  const handleMarkAllRead = async () => {
    const unread = items.filter((n) => !n.isRead);
    if (!unread.length) return;
    setMarking(true);
    try {
      await Promise.all(unread.map((n) => api.markRead(n.id)));
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } finally {
      setMarking(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Notifications"
          className={`relative rounded-lg p-2 transition-colors hover:bg-black/5 dark:hover:bg-white/10 ${className}`}
        >
          <Bell className={iconClassName || "h-5 w-5"} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Notifications</span>
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={marking || !items.some((n) => !n.isRead)}
            className="text-xs font-medium text-violet-600 hover:underline disabled:opacity-40 disabled:hover:no-underline dark:text-violet-400"
          >
            Mark all read
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-10 text-center text-sm text-slate-400">Loading…</div>
          ) : items.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-slate-400">No notifications</div>
          ) : (
            items.map((n) => (
              <Link
                key={n.id}
                href={n.link || viewAllHref}
                onClick={() => setOpen(false)}
                className={`block border-b border-slate-50 px-4 py-3 last:border-0 hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/50 ${
                  n.isRead ? "" : "bg-violet-50/60 dark:bg-violet-500/5"
                }`}
              >
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{n.title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{n.message}</p>
                <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                </p>
              </Link>
            ))
          )}
        </div>

        <div className="border-t border-slate-100 p-2 dark:border-slate-800">
          <Link
            href={viewAllHref}
            onClick={() => setOpen(false)}
            className="block rounded-full py-2 text-center text-sm font-medium text-violet-600 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-500/10"
          >
            View all notifications
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
