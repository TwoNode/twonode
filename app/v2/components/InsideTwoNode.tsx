import Link from "next/link";
import { insights } from "../data/insights";

export function InsideTwoNode() {
  const latest = insights.slice(0, 3);

  return (
    <section className="border-b border-[#e6e4f0] dark:border-[#29273c]">
      <div className="mx-auto max-w-6xl px-6 py-20 sm:px-8 sm:py-28">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[#767490] dark:text-[#827e9f]">
              Inside TwoNode
            </p>
            <h2 className="mt-3 font-(family-name:--font-sora) text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#11101e] dark:text-white">
              Behind the Build.
            </h2>
          </div>
          <Link
            href="/v2/insights"
            className="inline-flex items-center gap-1 font-(family-name:--font-sora) text-sm font-bold text-[#ff4d6d] hover:underline"
          >
            All insights →
          </Link>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-3">
          {latest.map((post) => (
            <Link
              key={post.slug}
              href={`/v2/insights/${post.slug}`}
              className="group flex flex-col justify-between rounded-3xl border border-[#e6e4f0] dark:border-[#29273c] bg-white dark:bg-[#161524] p-8 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-[#d4d0e6]"
            >
              <div>
                <span className="inline-block rounded-full bg-[#faf9f6] dark:bg-[#0f0e18] px-3 py-1 font-mono text-xs font-semibold uppercase tracking-wider text-[#767490] dark:text-[#827e9f]">
                  {post.category}
                </span>
                <h3 className="mt-4 font-(family-name:--font-sora) text-lg sm:text-xl font-bold tracking-tight text-[#11101e] dark:text-white transition-colors group-hover:text-[#ff4d6d]">
                  {post.title}
                </h3>
                <p className="mt-3 font-sans text-sm leading-relaxed text-[#48455e] dark:text-[#b8b5d0]">
                  {post.excerpt}
                </p>
              </div>
              <span className="mt-6 font-(family-name:--font-sora) text-xs font-bold text-[#11101e] dark:text-white opacity-60 group-hover:opacity-100">
                Read article →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
