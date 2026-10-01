"use client";

import { Plus } from "lucide-react";

// ---------------------------------------------------------------------------
// Coordinate system: 0-100 percentage-based square viewBox.
// Node centers match the SVG viewBox so that SVG lines terminate exactly
// at the visual center of every logo circle/pill.
//
// Node size as a % of container width:
//   Hub      → 13%   (rounded-2xl square)
//   Satellite → 9%   (rounded-full circle)
//   GBC pill  → 18%  (wide pill — wordmark only)
//   Open slot → 9%   (dashed circle)
//
// The SVG lines are now clipped so they appear to terminate at the *edge*
// of each logo badge rather than running through its center — calculated
// as: shorten each endpoint by half that node's visual radius (in % units).
// ---------------------------------------------------------------------------

const HUB = { x: 50, y: 44 };
// Half-widths in viewBox % units (used to shorten line endpoints)
const HUB_R = 6.5;   // half of 13%
const NODE_R = 4.5;  // half of 9%
const GBC_R  = 9;    // half of 18%

const NODES = [
  { x: 76, y: 22,   kind: "surfboard" as const, r: NODE_R },
  { x: 84, y: 58.5, kind: "reva"      as const, r: NODE_R },
  { x: 36.5, y: 80.5, kind: "gbc"    as const, r: GBC_R  },
  { x: 16,  y: 39,  kind: "open"     as const, r: NODE_R },
];

/** Shorten a line segment so endpoints sit on node badge edges, not centers. */
function clippedLine(
  x1: number, y1: number, r1: number,
  x2: number, y2: number, r2: number,
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0) return { x1, y1, x2, y2 };
  const ux = dx / dist;
  const uy = dy / dist;
  return {
    x1: x1 + ux * r1,
    y1: y1 + uy * r1,
    x2: x2 - ux * r2,
    y2: y2 - uy * r2,
  };
}

// MDA variant ----------------------------------------------------------------
const MDA_MDA      = { x: 41, y: 20, r: NODE_R };
const MDA_SURFBOARD = { x: 59, y: 56, r: NODE_R };

export function PlatformNetworkGraphic({
  className = "",
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "mda";
}) {
  if (variant === "mda") {
    const line = clippedLine(
      MDA_MDA.x, MDA_MDA.y, MDA_MDA.r,
      MDA_SURFBOARD.x, MDA_SURFBOARD.y, MDA_SURFBOARD.r,
    );
    return (
      <div className={`relative w-full aspect-square max-w-full mx-auto ${className}`}>
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <defs>
            <linearGradient id="mda-line-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.5" />
            </linearGradient>
          </defs>
          <line
            x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2}
            stroke="url(#mda-line-grad)" strokeWidth="0.8" strokeLinecap="round"
          />
        </svg>

        <div
          className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white p-2.5 shadow-lg"
          style={{ left: `${MDA_MDA.x}%`, top: `${MDA_MDA.y}%`, width: "9%", aspectRatio: "1" }}
        >
          <img src="/OSSG_Logo.png" alt="MDA" className="h-full w-full object-contain" />
        </div>

        <div
          className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white p-2.5 shadow-lg"
          style={{ left: `${MDA_SURFBOARD.x}%`, top: `${MDA_SURFBOARD.y}%`, width: "9%", aspectRatio: "1" }}
        >
          <img src="/surfboard/surf_logo.svg" alt="Surfboard" className="h-full w-full object-contain" />
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Default variant — full 4-platform network
  // ---------------------------------------------------------------------------

  // Outer ring: connect nodes clockwise so the ring follows the spatial layout
  // Surfboard(0) → REVA(1) → GBC(2) → Open(3) → Surfboard(0)
  const ringPairs: [number, number][] = [[0, 1], [1, 2], [2, 3], [3, 0]];

  return (
    <div className={`relative w-full aspect-square max-w-full mx-auto ${className}`}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          {/* Gradient for hub→node spokes */}
          <linearGradient id="spoke-grad" x1="0%" y1="0%" x2="100%" y2="0%" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.55" />
          </linearGradient>
          {/* Subtle ring gradient */}
          <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.15" />
          </linearGradient>
        </defs>

        {/* Outer satellite-to-satellite ring */}
        <g strokeLinecap="round">
          {ringPairs.map(([a, b]) => {
            const na = NODES[a];
            const nb = NODES[b];
            const seg = clippedLine(na.x, na.y, na.r, nb.x, nb.y, nb.r);
            return (
              <line
                key={`ring-${a}-${b}`}
                x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2}
                stroke="#ffffff" strokeOpacity="0.25" strokeWidth="0.45"
                strokeDasharray="1.5 1.8"
              />
            );
          })}
        </g>

        {/* Hub → satellite spokes */}
        <g strokeLinecap="round">
          {NODES.map((n) => {
            const seg = clippedLine(HUB.x, HUB.y, HUB_R, n.x, n.y, n.r);
            return (
              <line
                key={`spoke-${n.kind}`}
                x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2}
                stroke="#ffffff" strokeOpacity="0.75" strokeWidth="0.65"
              />
            );
          })}
        </g>

        {/* Pulse circles on spokes — animate-ping on small dots at midpoint */}
        {NODES.map((n) => {
          const midX = (HUB.x + n.x) / 2;
          const midY = (HUB.y + n.y) / 2;
          return (
            <circle
              key={`pulse-${n.kind}`}
              cx={midX} cy={midY} r="0.8"
              fill="#ffffff" fillOpacity="0.6"
            />
          );
        })}
      </svg>

      {/* Hub — TwoNode */}
      <div
        className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl bg-white p-3 shadow-xl z-10"
        style={{ left: `${HUB.x}%`, top: `${HUB.y}%`, width: "13%", aspectRatio: "1" }}
      >
        <img src="/logo.png" alt="TwoNode Technologies" className="h-full w-full object-contain" />
      </div>

      {/* Satellite nodes */}
      {NODES.map((n) =>
        n.kind === "open" ? (
          <div
            key={n.kind}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-dashed border-white/40 z-10"
            style={{ left: `${n.x}%`, top: `${n.y}%`, width: "9%", aspectRatio: "1" }}
            title="More platforms coming soon"
          >
            <Plus className="h-1/3 w-1/3 text-white/40" />
          </div>
        ) : n.kind === "gbc" ? (
          // GBC badge — square footprint (matches GBC_R's line-clipping
          // assumption of an 18%x18% box); the wide wordmark letterboxes
          // inside via object-contain rather than stretching the box.
          <div
            key={n.kind}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl bg-white p-3 shadow-lg z-10"
            style={{ left: `${n.x}%`, top: `${n.y}%`, width: "18%", aspectRatio: "1" }}
          >
            <img src="/gbc2/gbc2DarkLogo.png" alt="GBC" className="h-full w-full object-contain" />
          </div>
        ) : (
          <div
            key={n.kind}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white p-2.5 shadow-lg z-10"
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
