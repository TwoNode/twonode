import { HeroNetworkGraph } from "./HeroNetworkGraph";

export function Opening() {
  return (
    <section className="border-b border-[#e6e4f0] dark:border-[#29273c]">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:px-8 sm:py-24 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] items-center gap-12 lg:gap-8">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[#767490] dark:text-[#827e9f]">
            TwoNode
          </p>
          <h1 className="mt-4 font-(family-name:--font-sora) text-4xl font-extrabold tracking-tight text-[#11101e] dark:text-white sm:text-5xl lg:text-6xl leading-[1.12]">
            Every industry has its own{" "}
            <span className="font-(family-name:--font-display) italic font-normal text-[#ff4d6d]">
              way of working.
            </span>
          </h1>

          <div className="mt-8 space-y-1.5 font-sans text-lg text-[#48455e] dark:text-[#b8b5d0] sm:text-xl font-medium leading-relaxed">
            <p>Its own people. Its own information.</p>
            <p>Its own problems, systems, relationships, and opportunities.</p>
          </div>

          <div className="mt-8 font-sans text-lg text-[#11101e] dark:text-white leading-relaxed">
            <p className="text-[#767490] dark:text-[#827e9f]">We spend time understanding these things.</p>
            <strong className="block mt-1 font-(family-name:--font-sora) font-extrabold text-2xl text-[#ff4d6d]">
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
