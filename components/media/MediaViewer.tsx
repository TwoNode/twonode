"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileQuestion,
  Loader2,
  Maximize2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  downloadHrefFor,
  fileNameOf,
  mediaKindFor,
  type MediaItem,
} from "./mediaTypes";
import { stepZoom, wrapIndex } from "./viewerMath";
import { useResolvedUrl } from "./useResolvedUrl";

const PdfViewer = dynamic(() => import("./PdfViewer"), {
  ssr: false,
  loading: () => <Spinner />,
});

type Props = {
  items: MediaItem[];
  index: number;
  open: boolean;
  onIndexChange: (index: number) => void;
  onOpenChange: (open: boolean) => void;
};

/**
 * The one place files are shown. Opens over the current page (no new tab),
 * closes with Escape, the X, or the Back button, and steps through a group
 * with the arrows.
 */
export function MediaViewer({
  items,
  index,
  open,
  onIndexChange,
  onOpenChange,
}: Props) {
  // Back closes the viewer instead of leaving the page. The entry we push keeps
  // Next.js's own history state so its router is not confused by it.
  useEffect(() => {
    if (!open) return;
    window.history.pushState({ ...window.history.state, mediaViewer: true }, "");
    const onPop = () => onOpenChange(false);
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      if (window.history.state?.mediaViewer) window.history.back();
    };
  }, [open, onOpenChange]);

  const count = items.length;
  const current = items[wrapIndex(index, count)];
  const go = useCallback(
    (step: 1 | -1) => onIndexChange(wrapIndex(index + step, count)),
    [index, count, onIndexChange]
  );

  if (!open || !current) return null;

  const name = current.name || fileNameOf(current.href);
  const kind = current.kind || mediaKindFor(current.href, name);

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        onKeyDown={(e) => {
          if (count < 2) return;
          if (e.key === "ArrowRight") go(1);
          if (e.key === "ArrowLeft") go(-1);
        }}
        className="fixed inset-0 left-0 top-0 z-[60] flex h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 bg-neutral-950 p-0 text-white data-[state=closed]:slide-out-to-left-0 data-[state=closed]:slide-out-to-top-0 data-[state=open]:slide-in-from-left-0 data-[state=open]:slide-in-from-top-0 sm:left-[2vw] sm:top-[2vh] sm:h-[96vh] sm:w-[96vw] sm:rounded-xl sm:border sm:border-white/10"
      >
        <DialogTitle className="sr-only">{name}</DialogTitle>
        <DialogDescription className="sr-only">File viewer</DialogDescription>

        <header className="flex shrink-0 items-center gap-2 border-b border-white/10 px-3 py-2">
          <p className="min-w-0 flex-1 truncate text-sm font-medium" title={name}>
            {name}
          </p>
          {count > 1 && (
            <span className="shrink-0 text-xs text-white/60" aria-live="polite">
              {wrapIndex(index, count) + 1} / {count}
            </span>
          )}
          <a
            href={downloadHrefFor(current.href, name)}
            download={name}
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-md px-3 text-sm text-white/90 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          >
            <Download className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Download</span>
            <span className="sr-only sm:hidden">Download</span>
          </a>
          <DialogClose className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
            <X className="h-5 w-5" aria-hidden />
            <span className="sr-only">Close</span>
          </DialogClose>
        </header>

        <div className="relative min-h-0 flex-1">
          <ViewerBody
            key={current.href}
            href={current.href}
            name={name}
            kind={kind}
          />
          {count > 1 && (
            <>
              <NavButton side="left" label="Previous file" onClick={() => go(-1)} />
              <NavButton side="right" label="Next file" onClick={() => go(1)} />
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ViewerBody({
  href,
  name,
  kind,
}: {
  href: string;
  name: string;
  kind: ReturnType<typeof mediaKindFor>;
}) {
  const { url, error, loading } = useResolvedUrl(href);
  const [zoom, setZoom] = useState(1);
  const [renderError, setRenderError] = useState<string | null>(null);
  const message = error || renderError;
  const zoomable = kind === "image" || kind === "pdf";

  if (kind === "other" || message) {
    return (
      <Notice
        title={name}
        text={
          message ??
          "This type of file cannot be previewed here. Download it to open it."
        }
        href={downloadHrefFor(href, name)}
        name={name}
      />
    );
  }
  if (loading || !url) return <Spinner />;

  return (
    <div className="flex h-full flex-col">
      {zoomable && (
        <div className="flex shrink-0 items-center justify-center gap-1 border-b border-white/10 py-1">
          <ToolButton label="Zoom out" onClick={() => setZoom((z) => stepZoom(z, -1))}>
            <ZoomOut className="h-4 w-4" aria-hidden />
          </ToolButton>
          <span className="w-12 text-center text-xs tabular-nums text-white/70">
            {Math.round(zoom * 100)}%
          </span>
          <ToolButton label="Zoom in" onClick={() => setZoom((z) => stepZoom(z, 1))}>
            <ZoomIn className="h-4 w-4" aria-hidden />
          </ToolButton>
          <ToolButton label="Fit to screen" onClick={() => setZoom(1)}>
            <Maximize2 className="h-4 w-4" aria-hidden />
          </ToolButton>
        </div>
      )}
      <div className="min-h-0 flex-1">
        {kind === "pdf" && (
          <PdfViewer url={url} zoom={zoom} onError={setRenderError} />
        )}
        {kind === "image" && (
          <div className="flex h-full w-full overflow-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={name}
              onError={() => setRenderError("This image could not be shown here.")}
              className="m-auto object-contain"
              style={
                zoom === 1
                  ? { maxWidth: "100%", maxHeight: "100%" }
                  : { width: `${zoom * 100}%`, maxWidth: "none" }
              }
            />
          </div>
        )}
        {kind === "video" && (
          <div className="flex h-full items-center justify-center bg-black">
            <video
              src={url}
              controls
              playsInline
              onError={() => setRenderError("This video could not be played here.")}
              className="max-h-full max-w-full"
            />
          </div>
        )}
        {kind === "audio" && (
          <div className="flex h-full items-center justify-center p-6">
            <audio
              src={url}
              controls
              onError={() => setRenderError("This audio could not be played here.")}
              className="w-full max-w-md"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function Notice({
  title,
  text,
  href,
  name,
}: {
  title: string;
  text: string;
  href: string;
  name: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
      <FileQuestion className="h-10 w-10 text-white/50" aria-hidden />
      <div className="max-w-md space-y-1">
        <p className="break-words text-sm font-medium">{title}</p>
        <p className="text-sm text-white/70">{text}</p>
      </div>
      <a
        href={href}
        download={name}
        className="inline-flex h-11 items-center gap-2 rounded-md bg-white px-4 text-sm font-medium text-neutral-900 hover:bg-white/90"
      >
        <Download className="h-4 w-4" aria-hidden />
        Download
      </a>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex h-full min-h-40 items-center justify-center text-white/70">
      <Loader2 className="h-6 w-6 animate-spin" aria-label="Loading" />
    </div>
  );
}

function ToolButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="inline-flex h-10 w-10 items-center justify-center rounded-md text-white/90 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
    >
      {children}
    </button>
  );
}

function NavButton({
  side,
  label,
  onClick,
}: {
  side: "left" | "right";
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`absolute top-1/2 z-10 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${
        side === "left" ? "left-2" : "right-2"
      }`}
    >
      {side === "left" ? (
        <ChevronLeft className="h-6 w-6" aria-hidden />
      ) : (
        <ChevronRight className="h-6 w-6" aria-hidden />
      )}
    </button>
  );
}
