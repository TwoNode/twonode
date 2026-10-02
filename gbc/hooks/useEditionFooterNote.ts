"use client";

import { useEffect, useState } from "react";
import { gbcApi } from "@/gbc/apiClient";

const GENERIC = "Geospatial Builders Conference";
/** A non-breaking space: holds the footer line's height while the name loads so the card doesn't jump. */
const PLACEHOLDER = " ";

/**
 * The line under GBC's auth cards, naming the current edition from the
 * database (so it stays right when 3.0 replaces 2.0). Falls back to the
 * generic conference name if there is no edition or the request fails.
 */
export function useEditionFooterNote(): string {
  const [note, setNote] = useState(PLACEHOLDER);

  useEffect(() => {
    let cancelled = false;
    gbcApi.editions
      .current()
      .then((res) => {
        if (!cancelled)
          setNote(res.success && res.data?.name ? res.data.name : GENERIC);
      })
      .catch(() => {
        if (!cancelled) setNote(GENERIC);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return note;
}
