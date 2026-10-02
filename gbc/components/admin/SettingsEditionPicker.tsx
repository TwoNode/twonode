"use client";

import { Loader2 } from "lucide-react";
import { useSearchParamsUpdater } from "@/hooks/useSearchParamsUpdater";
import type { GBCEdition } from "@/gbc/utils/settings";

/**
 * Chooses which edition's settings the Settings page is editing (`?edition=`),
 * and says plainly what that means: whether the public site is showing this
 * edition, and whether anything has been saved for it yet.
 */
export function SettingsEditionPicker({
  editions,
  edition,
  publicEdition,
  saved,
}: {
  editions: GBCEdition[];
  /** The edition being edited, null when no edition exists yet. */
  edition: string | null;
  /** The edition the public site currently shows. */
  publicEdition: string | null;
  /** False while this edition has no saved settings and is showing defaults. */
  saved: boolean;
}) {
  const { update, isPending } = useSearchParamsUpdater();

  if (!edition) {
    return (
      <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        There is no edition yet. Create one on the Editions page, then come back
        to set its details.
      </div>
    );
  }

  const publicName =
    editions.find((e) => e.key === publicEdition)?.name ?? publicEdition;

  return (
    <div
      className="mb-6 rounded-lg border border-gray-200 bg-white p-4"
      aria-busy={isPending}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <label
            htmlFor="settings-edition"
            className="block text-sm font-medium text-gray-700"
          >
            Editing settings for
          </label>
          <p className="text-xs text-gray-500">
            Each edition keeps its own event details, ticket prices and
            capacity.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isPending && (
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          )}
          <select
            id="settings-edition"
            value={edition}
            onChange={(e) => update({ edition: e.target.value })}
            className="rounded-lg border bg-white px-4 py-2 text-sm"
          >
            {editions.map((e) => (
              <option key={e.key} value={e.key}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {edition === publicEdition ? (
          <span className="rounded-full bg-green-100 px-2.5 py-1 font-medium text-green-800">
            Shown on the public site
          </span>
        ) : (
          <span className="rounded-full bg-gray-100 px-2.5 py-1 font-medium text-gray-700">
            Not shown on the public site — it uses {publicName}
          </span>
        )}
        {!saved && (
          <span className="rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-900">
            Nothing saved yet — showing defaults. Saving any section creates
            this edition&apos;s settings.
          </span>
        )}
      </div>
    </div>
  );
}
