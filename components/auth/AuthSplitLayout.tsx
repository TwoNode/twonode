"use client"
import type { ReactNode } from "react";

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

        {/* Network/Node Logo Background Image */}
        <div className="absolute inset-0 flex items-center justify-center opacity-20">
          <img
            src="/twonode-network.svg"
            alt="Twonode Network"
            className="w-3/4 h-3/4 object-contain"
            onError={(e) => {
              // Fallback if image doesn't exist
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>

        <div className="relative z-10 flex flex-col justify-end w-full p-12 xl:p-16">
          <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-8 max-w-md">
            <p className="text-xs font-semibold tracking-widest uppercase text-white/70 mb-3">
              {eyebrow}
            </p>
            <h2 className="text-3xl xl:text-4xl font-extrabold text-white leading-tight mb-4 text-balance">
              {headline}
            </h2>
            <p className="text-white/80 text-base leading-relaxed">
              {description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
