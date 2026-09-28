import Link from "next/link";
import type { Metadata } from "next";
import { insights } from "../data/insights";

export const metadata: Metadata = { title: "Insights — TwoNode" };

export default function InsightsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20 sm:px-8">
      <p className="text-sm uppercase tracking-[0.2em] opacity-60">Inside TwoNode</p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-medium sm:text-5xl">
        Things we&apos;re thinking about.
      </h1>
      <p className="mt-6 max-w-xl leading-relaxed opacity-75">
        Industry observations, product stories, and lessons from building — documented as we learn
        them, not published because every website is supposed to have a blog.
      </p>

      <div className="mt-16 divide-y" style={{ borderColor: "var(--v2-border)" }}>
        {insights.map((post) => (
          <Link key={post.slug} href={`/v2/insights/${post.slug}`} className="group block border-t py-8" style={{ borderColor: "var(--v2-border)" }}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-xs uppercase tracking-widest opacity-50">{post.category}</span>
              <time className="text-xs opacity-50">
                {new Date(post.date).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </time>
            </div>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-medium group-hover:opacity-70">
              {post.title}
            </h2>
            <p className="mt-2 leading-relaxed opacity-75">{post.excerpt}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
