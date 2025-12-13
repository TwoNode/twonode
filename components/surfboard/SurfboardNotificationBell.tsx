"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import Link from "next/link";
import { getUnreadNotificationCount } from "@/app/(projects)/(surfboard)/actions/notificationActions";

interface SurfboardNotificationBellProps {
  href: string;
  size?: number;
  color?: string;
  className?: string;
}

export default function SurfboardNotificationBell({
  href,
  size = 24,
  color = "#fff",
  className = "",
}: SurfboardNotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUnreadCount();

    // Refresh unread count every 3 minutes
    const interval = setInterval(fetchUnreadCount, 180000);

    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const result = await getUnreadNotificationCount();
      if (result.success && result.data) {
        setUnreadCount(result.data.count);
      }
    } catch (error) {
      console.error("Error fetching unread notification count:", error);
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
