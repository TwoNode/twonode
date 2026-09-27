"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RotateCcw, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { gbcApi } from "@/gbc/apiClient";

/**
 * Reset/rollback for the edition currently being edited on the Settings
 * page — the API side (settingsService.resetToDefaults/rollback) has
 * existed since the per-edition settings model landed, but nothing in the
 * UI ever called it. Each section's own form already has an in-page "undo"
 * via re-editing, but neither covers "put every section back to how it
 * was" — this does, at the whole-page level.
 */
export function SettingsResetRollback({
  edition,
  saved,
  hasPrevious,
}: {
  edition: string | null;
  /** False when this edition has never had settings saved — nothing to reset or roll back. */
  saved: boolean;
  /** Whether a prior version of this edition's settings exists to roll back to. */
  hasPrevious: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"reset" | "rollback" | null>(null);

  if (!edition || !saved) return null;

  async function handleReset() {
    setBusy("reset");
    const res = await gbcApi.settings.reset(edition!);
    setBusy(null);
    if (res.success) {
      toast.success("Settings reset to defaults");
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  async function handleRollback() {
    setBusy("rollback");
    const res = await gbcApi.settings.rollback(edition!);
    setBusy(null);
    if (res.success) {
      toast.success("Settings rolled back to the previous version");
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <div className="mb-6 flex flex-wrap items-center justify-end gap-2">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="sm" variant="outline" disabled={!hasPrevious || busy !== null}>
            <History className="h-4 w-4 mr-1.5" />
            Rollback to previous
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Roll back to the previous settings?</AlertDialogTitle>
            <AlertDialogDescription>
              This replaces every section&apos;s current values with whatever this edition had before its
              last save. The current values are kept as the new "previous" version, so this itself can be
              undone by rolling back again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRollback}>
              {busy === "rollback" ? "Rolling back..." : "Roll back"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="sm" variant="outline" disabled={busy !== null} className="text-red-600 border-red-200 hover:bg-red-50">
            <RotateCcw className="h-4 w-4 mr-1.5" />
            Reset to defaults
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset all settings to their defaults?</AlertDialogTitle>
            <AlertDialogDescription>
              This replaces every section on this page — event details, ticket pricing, gallery, social
              links, notifications, and system settings — with their default values. The current values
              are saved first, so this can be undone with "Rollback to previous".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset} className="bg-red-600 hover:bg-red-700">
              {busy === "reset" ? "Resetting..." : "Reset to defaults"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
