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
        <p className="font-[family-name:var(--font-mono)] text-xs font-semibold uppercase tracking-[0.2em] text-[#767490] dark:text-[#827e9f]">
          Start with an industry
        </p>
        <h2 className="mt-3 font-[family-name:var(--font-sora)] text-3xl font-extrabold tracking-tight text-[#11101e] dark:text-white sm:text-4xl lg:text-5xl">
          The industries we&apos;re building in.
        </h2>

        <div className="mt-14 grid gap-8 md:grid-cols-2">
          {industries.map((industry) => {
            const isActive = industry.status === "active";
            return (
              <div
                key={industry.slug}
                className="group relative flex flex-col justify-between rounded-3xl border border-[#e6e4f0] dark:border-[#29273c] bg-white dark:bg-[#161524] p-8 sm:p-10 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div>
                  {/* Status Beacon Badge */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold tracking-wider uppercase font-[family-name:var(--font-mono)] ${
                        isActive
                          ? "bg-[#0fb5a6]/10 text-[#0fb5a6]"
                          : "bg-[#ff4d6d]/10 text-[#ff4d6d]"
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          isActive ? "bg-[#0fb5a6]" : "bg-[#ff4d6d]"
                        }`}
                        style={{ animation: "ndp 2s infinite" }}
                      />
                      {isActive ? "Active Ecosystem" : "Next Frontier"}
                    </span>
                    <span className="font-[family-name:var(--font-mono)] text-xs text-[#767490] dark:text-[#827e9f]">
                      {industry.products.length}{" "}
                      {industry.products.length === 1 ? "Product" : "Products"}
                    </span>
                  </div>

                  {/* Industry Title & Positioning */}
                  <h3 className="mt-6 font-[family-name:var(--font-sora)] text-2xl sm:text-3xl font-bold tracking-tight text-[#11101e] dark:text-white">
                    {industry.name}
                  </h3>
                  <p className="mt-1 font-[family-name:var(--font-display)] text-lg italic text-[#767490] dark:text-[#a8a4c4]">
                    {industry.positioning}
                  </p>

                  <p className="mt-4 font-[family-name:var(--font-sans)] text-sm sm:text-base leading-relaxed text-[#48455e] dark:text-[#b8b5d0]">
                    {industry.context}
                  </p>

                  {/* Products inside this industry */}
                  <div className="mt-8 space-y-3">
                    {industry.products.map((p) => (
                      <div
                        key={p.name}
                        className="rounded-2xl border border-[#e6e4f0] dark:border-[#29273c] bg-[#faf9f6] dark:bg-[#0f0e18] p-4 transition-colors hover:border-[#d4d0e6]"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${
                              p.name === "Surfboard"
                                ? "bg-blue-600"
                                : p.name === "GBC"
                                ? "bg-purple-600"
                                : "bg-emerald-600"
                            }`}
                          />
                          <h4 className="font-[family-name:var(--font-sora)] text-base font-bold text-[#11101e] dark:text-white">
                            {p.name}
                          </h4>
                          <span className="ml-auto text-xs font-semibold text-[#767490] dark:text-[#827e9f]">
                            {p.tagline}
                          </span>
                        </div>
                        <p className="mt-2 text-xs leading-relaxed text-[#48455e] dark:text-[#b8b5d0]">
                          {p.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-[#e6e4f0] dark:border-[#29273c] flex items-center justify-between">
                  <Link
                    href={`/v2/industries/${industry.slug}`}
                    className="inline-flex items-center gap-1.5 font-[family-name:var(--font-sora)] text-sm font-bold text-[#11101e] dark:text-white transition-colors group-hover:text-[#ff4d6d]"
                  >
                    Explore {industry.name} →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
