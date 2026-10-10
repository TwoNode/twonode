import Link from "next/link";

export function WhatsNext() {
  return (
    <section className="border-b border-[#e6e4f0] dark:border-[#29273c] bg-white dark:bg-[#161524]">
      <div className="mx-auto max-w-4xl px-6 py-24 sm:px-8 sm:py-32 text-center">
        <p className="font-[family-name:var(--font-sans)] text-lg sm:text-xl font-medium leading-relaxed text-[#48455e] dark:text-[#b8b5d0] max-w-2xl mx-auto">
          We&apos;ve started with the industries we know.
          <br />
          There are more problems to understand. More systems to connect. More
          people to build with.
        </p>
        <h2 className="mt-6 font-[family-name:var(--font-sora)] text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#11101e] dark:text-white">
          Build with us.
        </h2>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/v2/contact"
            className="inline-flex items-center gap-2 rounded-full bg-[#ff4d6d] px-8 py-3.5 text-sm font-bold text-white shadow-md shadow-[#ff4d6d]/30 transition-all hover:bg-[#ff3358] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#ff4d6d]/40"
          >
            Work with TwoNode →
          </Link>
          <Link
            href="/v2/contact"
            className="inline-flex items-center gap-2 rounded-full border border-[#11101e] dark:border-white px-8 py-3.5 text-sm font-bold text-[#11101e] dark:text-white transition-all hover:bg-[#11101e] hover:text-white dark:hover:bg-white dark:hover:text-[#11101e] hover:-translate-y-0.5"
          >
            Join TwoNode →
          </Link>
        </div>
      </div>
    </section>
  );
}
