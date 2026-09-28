export function Opening() {
  return (
    <section className="mx-auto max-w-6xl px-6 pt-20 pb-24 sm:px-8 sm:pt-28 sm:pb-32">
      <p className="text-sm uppercase tracking-[0.2em] opacity-60">TwoNode</p>
      <h1 className="mt-6 max-w-4xl font-[family-name:var(--font-display)] text-4xl font-medium leading-[1.1] tracking-tight text-balance sm:text-6xl">
        We build for industries.
        <br />
        <span className="italic" style={{ color: "var(--v2-accent)" }}>
          We connect
        </span>{" "}
        every player in the ecosystem.
      </h1>
      <div className="mt-12 grid gap-1 text-lg opacity-80 sm:text-xl">
        <p>Every industry has its own way of working.</p>
        <p>Its own people. Its own information.</p>
        <p>Its own problems. Its own opportunities.</p>
      </div>
      <p className="mt-8 max-w-md text-lg">
        We spend time understanding those things.
        <br />
        <span className="font-medium">Then we build.</span>
      </p>
    </section>
  );
}
