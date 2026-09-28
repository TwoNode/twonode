const STEPS = [
  "We don't build technology and then look for somewhere to put it.",
  "We go where the work is.",
  "We learn how an industry works.",
  "We understand the people inside it.",
  "We identify where information, processes and relationships break down.",
  "Then we build around those gaps.",
];

/** Rendered as a flowing statement, not a numbered process diagram — the PRB explicitly warns against that framing. */
export function HowWeBuild() {
  return (
    <section id="how-we-build" className="border-t" style={{ borderColor: "var(--v2-border)" }}>
      <div className="mx-auto max-w-3xl px-6 py-24 sm:px-8">
        <p className="font-[family-name:var(--font-display)] text-2xl leading-relaxed sm:text-3xl">
          {STEPS.map((line, i) => (
            <span key={line}>
              <span className={i === 0 ? "font-medium" : "opacity-80"}>{line}</span>
              {i < STEPS.length - 1 ? " " : ""}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}
