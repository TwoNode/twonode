"use client"
import type { ReactNode } from "react";
import { PlatformNetworkGraphic } from "./PlatformNetworkGraphic";

export type AuthSplitLayoutProps = {
  accent: string;
  accentDark: string;
  eyebrow: string;
  headline: string;
  description: string;
  /** Rendered above the form card on the left panel — e.g. an admin-only notice. */
  notice?: ReactNode;
  /** Rendered below the form card on the left panel. */
  footerNote?: string;
  /** "mda" swaps the network graphic to a single TwoNode↔MDA node, hiding the other products. */
  networkVariant?: "default" | "mda";
  children: ReactNode;
};

export function AuthSplitLayout({
  accent,
  accentDark,
  eyebrow,
  headline,
  description,
  notice,
  footerNote,
  networkVariant = "default",
  children,
}: AuthSplitLayoutProps) {
  return (
    <div className="min-h-screen flex">
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 bg-white dark:bg-background">
        {notice && <div className="w-full max-w-md mb-4">{notice}</div>}
        {children}
        {footerNote && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">{footerNote}</p>
        )}
      </div>

      {/* LASG tricolor accent — MDA is a Lagos State government portal, so
          this reads top-to-bottom as red/gold/green rather than a generic
          brand stripe. Sits on the seam between the two panels, MDA pages
          only, at the same breakpoint the right panel itself appears. */}
      {networkVariant === "mda" && (
        <div className="hidden lg:flex w-2 shrink-0 flex-col">
          <div className="flex-1" style={{ background: "#CE1126" }} />
          <div className="flex-1" style={{ background: "#FCD116" }} />
          <div className="flex-1" style={{ background: "#007A33" }} />
        </div>
      )}

      <div
        className="relative hidden lg:flex flex-1 overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${accentDark}, ${accent})` }}
      >
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        <div
          className="absolute -top-24 -right-16 w-96 h-96 rounded-full blur-3xl animate-blob"
          style={{ background: "white", opacity: 0.18 }}
        />
        <div
          className="absolute top-1/3 -left-24 w-80 h-80 rounded-full blur-3xl animate-blob animation-delay-2000"
          style={{ background: "white", opacity: 0.14 }}
        />
        <div
          className="absolute -bottom-24 right-1/4 w-72 h-72 rounded-full blur-3xl animate-blob animation-delay-4000"
          style={{ background: "white", opacity: 0.12 }}
        />

        {/* Network graphic and headline text used to be two independently
            positioned full-height overlays (graphic centered, text
            bottom-anchored) — on any viewport short enough (laptop screens,
            or a user zoomed to 125%+), the centered graphic's lower nodes
            collided with the text card. Stacking them in one flex column
            instead gives each its own region, so they can't overlap
            regardless of panel height. */}
        <div className="relative z-10 flex h-full w-full flex-col">
          <div className="flex-1 min-h-0 flex items-center justify-center p-6 pb-2 xl:p-16 xl:pb-4">
            <PlatformNetworkGraphic variant={networkVariant} />
          </div>

          <div className="w-full p-6 pt-0 xl:p-16 xl:pt-0 shrink-0">
            <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-5 xl:p-8 max-w-md">
              <p className="text-xs font-semibold tracking-widest uppercase text-white/70 mb-2 xl:mb-3">
                {eyebrow}
              </p>
              <h2 className="text-2xl xl:text-4xl font-extrabold text-white leading-tight mb-2 xl:mb-4 text-balance">
                {headline}
              </h2>
              <p className="text-white/80 text-sm xl:text-base leading-relaxed">
                {description}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
