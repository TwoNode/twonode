"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { surfboardApi } from "@/surfboard/apiClient";

/**
 * Blocking modal for an admin-authored "important announcement" notification
 * (showAsModal=true, active between its startsAt/endsAt window) — fetched
 * once per app-shell mount from surfboardUserPanelLayout.tsx. Built on
 * components/ui/dialog.tsx (Radix + portal) rather than a hand-rolled
 * fixed-overlay modal, so it always renders above page content regardless of
 * any ancestor's own stacking context.
 *
 * Per-login behaviour: the server no longer uses dismissedBy as a gate, so
 * an active campaign surfaces on every new login. sessionStorage is used as
 * the within-session "already shown" marker — closing the modal in one tab
 * keeps it closed for that tab/session, but a fresh login (new sessionStorage
 * scope) will show it again. dismissedBy is still written for analytics.
 */

const SESSION_KEY_PREFIX = "surf_announcement_seen_";

export function AnnouncementModal() {
  const [announcement, setAnnouncement] = useState<{
    id: string;
    title: string;
    message: string;
    link: string | null;
  } | null>(null);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    surfboardApi.notifications.activeAnnouncement().then((res) => {
      if (!res.success || !res.data) return;

      const id = res.data.id;
      const sessionKey = `${SESSION_KEY_PREFIX}${id}`;

      // Already shown and dismissed within this session — don't re-pop.
      // sessionStorage is cleared automatically when the tab is closed or
      // the user logs out (which either navigates away or clears storage),
      // so a fresh login always gets a clean slate.
      if (sessionStorage.getItem(sessionKey)) return;

      setAnnouncement(res.data);
    });
  }, []);

  if (!announcement) return null;

  const handleDismiss = async () => {
    setDismissing(true);
    // Mark in sessionStorage so we don't re-pop within this session.
    sessionStorage.setItem(`${SESSION_KEY_PREFIX}${announcement.id}`, "1");
    try {
      // Still fire the server dismiss for audit/analytics — it no longer
      // gates the modal from reappearing on the next login.
      await surfboardApi.notifications.dismiss(announcement.id);
    } finally {
      setAnnouncement(null);
      setDismissing(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && handleDismiss()}>
      {/* Wide, not the dialog system's narrow max-w-md default — an
          important-enough-to-block announcement (app-store launch, event
          promo, etc.) reads as cramped at form-dialog width; this gives it
          room while still leaving breathing margin on large screens. */}
      <DialogContent className="max-w-lg sm:max-w-2xl lg:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-xl">{announcement.title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm sm:text-base leading-relaxed text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
          {announcement.message}
        </p>
        <DialogFooter className="gap-2 sm:gap-0">
          {announcement.link && (
            <Button variant="outline" asChild>
              <a href={announcement.link} target="_blank" rel="noopener noreferrer">
                Learn more
              </a>
            </Button>
          )}
          <Button onClick={handleDismiss} disabled={dismissing}>
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
