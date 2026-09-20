"use client";

import { useEffect, useState } from "react";
import { gbcApi } from "@/gbc/apiClient";
import type { GBCRole } from "@/utils/platform";

/**
 * The signed-in admin's role, or null until the session has loaded (or if it
 * can't be read). Used to hide nav entries the role can't open — the proxy
 * enforces access; this only keeps dead links out of the UI.
 */
export function useGBCRole(): GBCRole | null {
  const [role, setRole] = useState<GBCRole | null>(null);

  useEffect(() => {
    let cancelled = false;
    gbcApi.session
      .get()
      .then((result) => {
        if (!cancelled && result.success && result.data?.role) setRole(result.data.role as GBCRole);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return role;
}
