import { HeroNetworkGraph } from "./HeroNetworkGraph";

export function Opening() {
  return (
    <section className="border-b border-[#e6e4f0] dark:border-[#29273c]">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:px-8 sm:py-24 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] items-center gap-12 lg:gap-8">
        <div>
          <p className="font-[family-name:var(--font-mono)] text-xs font-semibold uppercase tracking-[0.2em] text-[#767490] dark:text-[#827e9f]">
            TwoNode
          </p>
          <h1 className="mt-4 font-[family-name:var(--font-sora)] text-4xl font-extrabold tracking-tight text-[#11101e] dark:text-white sm:text-5xl lg:text-6xl leading-[1.08]">
            We build for industries.
            <br />
            <span className="font-[family-name:var(--font-display)] italic font-normal text-[#ff4d6d]">
              We connect
            </span>{" "}
            every player in the ecosystem.
          </h1>

          <div className="mt-8 space-y-1 font-[family-name:var(--font-sans)] text-lg text-[#48455e] dark:text-[#b8b5d0] sm:text-xl font-medium leading-relaxed">
            <p>Every industry has its own way of working.</p>
            <p>Its own people. Its own information.</p>
            <p>Its own problems. Its own opportunities.</p>
          </div>

          <div className="mt-8 font-[family-name:var(--font-sans)] text-lg text-[#11101e] dark:text-white leading-relaxed">
            <p>We spend time understanding those things.</p>
            <strong className="block mt-1 font-[family-name:var(--font-sora)] font-extrabold text-2xl text-[#ff4d6d]">
              Then we build.
            </strong>
          </div>
        </div>

        {/* Kinetic Two-Node Network Graph Centerpiece */}
        <div className="w-full flex justify-center">
          <HeroNetworkGraph />
        </div>
      </div>
    </section>
  );
}
