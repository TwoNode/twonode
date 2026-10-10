const ANSWERS = [
  "Sometimes the answer is software.",
  "Sometimes it's a better workflow.",
  "Sometimes it's bringing the right people into the same room.",
  "Sometimes it's all three.",
];

export function BiggerIdea() {
  return (
    <section className="border-b border-[#e6e4f0] dark:border-[#29273c]">
      <div className="mx-auto max-w-6xl px-6 py-20 sm:px-8 sm:py-28">
        <div className="rounded-3xl border border-[#e6e4f0] dark:border-[#29273c] bg-white dark:bg-[#161524] p-8 sm:p-14 shadow-xs grid gap-10 md:grid-cols-[1fr_1.3fr] items-center">
          <div>
            <p className="font-[family-name:var(--font-mono)] text-xs font-semibold uppercase tracking-[0.2em] text-[#767490] dark:text-[#827e9f]">
              The Bigger Idea
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-sora)] text-3xl sm:text-4xl font-extrabold tracking-tight text-[#11101e] dark:text-white leading-[1.12]">
              The product is only part of the work.
            </h2>
          </div>

          <div>
            <div className="space-y-2 font-[family-name:var(--font-sans)] text-lg sm:text-xl font-medium text-[#48455e] dark:text-[#b8b5d0]">
              <p>{ANSWERS[0]}</p>
              <p>{ANSWERS[1]}</p>
              <p>{ANSWERS[2]}</p>
              <p className="font-[family-name:var(--font-sora)] font-extrabold text-2xl text-[#ff4d6d]">
                {ANSWERS[3]}
              </p>
            </div>
            <p className="mt-6 max-w-xl font-[family-name:var(--font-sans)] text-sm sm:text-base leading-relaxed text-[#767490] dark:text-[#827e9f]">
              This is why Surfboard, GBC and REVA can sit alongside each other
              without TwoNode looking unfocused. The common thread isn&apos;t a
              product category — it&apos;s building whatever an industry needs to
              work better.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
