const BELIEFS = [
  {
    title: "Understand deeply",
    body: "We start with the way work actually happens.",
  },
  {
    title: "Build simply",
    body: "Complex problems should result in simple experiences.",
  },
  {
    title: "Connect the pieces",
    body: "Value often exists between disconnected players, systems and information.",
  },
];

export function WhatWeBelieve() {
  return (
    <section className="border-t" style={{ borderColor: "var(--v2-border)" }}>
      <div className="mx-auto max-w-6xl px-6 py-24 sm:px-8">
        <p className="text-sm uppercase tracking-[0.2em] opacity-60">
          What we believe
        </p>
        <h2 className="mt-3 max-w-2xl font-[family-name:var(--font-display)] text-3xl font-medium sm:text-4xl">
          Industries work better when their information does.
        </h2>
        <div className="mt-14 grid gap-12 sm:grid-cols-3">
          {BELIEFS.map((b, i) => (
            <div key={b.title}>
              <span className="text-sm opacity-40">0{i + 1}</span>
              <h3 className="mt-2 font-[family-name:var(--font-display)] text-xl font-medium">
                {b.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed opacity-75">
                {b.body}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-16 text-xs uppercase tracking-[0.3em] opacity-40">
          Integrity holds all three together — it's what makes any of it
          trustworthy.
        </p>
      </div>
    </section>
  );
}
