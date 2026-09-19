"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Client half of a searchParams-driven server page: merges updates into the
 * query string and navigates, which re-runs the server component with fresh
 * data. An empty-string value deletes its key so URLs stay clean.
 *
 * Updates are built from a ref rather than the `searchParams` of the render
 * that created the callback: a navigation stays pending until the server
 * responds, and a second update fired in that window (pick a filter, then
 * type in the search box) must build on the first instead of overwriting it
 * with the stale committed URL.
 */
export function useSearchParamsUpdater() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const paramsRef = useRef(searchParams.toString());

  useEffect(() => {
    // While a navigation is in flight the ref is ahead of the committed URL.
    if (!isPending) paramsRef.current = searchParams.toString();
  }, [searchParams, isPending]);

  const update = useCallback(
    (updates: Record<string, string>, mode: "push" | "replace" = "push") => {
      const params = new URLSearchParams(paramsRef.current);
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      const query = params.toString();
      paramsRef.current = query;
      startTransition(() => router[mode](query ? `${pathname}?${query}` : pathname));
    },
    [router, pathname]
  );

  return { update, isPending, searchParams };
}

/**
 * A search box's state, mirrored into `?search=` after the user pauses typing.
 * Resets `page` so a new query never lands on a page that no longer exists,
 * and uses `replace` so each keystroke pause doesn't add a history entry.
 *
 * Takes the caller's updater instead of creating its own: the filter bar's
 * selects and its search box must share one params ref, or each would build
 * on a URL that doesn't include the other's still-pending change.
 */
export function useDebouncedSearchParam(
  { update, searchParams }: ReturnType<typeof useSearchParamsUpdater>,
  delayMs = 350
) {
  const urlValue = searchParams.get("search") ?? "";
  const [value, setValue] = useState(urlValue);

  useEffect(() => {
    if (value === urlValue) return;
    const timer = setTimeout(() => update({ search: value, page: "" }, "replace"), delayMs);
    return () => clearTimeout(timer);
    // `urlValue` changes on every navigation; re-arming the timer on it would
    // fire a redundant replace for a value already in the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, delayMs, update]);

  return { value, setValue };
}
