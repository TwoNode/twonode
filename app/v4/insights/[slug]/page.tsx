import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { PageShell } from "../../components/PageShell";
import { ArticleStepNav } from "../../components/ArticleStepNav";
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

const pad = (n: number) => String(n).padStart(2, "0");

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
        <h1 className="insight-title">{post.title}</h1>
        <p className="story-lede insight-lede">{post.excerpt}</p>
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

      <section className="story-body">
        <div className="section-wrap story-content">
          <aside className="story-index">
            <span>IN THIS ARTICLE</span>
            {post.sections.map((s, i) => (
              <a key={s.id} href={`#${s.id}`}>
                {pad(i + 1)} / {s.label}
              </a>
            ))}
          </aside>
          <div className="story-article">
            <section id="intro">
              {post.intro.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </section>
            {post.sections.map((s, i) => (
              <section key={s.id} id={s.id}>
                <p className="eyebrow">
                  {pad(i + 1)} / {s.label.toUpperCase()}
                </p>
                <h2>{s.heading}</h2>
                {s.paragraphs.map((para, j) => (
                  <p key={j}>{para}</p>
                ))}
              </section>
            ))}
          </div>
        </div>
      </section>
      <ArticleStepNav ids={["intro", ...post.sections.map((s) => s.id)]} />
      <section className="story-cta">
        <div className="section-wrap story-cta-inner">
          <p className="eyebrow">THE WORK CONTINUES</p>
          <h2>There is more work to do.</h2>
          <p>
            More problems to understand. More solutions to build. More
            connections to make.
          </p>
          <a
            className="button button-light"
            href="mailto:info@twonodetechnologies.com"
          >
            Build with TwoNode <span>↗</span>
          </a>
        </div>
      </section>
    </PageShell>
  );
}
