import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getInsight, insights } from "../../data/insights";

export function generateStaticParams() {
  return insights.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getInsight(slug);
  if (!post) return {};
  return { title: `${post.title} — TwoNode`, description: post.excerpt };
}

export default async function InsightPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getInsight(slug);
  if (!post) notFound();

  return (
    <article className="mx-auto max-w-2xl px-6 py-20 sm:px-8">
      <Link
        href="/v2/insights"
        className="text-sm opacity-60 hover:opacity-100"
      >
        ← Insights
      </Link>
      <span className="mt-6 block text-xs uppercase tracking-widest opacity-50">
        {post.category}
      </span>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-medium leading-tight sm:text-5xl">
        {post.title}
      </h1>
      <time className="mt-4 block text-sm opacity-50">
        {new Date(post.date).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
      </time>
      <div className="mt-10 space-y-5 text-lg leading-relaxed opacity-85">
        {post.body.map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>
    </article>
  );
}
