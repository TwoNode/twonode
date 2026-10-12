"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { MediaViewer } from "./MediaViewer";
import type { MediaItem } from "./mediaTypes";

type MediaViewerApi = {
  /** Show these files in the viewer, starting at `index`. */
  open: (items: MediaItem[], index?: number) => void;
};

const MediaViewerContext = createContext<MediaViewerApi | null>(null);

/** Null when no provider is mounted (`MediaLink` then keeps its own viewer). */
export function useMediaViewer(): MediaViewerApi | null {
  return useContext(MediaViewerContext);
}

/**
 * Mounted once near the top of each app, so the viewer outlives whatever opened
 * it: a dropdown menu or a dialog that closes when its item is chosen would
 * otherwise take the viewer down with it.
 */
export function MediaViewerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    items: MediaItem[];
    index: number;
    open: boolean;
  }>({ items: [], index: 0, open: false });

  const open = useCallback((items: MediaItem[], index = 0) => {
    if (items.length === 0) return;
    setState({
      items,
      index: Math.min(Math.max(index, 0), items.length - 1),
      open: true,
    });
  }, []);
  const api = useMemo(() => ({ open }), [open]);
  const onOpenChange = useCallback(
    (next: boolean) => setState((s) => ({ ...s, open: next })),
    []
  );
  const onIndexChange = useCallback(
    (index: number) => setState((s) => ({ ...s, index })),
    []
  );

  return (
    <MediaViewerContext.Provider value={api}>
      {children}
      <MediaViewer
        items={state.items}
        index={state.index}
        open={state.open}
        onIndexChange={onIndexChange}
        onOpenChange={onOpenChange}
      />
    </MediaViewerContext.Provider>
  );
}
