import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { PageShell } from "../../components/PageShell";
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
  return {
    title: `${post.title} — TwoNode Technologies`,
    description: post.excerpt,
  };
}

export default async function V4InsightPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getInsight(slug);
  if (!post) notFound();

  return (
    <PageShell current="insights">
      <section className="story-hero section-wrap">
        <p className="eyebrow">
          <Link href="/v4/insights">← Insights</Link>
        </p>
        <h1>{post.title}</h1>
        <p className="story-lede">{post.excerpt}</p>
        <div className="story-hero-note">
          <span className="tiny-line"></span>
          <span>
            {post.category} ·{" "}
            {new Date(post.date + "T00:00:00Z").toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: "UTC",
            })}
          </span>
        </div>
      </section>
      <section className="section-wrap v4-rows">
        <div className="v4-prose">
          {post.body.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
