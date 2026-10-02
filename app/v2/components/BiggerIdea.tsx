const ANSWERS = [
  "Sometimes the answer is software.",
  "Sometimes it's a better workflow.",
  "Sometimes it's bringing the right people into the same room.",
  "Sometimes it's all three.",
];

export function BiggerIdea() {
  return (
    <section className="border-t" style={{ borderColor: "var(--v2-border)" }}>
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-24 sm:px-8 md:grid-cols-[1fr_1.3fr]">
        <h2 className="font-[family-name:var(--font-display)] text-3xl font-medium sm:text-4xl">
          The product is only part of the work.
        </h2>
        <div>
          <div className="space-y-1 text-lg opacity-80">
            {ANSWERS.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
          <p className="mt-6 max-w-xl text-sm leading-relaxed opacity-70">
            This is why Surfboard, GBC and REVA can sit alongside each other
            without TwoNode looking unfocused. The common thread isn&apos;t a
            product category — it&apos;s building whatever an industry needs to
            work better.
          </p>
        </div>
      </div>
    </section>
  );
}
