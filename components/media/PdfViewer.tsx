"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Loader2 } from "lucide-react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist/types/src/pdf";
import { pdfPageScale } from "./viewerMath";

const SIDE_PADDING = 24;

type Props = {
  /** A signed URL (or any public URL) the browser can read directly. */
  url: string;
  /** 1 fits the page to the width; more zooms in. */
  zoom: number;
  onError: (message: string) => void;
};

/**
 * Draws a PDF page by page with PDF.js, so it looks the same on phones (where
 * a PDF in an iframe often only offers a download) and on desktops. Pages are
 * drawn as they scroll into view, which keeps large survey sheets light.
 */
export default function PdfViewer({ url, zoom, onError }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const onErrorRef = useRef(onError);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width)
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let task: { destroy: () => Promise<void> } | null = null;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
          import.meta.url
        ).toString();
        const loading = pdfjs.getDocument({ url, isEvalSupported: false });
        task = loading;
        const loaded = await loading.promise;
        if (cancelled) {
          void loaded.destroy();
          return;
        }
        setDoc(loaded);
      } catch {
        if (!cancelled) onErrorRef.current("This PDF could not be shown here.");
      }
    })();
    return () => {
      cancelled = true;
      void task?.destroy();
    };
  }, [url]);

  const cssWidth = Math.max(160, (width - SIDE_PADDING) * zoom);

  return (
    <div
      ref={scrollerRef}
      className="h-full w-full overflow-auto bg-neutral-800 py-3 [touch-action:pan-x_pan-y_pinch-zoom]"
    >
      {!doc ? (
        <div className="flex h-full items-center justify-center text-white/70">
          <Loader2 className="h-6 w-6 animate-spin" aria-label="Loading" />
        </div>
      ) : (
        Array.from({ length: doc.numPages }, (_, i) => (
          <PdfPage
            key={i + 1}
            doc={doc}
            pageNumber={i + 1}
            cssWidth={cssWidth}
            rootRef={scrollerRef}
          />
        ))
      )}
    </div>
  );
}

function PdfPage({
  doc,
  pageNumber,
  cssWidth,
  rootRef,
}: {
  doc: PDFDocumentProxy;
  pageNumber: number;
  cssWidth: number;
  rootRef: RefObject<HTMLDivElement | null>;
}) {
  const holderRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(pageNumber <= 2);
  const [aspect, setAspect] = useState(1.414);

  useEffect(() => {
    const el = holderRef.current;
    if (!el || visible) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { root: rootRef.current, rootMargin: "800px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible, rootRef]);

  useEffect(() => {
    if (!visible || cssWidth <= 0) return;
    let cancelled = false;
    let render: RenderTask | null = null;
    (async () => {
      const page = await doc.getPage(pageNumber);
      if (cancelled) return;
      const base = page.getViewport({ scale: 1 });
      const { canvasScale } = pdfPageScale({
        pageWidth: base.width,
        pageHeight: base.height,
        cssWidth,
        devicePixelRatio: window.devicePixelRatio,
      });
      const viewport = page.getViewport({ scale: canvasScale });
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      if (!canvas || !context) return;
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      setAspect(base.height / base.width);
      render = page.render({ canvasContext: context, viewport });
      await render.promise;
    })().catch(() => {
      /* a render cancelled by a zoom change or by closing throws; ignore */
    });
    return () => {
      cancelled = true;
      render?.cancel();
    };
  }, [visible, doc, pageNumber, cssWidth]);

  const height = cssWidth * aspect;
  return (
    <div
      ref={holderRef}
      className="mx-auto mb-3 bg-white shadow-lg"
      style={{ width: cssWidth, height }}
    >
      <canvas
        ref={canvasRef}
        className="block"
        style={{ width: cssWidth, height }}
        aria-label={`Page ${pageNumber}`}
      />
    </div>
  );
}
