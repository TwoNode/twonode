"use client";

// Mirrors lib/adminTimezone.ts's localStorage pattern — the QR "Dark
// Color"/"Light Color" pickers reset to these hardcoded defaults on every
// generation otherwise, so a facilitator who picked a brand color has to
// re-pick it every time.
const STORAGE_KEY = "twonodes-qr-colors";

export const DEFAULT_QR_COLORS = {
  darkColor: "#3b82f6",
  lightColor: "#ffffff",
};

export function getQrColors(): typeof DEFAULT_QR_COLORS {
  if (typeof window === "undefined") return DEFAULT_QR_COLORS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_QR_COLORS;
    const parsed = JSON.parse(raw);
    return {
      darkColor: typeof parsed.darkColor === "string" ? parsed.darkColor : DEFAULT_QR_COLORS.darkColor,
      lightColor: typeof parsed.lightColor === "string" ? parsed.lightColor : DEFAULT_QR_COLORS.lightColor,
    };
  } catch {
    return DEFAULT_QR_COLORS;
  }
}

export function setQrColors(colors: { darkColor: string; lightColor: string }): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
  } catch {
    // Ignore — preference just won't persist across reloads on this device.
  }
}
