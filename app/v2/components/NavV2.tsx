import Link from "next/link";

/**
 * Deliberately simple per the PRB ("keep navigation extremely simple") —
 * products are discoverable through Industries, not listed here by name.
 */
const LINKS = [
  { href: "/v2/#industries", label: "Industries" },
  { href: "/v2/#how-we-build", label: "What We Build" },
  { href: "/v2/our-story", label: "Our Story" },
  { href: "/v2/insights", label: "Insights" },
];

export function NavV2() {
  return (
    <header
      className="sticky top-0 z-40 border-b backdrop-blur"
      style={{
        borderColor: "var(--v2-border)",
        background: "color-mix(in oklab, var(--v2-bg) 88%, transparent)",
      }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 sm:px-8">
        <Link
          href="/v2"
          className="font-[family-name:var(--font-display)] text-lg font-medium tracking-tight"
        >
          TwoNode
        </Link>
        <nav className="hidden items-center gap-8 text-sm md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="opacity-70 transition-opacity hover:opacity-100"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/v2/contact"
          className="rounded-full border px-4 py-1.5 text-sm transition-colors hover:opacity-80"
          style={{ borderColor: "var(--v2-border)" }}
        >
          Contact
        </Link>
      </div>
    </header>
  );
}
