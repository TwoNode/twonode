"use client";

import { useEffect, useState } from "react";
import { FileCheck2, FileText, Loader2, X } from "lucide-react";
import { planFileDisplayName } from "@/surfboard/utils/planFileName";

/**
 * A file of a plan SHARED WITH the signed-in surveyor (TASK-0015): the survey plan or the
 * Certificate. The original is never handed over; the pages open here as watermarked pictures
 * (`Draft_{SURCON No}` of the sharing surveyor is part of each picture), with no Download and no
 * link to the file. A web page cannot stop a screenshot (the app can), so the watermark is what
 * travels with any copy.
 *
 * `position` is the file's place in the plan's file list for a recipient: the survey plans first,
 * then the Certificates (the same numbering as `GET plans/{planId}/summary` gives).
 */
type Props = {
  planId: string;
  position: number;
  kind: "pdf" | "cert";
  planNumber?: string | null;
  filePath: string;
  index: number;
};

type State =
  | { phase: "closed" }
  | { phase: "loading" }
  | { phase: "open"; pages: number }
  | { phase: "error"; message: string };

const base = (planId: string, position: number) =>
  `/api/v1/surfboard/plans/${encodeURIComponent(planId)}/files/${position}/pages`;

function problem(status: number): string {
  if (status === 429)
    return "You have opened a lot of pages. Please try again later.";
  if (status === 404)
    return "This file isn't available. It may no longer be shared with you.";
  return "This file couldn't be opened. Please try again.";
}

export function ProtectedFileCard({
  planId,
  position,
  kind,
  planNumber,
  filePath,
  index,
}: Props) {
  const [state, setState] = useState<State>({ phase: "closed" });
  const name = planFileDisplayName({ planNumber, filePath, index });

  async function open() {
    setState({ phase: "loading" });
    try {
      const response = await fetch(base(planId, position), {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!response.ok) {
        setState({ phase: "error", message: problem(response.status) });
        return;
      }
      const body = (await response.json()) as { data?: { pages?: number } };
      const pages = Number(body.data?.pages ?? 0);
      if (!Number.isInteger(pages) || pages < 1) {
        setState({ phase: "error", message: problem(500) });
        return;
      }
      setState({ phase: "open", pages });
    } catch {
      setState({ phase: "error", message: problem(500) });
    }
  }

  // Esc closes the viewer.
  useEffect(() => {
    if (state.phase !== "open") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setState({ phase: "closed" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.phase]);

  return (
    <div className="border rounded-md p-3 relative">
      <div className="flex items-center min-w-0">
        {kind === "cert" ? (
          <FileCheck2 className="h-5 w-5 text-green-500 mr-2" />
        ) : (
          <FileText className="h-5 w-5 text-red-500 mr-2" />
        )}
        <span className="text-sm truncate" title={name}>
          {name}
        </span>
      </div>
      <div className="mt-2">
        <button
          type="button"
          onClick={open}
          disabled={state.phase === "loading"}
          className="text-sm text-blue-600 hover:underline disabled:opacity-60"
        >
          {state.phase === "loading" ? (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Opening
            </span>
          ) : kind === "cert" ? (
            "View Certificate (protected)"
          ) : (
            "View survey plan (protected)"
          )}
        </button>
        {state.phase === "error" && (
          <p className="mt-1 text-xs text-red-600" role="alert">
            {state.message}
          </p>
        )}
      </div>

      {state.phase === "open" && (
        <div
          className="protected-viewer fixed inset-0 z-50 bg-black/85 overflow-y-auto"
          role="dialog"
          aria-label={`${name}, protected view`}
          onContextMenu={(event) => event.preventDefault()}
        >
          {/* Printing the page prints nothing: the pictures are not for printing. */}
          <style>{`@media print { .protected-viewer { display: none !important; } }`}</style>
          <div className="sticky top-0 z-10 flex items-center justify-between bg-black/70 px-4 py-2 text-white">
            <span className="text-sm">{name} · shared with you, view only</span>
            <button
              type="button"
              onClick={() => setState({ phase: "closed" })}
              className="rounded p-1 hover:bg-white/20"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mx-auto max-w-4xl space-y-4 p-4">
            {Array.from({ length: state.pages }, (_, i) => i + 1).map(
              (page) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={page}
                  src={`${base(planId, position)}/${page}`}
                  alt={`${name}, page ${page} of ${state.pages}`}
                  loading={page === 1 ? "eager" : "lazy"}
                  draggable={false}
                  className="w-full select-none bg-white pointer-events-none"
                />
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
