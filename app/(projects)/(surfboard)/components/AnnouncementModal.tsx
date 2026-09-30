"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { surfboardApi } from "@/surfboard/apiClient";

/**
 * Blocking modal for an admin-authored "important announcement" notification
 * (showAsModal=true, active between its startsAt/endsAt window) — fetched
 * once per app-shell mount from surfboardUserPanelLayout.tsx. Built on
 * components/ui/dialog.tsx (Radix + portal) rather than a hand-rolled
 * fixed-overlay modal, so it always renders above page content regardless of
 * any ancestor's own stacking context.
 */
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
      if (res.success && res.data) setAnnouncement(res.data);
    });
  }, []);

  if (!announcement) return null;

  const handleDismiss = async () => {
    setDismissing(true);
    try {
      await surfboardApi.notifications.dismiss(announcement.id);
    } finally {
      setAnnouncement(null);
      setDismissing(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && handleDismiss()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{announcement.title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
          {announcement.message}
        </p>
        <DialogFooter className="gap-2 sm:gap-0">
          {announcement.link && (
            <Button variant="outline" asChild>
              <a href={announcement.link}>Learn more</a>
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
