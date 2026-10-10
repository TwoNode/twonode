const BELIEFS = [
  {
    num: "01",
    title: "Understand deeply",
    body: "We start with the way work actually happens.",
  },
  {
    num: "02",
    title: "Build simply",
    body: "Complex problems should result in simple experiences.",
  },
  {
    num: "03",
    title: "Connect the pieces",
    body: "Value often exists between disconnected players, systems and information.",
  },
];

export function WhatWeBelieve() {
  return (
    <section className="border-b border-[#e6e4f0] dark:border-[#29273c]">
      <div className="mx-auto max-w-6xl px-6 py-20 sm:px-8 sm:py-28">
        <p className="font-[family-name:var(--font-mono)] text-xs font-semibold uppercase tracking-[0.2em] text-[#767490] dark:text-[#827e9f]">
          What we believe
        </p>
        <h2 className="mt-3 max-w-2xl font-[family-name:var(--font-sora)] text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#11101e] dark:text-white">
          Industries work better when their information does.
        </h2>

        <div className="mt-14 grid gap-6 sm:grid-cols-3">
          {BELIEFS.map((b) => (
            <div
              key={b.title}
              className="rounded-3xl border border-[#e6e4f0] dark:border-[#29273c] bg-white dark:bg-[#161524] p-8 shadow-xs transition-transform duration-200 hover:-translate-y-1"
            >
              <span className="font-[family-name:var(--font-mono)] text-sm font-bold text-[#ff4d6d]">
                {b.num}
              </span>
              <h3 className="mt-4 font-[family-name:var(--font-sora)] text-xl font-bold tracking-tight text-[#11101e] dark:text-white">
                {b.title}
              </h3>
              <p className="mt-3 font-[family-name:var(--font-sans)] text-sm sm:text-base leading-relaxed text-[#48455e] dark:text-[#b8b5d0]">
                {b.body}
              </p>
            </div>
          ))}
        </div>

        {/* Integrity holding all three together */}
        <div className="mt-12 rounded-full border border-dashed border-[#d4d0e6] dark:border-[#3c3957] bg-white/60 dark:bg-white/5 py-3.5 px-6 text-center font-[family-name:var(--font-mono)] text-xs font-bold uppercase tracking-[0.16em] text-[#767490] dark:text-[#a8a4c4]">
          Integrity holds all three together — it&apos;s what makes any of it
          trustworthy.
        </div>
      </div>
    </section>
  );
}
