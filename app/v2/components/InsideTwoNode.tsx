import Link from "next/link";
import { insights } from "../data/insights";

export function InsideTwoNode() {
  const latest = insights.slice(0, 3);
  return (
    <section className="border-t" style={{ borderColor: "var(--v2-border)" }}>
      <div className="mx-auto max-w-6xl px-6 py-24 sm:px-8">
        <div className="flex items-end justify-between">
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-medium sm:text-4xl">
            Things we&apos;re thinking about.
          </h2>
          <Link href="/v2/insights" className="hidden text-sm font-medium opacity-70 hover:opacity-100 sm:block">
            All insights →
          </Link>
        </div>
        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {latest.map((post) => (
            <Link key={post.slug} href={`/v2/insights/${post.slug}`} className="group">
              <span className="text-xs uppercase tracking-widest opacity-50">{post.category}</span>
              <h3 className="mt-2 font-[family-name:var(--font-display)] text-lg font-medium leading-snug group-hover:opacity-70">
                {post.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed opacity-70">{post.excerpt}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
