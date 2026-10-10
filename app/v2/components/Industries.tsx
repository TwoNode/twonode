import Link from "next/link";
import { industries } from "../data/industries";

export const ACCENT_CLASSES: Record<string, string> = {
  "blue-600": "text-blue-600 border-blue-600/20",
  "purple-600": "text-purple-600 border-purple-600/20",
  "green-600": "text-green-600 border-green-600/20",
};

export function Industries() {
  return (
    <section
      id="industries"
      className="border-b border-[#e6e4f0] dark:border-[#29273c]"
    >
      <div className="mx-auto max-w-6xl px-6 py-20 sm:px-8 sm:py-28">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[#767490] dark:text-[#827e9f]">
          Start with an industry
        </p>
        <h2 className="mt-3 font-(family-name:--font-sora) text-3xl font-extrabold tracking-tight text-[#11101e] dark:text-white sm:text-4xl lg:text-5xl">
          The industries we&apos;re building in.
        </h2>

        <div className="mt-14 grid gap-8 md:grid-cols-2">
          {industries.map((industry) => {
            const isActive = industry.status === "active";
            return (
              <Link
                key={industry.slug}
                href={`/v2/industries/${industry.slug}`}
                className="group relative flex flex-col justify-between rounded-3xl border border-[#e6e4f0] dark:border-[#29273c] bg-white dark:bg-[#161524] p-8 sm:p-10 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-[#ff4d6d]/40"
              >
                <div>
                  {/* Clean Editorial Metadata Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-[#e6e4f0]/60 dark:border-[#29273c]/60">
                    <span className="font-mono text-[11px] font-semibold tracking-[0.2em] uppercase text-[#767490] dark:text-[#827e9f]">
                      {isActive ? "Active" : "Next"}
                    </span>
                    <span className="font-mono text-[11px] tracking-wider text-[#767490] dark:text-[#827e9f]">
                      {industry.products.length}{" "}
                      {industry.products.length === 1 ? "Product" : "Products"}
                    </span>
                  </div>

                  {/* Industry Title & Positioning */}
                  <h3 className="mt-6 font-(family-name:--font-sora) text-2xl sm:text-3xl font-bold tracking-tight text-[#11101e] dark:text-white transition-colors group-hover:text-[#ff4d6d]">
                    {industry.name}
                  </h3>
                  <p className="mt-1 font-sans text-base text-[#767490] dark:text-[#a8a4c4]">
                    {industry.positioning}
                  </p>

                  <p className="mt-4 font-sans text-sm sm:text-base leading-relaxed text-[#48455e] dark:text-[#b8b5d0]">
                    {industry.context}
                  </p>

                  {/* Clean Product Badges with Authentic Brand Logos */}
                  <div className="mt-6 flex flex-wrap gap-2.5">
                    {industry.products.map((p) => (
                      <span
                        key={p.name}
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold font-(family-name:--font-sora) ${
                          ACCENT_CLASSES[p.accent] ||
                          "text-[#767490] border-[#e6e4f0]"
                        }`}
                      >
                        <img
                          src={p.logo}
                          alt={p.name}
                          className="h-3.5 w-auto max-w-7 object-contain"
                        />
                        {p.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-[#e6e4f0] dark:border-[#29273c] flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 font-(family-name:--font-sora) text-sm font-bold text-[#11101e] dark:text-white transition-colors group-hover:text-[#ff4d6d]">
                    Explore {industry.name} →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
