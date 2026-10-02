"use client";

import { Platform } from "@/utils/platform";

/**
 * Client-side token refresh coordinator.
 *
 * Responsibilities:
 * 1. Single-Flight Deduplication:
 *    Ensures multiple concurrent 401s or simultaneous tab actions do not
 *    trigger duplicate POST /api/v1/auth/refresh requests.
 * 2. Dynamic Interval Rescheduling:
 *    Whenever a refresh occurs (whether triggered by timer, focus/wake, or
 *    a 401 interceptor), the next background timer is shifted to now + 13m,
 *    preventing redundant refreshes.
 * 3. Tab Visibility / Focus Recovery:
 *    When a sleeping laptop or background tab wakes up past the 13m window,
 *    refreshes immediately before user interactions fail.
 */

const INTERVAL_MS = 13 * 60 * 1000; // 13 minutes (2 min before 15m JWT expiry)

class ClientRefreshManager {
  private inFlight = new Map<Platform, Promise<boolean>>();
  private timers = new Map<Platform, ReturnType<typeof setTimeout>>();
  private lastRefreshedAt = new Map<Platform, number>();
  private registeredPlatforms = new Set<Platform>();
  private listenersAttached = false;

  constructor() {
    this.attachLifecycleListeners();
  }

  /**
   * Performs or joins a silent refresh for the given platform.
   * If a refresh is already in-flight for this platform, returns the existing promise.
   */
  public async refresh(platform: Platform): Promise<boolean> {
    const existing = this.inFlight.get(platform);
    if (existing) {
      return existing;
    }

    const refreshPromise = (async () => {
      try {
        const res = await fetch(`/api/v1/auth/refresh?platform=${platform}`, {
          method: "POST",
        });

        const ok = res.ok;
        if (ok) {
          this.lastRefreshedAt.set(platform, Date.now());
          this.scheduleNextRefresh(platform);
        }
        return ok;
      } catch {
        return false;
      } finally {
        this.inFlight.delete(platform);
      }
    })();

    this.inFlight.set(platform, refreshPromise);
    return refreshPromise;
  }

  /**
   * Registers a platform to be kept alive silently by periodic background timers.
   * Called by useNativeAuthRefresh in layout shells.
   */
  public register(platform: Platform): () => void {
    this.registeredPlatforms.add(platform);
    if (!this.lastRefreshedAt.has(platform)) {
      this.lastRefreshedAt.set(platform, Date.now());
    }
    this.scheduleNextRefresh(platform);

    return () => {
      this.registeredPlatforms.delete(platform);
      const timer = this.timers.get(platform);
      if (timer) {
        clearTimeout(timer);
        this.timers.delete(platform);
      }
    };
  }

  /**
   * Reschedules the next periodic background refresh for `now + INTERVAL_MS`.
   */
  private scheduleNextRefresh(platform: Platform) {
    const existingTimer = this.timers.get(platform);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      if (this.registeredPlatforms.has(platform)) {
        this.refresh(platform);
      }
    }, INTERVAL_MS);

    this.timers.set(platform, timer);
  }

  /**
   * Wakes up and checks if any registered platforms are overdue for a refresh
   * (e.g. laptop opened after sleep or tab switched to foreground).
   */
  private checkOverdue() {
    const now = Date.now();
    for (const platform of this.registeredPlatforms) {
      const last = this.lastRefreshedAt.get(platform) || 0;
      if (now - last >= INTERVAL_MS) {
        this.refresh(platform);
      }
    }
  }

  private attachLifecycleListeners() {
    if (typeof window === "undefined" || this.listenersAttached) return;

    window.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        this.checkOverdue();
      }
    });

    window.addEventListener("focus", () => {
      this.checkOverdue();
    });

    this.listenersAttached = true;
  }
}

export const clientRefreshManager = new ClientRefreshManager();
