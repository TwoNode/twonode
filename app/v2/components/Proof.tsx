const PROOF = [
  {
    label: "Workshops & events",
    detail:
      "Sessions with surveying agencies and the surveyors who use Surfboard day to day.",
  },
  {
    label: "Institutional engagement",
    detail:
      "Ongoing conversations with the ministries and regulators downstream of every plan Surfboard stores.",
  },
  {
    label: "GBC",
    detail:
      "A recurring conference bringing the geospatial industry's builders into one room, not just onto one platform.",
  },
];

/** Evidence as a plain list, not a logo wall or awards grid — "show what we've done rather than telling people we're excellent." */
export function Proof() {
  return (
    <section className="border-b border-[#e6e4f0] dark:border-[#29273c]">
      <div className="mx-auto max-w-6xl px-6 py-20 sm:px-8 sm:py-28">
        <p className="font-[family-name:var(--font-mono)] text-xs font-semibold uppercase tracking-[0.2em] text-[#767490] dark:text-[#827e9f]">
          Field Traction & Proof
        </p>
        <h2 className="mt-3 font-[family-name:var(--font-sora)] text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#11101e] dark:text-white">
          We&apos;ve been building.
        </h2>

        <div className="mt-12 rounded-3xl border border-[#e6e4f0] dark:border-[#29273c] bg-white dark:bg-[#161524] overflow-hidden shadow-xs divide-y divide-[#e6e4f0] dark:divide-[#29273c]">
          {PROOF.map((p) => (
            <div
              key={p.label}
              className="grid gap-2 p-6 sm:p-8 sm:grid-cols-[260px_1fr] items-baseline transition-colors hover:bg-[#faf9f6]/50 dark:hover:bg-white/5"
            >
              <dt className="font-[family-name:var(--font-sora)] text-lg sm:text-xl font-bold text-[#11101e] dark:text-white">
                {p.label}
              </dt>
              <dd className="font-[family-name:var(--font-sans)] text-sm sm:text-base leading-relaxed text-[#48455e] dark:text-[#b8b5d0]">
                {p.detail}
              </dd>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
