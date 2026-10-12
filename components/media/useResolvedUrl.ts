"use client";

import { useEffect, useState } from "react";
import { isGatewayLink, jsonHrefFor } from "./mediaTypes";

type Fetched = { href: string; url: string | null; error: string | null };

/**
 * Turns a gateway link into the signed URL it redirects to, so a video can
 * seek and PDF.js can read it. Any other link is used as it is.
 */
export function useResolvedUrl(href: string): {
  url: string | null;
  error: string | null;
  loading: boolean;
} {
  const direct = !isGatewayLink(href);
  const [fetched, setFetched] = useState<Fetched | null>(null);

  useEffect(() => {
    if (direct) return;
    const controller = new AbortController();
    fetch(jsonHrefFor(href), {
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok || !body?.success || !body.url) {
          throw new Error(
            res.status === 401 || res.status === 403
              ? "You do not have access to this file."
              : body?.error || "Could not load this file."
          );
        }
        setFetched({ href, url: body.url as string, error: null });
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setFetched({
          href,
          url: null,
          error: err instanceof Error ? err.message : "Could not load this file.",
        });
      });
    return () => controller.abort();
  }, [href, direct]);

  if (direct) return { url: href, error: null, loading: false };
  const current = fetched?.href === href ? fetched : null;
  return {
    url: current?.url ?? null,
    error: current?.error ?? null,
    loading: !current,
  };
}
