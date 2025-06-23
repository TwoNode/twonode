"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import Link from "next/link";
import { getUnreadNotificationCount } from "@/app/(projects)/reva/actions/dbActions";
import { getAuthenticatedUser } from "@/utils/authUser";

interface NotificationBellProps {
  href: string;
  size?: number;
  color?: string;
  className?: string;
}

export default function NotificationBell({
  href,
  size = 30,
  color = "#fff",
  className = "",
}: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUnreadCount();

    // Refresh unread count every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const user = await getAuthenticatedUser();
      if (user?.id) {
        const result = await getUnreadNotificationCount(user.id);
        if (result.success) {
          setUnreadCount(result.count);
        }
      }
    } catch (error) {
      console.error("Error fetching unread count:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Link href={href} className={`relative ${className}`}>
      <Bell size={size} color={color} />
      {!loading && unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
