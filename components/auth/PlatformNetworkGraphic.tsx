"use client";

import { Plus } from "lucide-react";

// Node centers as percentages of the square container — carried over from
// the old twonode-network.svg's 400x400 viewBox (hub ~200,176; satellites
// at 304,88 / 336,234 / 146,322 / 64,156) so the layout reads the same,
// just with real logos instead of blank squares.
const HUB = { x: 50, y: 45 };
const NODES = [
  { x: 76, y: 22, kind: "surfboard" as const },
  { x: 84, y: 58.5, kind: "reva" as const },
  { x: 36.5, y: 80.5, kind: "gbc" as const },
  { x: 16, y: 39, kind: "open" as const }, // deliberately empty — room for what's next
];

// MDA-facing pages only surface a single MDA↔Surfboard connection, stacked
// vertically (MDA on top, since that's the audience signing in) and larger
// than the default graphic's hub — the other consumer-facing product logos
// (TwoNode, REVA, GBC) aren't relevant to an internal government-agency
// audience using the Surfboard MDA workspace specifically.
// Offset in x (not stacked at the same x) so the connecting line reads as a
// real diagonal instead of a dead-straight vertical drop.
const MDA_MDA = { x: 41, y: 20 };
const MDA_SURFBOARD = { x: 59, y: 56 };
// Matches the default variant's satellite node size (NODE_SIZE below) —
// MDA no longer gets a bespoke larger scale than the other login pages.
const MDA_MDA_SIZE = "9%";
const MDA_SURFBOARD_SIZE = "9%";

/**
 * Replaces the old static twonode-network.svg (blank white squares, no
 * actual branding) with TwoNode's logo at the hub and each live product's
 * logo at its node, plus one open slot left unfilled to signal the network
 * is still growing.
 *
 * `variant="mda"` swaps that node set for a single TwoNode↔MDA connection,
 * used on the MDA portal's auth pages.
 */
export function PlatformNetworkGraphic({
  className = "",
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "mda";
}) {
  if (variant === "mda") {
    return (
      <div className={`relative aspect-square h-full max-w-full mx-auto ${className}`}>
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <g stroke="#FFFFFF" strokeOpacity="0.8" strokeWidth="0.7" strokeLinecap="round">
            <line x1={MDA_MDA.x} y1={MDA_MDA.y} x2={MDA_SURFBOARD.x} y2={MDA_SURFBOARD.y} />
          </g>
        </svg>

        <div
          className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white p-2.5 shadow-lg"
          style={{ left: `${MDA_MDA.x}%`, top: `${MDA_MDA.y}%`, width: MDA_MDA_SIZE, aspectRatio: "1" }}
        >
          <img src="/OSSG_Logo.png" alt="MDA" className="h-full w-full object-contain" />
        </div>

        <div
          className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white p-2.5 shadow-lg"
          style={{ left: `${MDA_SURFBOARD.x}%`, top: `${MDA_SURFBOARD.y}%`, width: MDA_SURFBOARD_SIZE, aspectRatio: "1" }}
        >
          <img src="/surfboard/surf_logo.svg" alt="Surfboard" className="h-full w-full object-contain" />
        </div>
      </div>
    );
  }

  const nodes = NODES;

  return (
    // Sized by height (not width) so it shrinks to fit its flex-1 column on
    // short viewports — e.g. a laptop screen or a user at 125%+ browser
    // zoom, where the column's available height drops below what a
    // width-driven aspect-square box would need, pushing the headline card
    // below it off-screen.
    <div className={`relative aspect-square h-full max-w-full mx-auto ${className}`}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <g stroke="#FFFFFF" strokeOpacity="0.25" strokeWidth="0.4" strokeLinecap="round">
          <line x1={NODES[0].x} y1={NODES[0].y} x2={NODES[1].x} y2={NODES[1].y} />
          <line x1={NODES[1].x} y1={NODES[1].y} x2={NODES[2].x} y2={NODES[2].y} />
          <line x1={NODES[2].x} y1={NODES[2].y} x2={NODES[3].x} y2={NODES[3].y} />
          <line x1={NODES[3].x} y1={NODES[3].y} x2={NODES[0].x} y2={NODES[0].y} />
        </g>
        {/* Primary hub connections */}
        <g stroke="#FFFFFF" strokeOpacity="0.8" strokeWidth="0.7" strokeLinecap="round">
          {nodes.map((n) => (
            <line key={n.kind} x1={HUB.x} y1={HUB.y} x2={n.x} y2={n.y} />
          ))}
        </g>
      </svg>

      {/* Hub — TwoNode */}
      <div
        className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl bg-white p-3 shadow-lg"
        style={{ left: `${HUB.x}%`, top: `${HUB.y}%`, width: "13%", aspectRatio: "1" }}
      >
        <img src="/logo.png" alt="TwoNode Technologies" className="h-full w-full object-contain" />
      </div>

      {nodes.map((n) =>
        n.kind === "open" ? (
          <div
            key={n.kind}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-dashed border-white/40"
            style={{ left: `${n.x}%`, top: `${n.y}%`, width: "9%", aspectRatio: "1" }}
            title="More platforms coming soon"
          >
            <Plus className="h-1/3 w-1/3 text-white/40" />
          </div>
        ) : n.kind === "gbc" ? (
          // GBC's only lockup is a wide 4:1 wordmark with no compact icon
          // variant, so it gets a pill badge instead of a circle — a circle
          // this small shrinks it past legibility.
          <div
            key={n.kind}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl bg-white px-3 py-2 shadow-lg"
            style={{ left: `${n.x}%`, top: `${n.y}%`, width: "18%" }}
          >
            <img src="/gbc2/gbc2DarkLogo.png" alt="GBC" className="h-full w-full object-contain" />
          </div>
        ) : (
          <div
            key={n.kind}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white p-2.5 shadow-lg"
            style={{ left: `${n.x}%`, top: `${n.y}%`, width: "9%", aspectRatio: "1" }}
          >
            {n.kind === "surfboard" && (
              <img src="/surfboard/surf_logo.svg" alt="Surfboard" className="h-full w-full object-contain" />
            )}
            {n.kind === "reva" && (
              <img src="/reva/revaLogo.png" alt="REVA" className="h-full w-full object-contain" />
            )}
          </div>
        )
      )}
    </div>
  );
}
