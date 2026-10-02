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
    <section className="border-t" style={{ borderColor: "var(--v2-border)" }}>
      <div className="mx-auto max-w-6xl px-6 py-24 sm:px-8">
        <h2 className="font-[family-name:var(--font-display)] text-3xl font-medium sm:text-4xl">
          We&apos;ve been building.
        </h2>
        <dl
          className="mt-12 divide-y"
          style={{ borderColor: "var(--v2-border)" }}
        >
          {PROOF.map((p) => (
            <div
              key={p.label}
              className="grid gap-2 border-t py-6 sm:grid-cols-[220px_1fr]"
              style={{ borderColor: "var(--v2-border)" }}
            >
              <dt className="font-medium">{p.label}</dt>
              <dd className="text-sm opacity-75">{p.detail}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
