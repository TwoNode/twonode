"use client";

import { useEffect, useState } from "react";
import { gbcApi } from "@/gbc/apiClient";
import { revaApi } from "@/reva/apiClient";
import { surfboardApi } from "@/surfboard/apiClient";

type Platform = "surfboard" | "reva" | "gbc";

interface SessionUser {
  firstName: string;
  lastName: string;
  picture?: string | null;
}

const SESSION_API_BY_PLATFORM: Record<Platform, { get: () => Promise<{ success: boolean; data?: SessionUser }> }> = {
  surfboard: surfboardApi.session,
  reva: revaApi.session,
  gbc: gbcApi.session,
};

function initials(user: SessionUser): string {
  const a = user.firstName?.[0] ?? "";
  const b = user.lastName?.[0] ?? "";
  return (a + b).toUpperCase() || "?";
}

interface UserAvatarProps {
  platform: Platform;
  size?: number;
  className?: string;
}

/** Session-fetching avatar for headers that otherwise show no user identity
 * at all (GBC admin's desktop/mobile bars) — an image when the session has
 * one (Kinde-derived accounts usually do), initials on a colored circle
 * otherwise (every native-login account, since that flow never collects
 * one). */
export default function UserAvatar({ platform, size = 32, className = "" }: UserAvatarProps) {
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    SESSION_API_BY_PLATFORM[platform]
      .get()
      .then((result) => {
        if (!cancelled && result.success && result.data) setUser(result.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [platform]);

  if (!user) return null;

  const style = { width: size, height: size };

  if (user.picture) {
    return (
      <img
        src={user.picture}
        alt={`${user.firstName} ${user.lastName}`.trim() || "Account"}
        className={`rounded-full object-cover ${className}`}
        style={style}
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700 dark:bg-violet-500/20 dark:text-violet-300 ${className}`}
      style={style}
      title={`${user.firstName} ${user.lastName}`.trim()}
    >
      {initials(user)}
    </div>
  );
}
