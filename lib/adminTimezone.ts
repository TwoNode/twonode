"use client";

// Mirrors hooks/useTheme.tsx's localStorage pattern — synchronously readable
// on any page without waiting on a profile fetch, and durable across
// reloads. The server-side copy (SurfboardUser.metadata.preferences.timezone)
// is the source of truth restored into this on login from a new device; see
// surfboard-restricted/dashboard/settings/page.tsx's fetchProfile.
const STORAGE_KEY = "twonodes-admin-timezone";
export const DEFAULT_ADMIN_TIMEZONE = "Africa/Lagos";

export function getAdminTimezone(): string {
  if (typeof window === "undefined") return DEFAULT_ADMIN_TIMEZONE;
  try {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_ADMIN_TIMEZONE;
  } catch {
    return DEFAULT_ADMIN_TIMEZONE;
  }
}

export function setAdminTimezone(timezone: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, timezone);
  } catch {
    // Ignore — preference just won't persist across reloads on this device.
  }
}

/** Formats a date in the admin's saved timezone preference (falls back to DEFAULT_ADMIN_TIMEZONE). */
export function formatInAdminTimezone(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  }
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  try {
    return new Intl.DateTimeFormat("en-US", {
      ...options,
      timeZone: getAdminTimezone(),
    }).format(d);
  } catch {
    // Invalid/unsupported IANA timezone string — fall back to local time rather than throwing.
    return new Intl.DateTimeFormat("en-US", options).format(d);
  }
}
