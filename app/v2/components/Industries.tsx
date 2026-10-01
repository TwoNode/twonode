import Link from "next/link";
import { industries } from "../data/industries";

/**
 * Tailwind v4's scanner needs literal class strings — `text-${accent}`
 * template interpolation would never get generated. This map keeps the
 * accent → class mapping data-driven (industries.ts) while every class that
 * actually reaches the DOM is a literal here.
 */
export const ACCENT_CLASSES: Record<string, string> = {
  "blue-600": "text-blue-600 border-blue-600/20",
  "purple-600": "text-purple-600 border-purple-600/20",
  "green-600": "text-green-600 border-green-600/20",
};

export function Industries() {
  return (
    <section id="industries" className="border-t" style={{ borderColor: "var(--v2-border)" }}>
      <div className="mx-auto max-w-6xl px-6 py-24 sm:px-8">
        <p className="text-sm uppercase tracking-[0.2em] opacity-60">Start with an industry</p>
        <h2 className="mt-3 max-w-2xl font-[family-name:var(--font-display)] text-3xl font-medium sm:text-4xl">
          The industries we&apos;re building in.
        </h2>

        <div className="mt-14 grid gap-10 md:grid-cols-2">
          {industries.map((industry) => (
            <Link
              key={industry.slug}
              href={`/v2/industries/${industry.slug}`}
              className="group flex flex-col rounded-2xl border p-8 transition-colors hover:border-current"
              style={{ borderColor: "var(--v2-border)", background: "var(--v2-surface)" }}
            >
              <span className="text-xs uppercase tracking-widest opacity-50">
                {industry.status === "active" ? "Active" : "Next"}
              </span>
              <h3 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-medium">{industry.name}</h3>
              <p className="mt-1 text-sm italic opacity-70">{industry.positioning}</p>
              <p className="mt-5 text-sm leading-relaxed opacity-80">
                {industry.context.slice(0, 180)}…
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {industry.products.map((p) => (
                  <span
                    key={p.name}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${ACCENT_CLASSES[p.accent] ?? ""}`}
                  >
                    {p.name}
                  </span>
                ))}
              </div>
              <span className="mt-8 text-sm font-medium opacity-70 transition-opacity group-hover:opacity-100">
                Explore {industry.name} →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
