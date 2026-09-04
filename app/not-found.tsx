import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Page Not Found | TwoNode Technologies",
};

const productLinks = [
  { name: "Surfboard", href: "/surfboard", blurb: "Survey plan lodging & approvals" },
  { name: "REVA", href: "/reva", blurb: "Property valuation requests" },
  { name: "GBC", href: "/gbc", blurb: "Grid & boundary charting" },
];

// Same key/logic as hooks/useTheme.tsx — inlined rather than imported since
// that module is a "use client" boundary and this is a Server Component.
const THEME_INIT_SCRIPT = `
(function(){
  try {
    var t = localStorage.getItem("twonodes-theme");
    if (t !== "light" && t !== "dark") {
      t = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    if (t === "dark") document.documentElement.classList.add("dark");
  } catch (e) {}
})();
`;

export default function GlobalNotFound() {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased dark:bg-gray-950 dark:text-white">
        <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-16">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 dark:opacity-40"
            style={{
              background:
                "radial-gradient(60% 50% at 50% 0%, rgba(8,47,73,0.08) 0%, transparent 70%)",
            }}
          />

          <Link href="/" className="relative mb-10 flex items-center gap-2">
            <img
              src="/logo.svg"
              alt="TwoNode Technologies"
              className="h-8 w-auto dark:brightness-0 dark:invert"
            />
          </Link>

          <div className="relative flex flex-col items-center text-center">
            <span
              className="select-none text-[7rem] font-extrabold leading-none tracking-tight sm:text-[9rem]"
              style={{
                backgroundImage: "linear-gradient(135deg, #082f49 0%, #0369a1 55%, #0ea5e9 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              404
            </span>
            <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
              This coordinate doesn&apos;t exist on our map.
            </h1>
            <p className="mt-3 max-w-md text-base text-slate-500 dark:text-gray-400">
              The page you&apos;re looking for has moved, been renamed, or never
              existed. Let&apos;s get you back on track.
            </p>

            <Link
              href="/"
              className="mt-8 inline-flex items-center justify-center rounded-lg bg-sky-950 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-900 dark:bg-sky-600 dark:hover:bg-sky-500"
            >
              Back to Home
            </Link>

            <div className="mt-14 w-full max-w-2xl border-t border-slate-200 dark:border-white/10 pt-8">
              <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-gray-500">
                Or jump to a platform
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {productLinks.map((p) => (
                  <Link
                    key={p.href}
                    href={p.href}
                    className="group rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-left shadow-sm transition hover:border-sky-300 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:hover:border-sky-800"
                  >
                    <div className="text-sm font-semibold text-slate-900 group-hover:text-sky-700 dark:text-white dark:group-hover:text-sky-400">
                      {p.name}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500 dark:text-gray-400">{p.blurb}</div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
