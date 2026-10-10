const STEPS = [
  "We don't build technology and then look for somewhere to put it.",
  "We go where the work is.",
  "We learn how an industry works.",
  "We understand the people inside it.",
  "We identify where information, processes and relationships break down.",
  "Then we build around those gaps.",
];

/**
 * Rendered as a flowing statement, not a numbered process diagram —
 * the PRB explicitly warns against that framing.
 * Includes a kinetic glowing beam underneath symbolizing the traversal.
 */
export function HowWeBuild() {
  return (
    <section
      id="how-we-build"
      className="border-b border-[#e6e4f0] dark:border-[#29273c] bg-white dark:bg-[#161524]"
    >
      <div className="mx-auto max-w-4xl px-6 py-20 sm:px-8 sm:py-28">
        <p className="font-(family-name:--font-sora) text-2xl sm:text-3xl lg:text-4xl leading-relaxed tracking-tight text-[#48455e] dark:text-[#b8b5d0]">
          <span className="font-extrabold text-[#11101e] dark:text-white">
            {STEPS[0]}{" "}
          </span>
          <span>{STEPS[1]} </span>
          <span>{STEPS[2]} </span>
          <span>{STEPS[3]} </span>
          <span>{STEPS[4]} </span>
          <span className="font-extrabold text-[#ff4d6d]">
            {STEPS[5]}
          </span>
        </p>

        {/* Kinetic Flowing Beam with moving gradient packet */}
        <div className="mt-12 h-1 w-full rounded-full bg-[#e6e4f0] dark:bg-[#29273c] relative overflow-hidden">
          <div
            className="absolute top-0 bottom-0 w-1/3 bg-linear-to-r from-transparent via-[#ff4d6d] to-[#6a4cff]"
            style={{ animation: "nd-shimmer-beam 3.2s infinite ease-in-out" }}
          />
        </div>
      </div>
    </section>
  );
}
