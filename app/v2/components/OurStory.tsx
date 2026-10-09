import Link from "next/link";

export function OurStory() {
  return (
    <section className="border-b border-[#e6e4f0] dark:border-[#29273c] py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-6 sm:px-8">
        <div className="rounded-3xl bg-[#11101e] dark:bg-[#161524] border border-[#29273c] p-10 sm:p-16 text-center text-white shadow-xl relative overflow-hidden">
          {/* Subtle background glow */}
          <div
            className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-[#ff4d6d]/20 blur-3xl pointer-events-none"
            aria-hidden="true"
          />
          <div
            className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-[#6a4cff]/20 blur-3xl pointer-events-none"
            aria-hidden="true"
          />

          <p className="relative font-[family-name:var(--font-mono)] text-xs font-semibold uppercase tracking-[0.2em] text-[#ff4d6d]">
            Our Story
          </p>
          <h2 className="relative mt-4 font-[family-name:var(--font-display)] text-3xl sm:text-4xl lg:text-5xl italic font-normal text-white">
            We started with problems we knew.
          </h2>
          <div className="relative mt-8">
            <Link
              href="/v2/our-story"
              className="inline-flex items-center gap-2 rounded-full bg-white text-[#11101e] px-6 py-3 text-sm font-bold shadow-md transition-all hover:bg-[#ff4d6d] hover:text-white hover:-translate-y-0.5"
            >
              Read where we came from →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
