"use client";

import { useEffect } from "react";
import { Platform } from "@/utils/platform";

/**
 * Silently keeps a native access token alive via POST /api/v1/auth/refresh.
 * Without this, the 15-minute access token just expires and the user gets
 * bounced back to login regardless of the "Keep me signed in" choice made
 * at login — that choice only sets how long the *refresh* token cookie
 * lives (30 vs 1 day); nothing was ever actually using it. Ported from
 * proplity's hooks/useAuthRefresh.ts (the project this auth system was
 * modeled on), adapted for this app's per-platform cookie scheme
 * (?platform= query param instead of one fixed cookie pair).
 *
 * Unlike proplity, a failed refresh here does NOT force a redirect —
 * twonodes' Kinde and native sessions are independent (a Kinde login also
 * mints a native session, but the reverse isn't required), so a dead
 * native refresh token doesn't mean the user is actually logged out. Just
 * stop retrying for this mount; proxy.ts's own redirect-on-unauthenticated
 * handles the real "you're logged out" case on the next navigation.
 */
export function useNativeAuthRefresh(platform: Platform) {
  useEffect(() => {
    // Fire ~2 minutes before the 15-minute access token expires.
    const INTERVAL_MS = 13 * 60 * 1000;

    const performSilentRefresh = async () => {
      try {
        await fetch(`/api/v1/auth/refresh?platform=${platform}`, { method: "POST" });
      } catch {
        // Network hiccup — let the next interval retry.
      }
    };

    const timer = setInterval(performSilentRefresh, INTERVAL_MS);
    return () => clearInterval(timer);
  }, [platform]);
}
