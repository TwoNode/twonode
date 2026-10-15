import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "../components/PageShell";
import { insights } from "../data/insights";

export const metadata: Metadata = {
  title: "Behind the Build — TwoNode Technologies",
  description:
    "Industry observations, product stories, and lessons from building documented as we learn them.",
};

const fmt = (iso: string) =>
  new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

export default function V4InsightsPage() {
  return (
    <PageShell current="insights">
      <section className="story-hero section-wrap">
        <p className="eyebrow">
          <span className="eyebrow-dot"></span> INSIDE TWONODE
        </p>
        <h1>
          Behind the <span>Build.</span>
        </h1>
      </section>
      <section className="section-wrap v4-rows">
        {insights.map((post) => (
          <article className="v4-row v4-post" key={post.slug}>
            <p className="eyebrow">
              {post.category.toUpperCase()}
              <span className="eyebrow-cat">{fmt(post.date)}</span>
            </p>
            <h2>
              <Link href={`/v4/insights/${post.slug}`}>{post.title}</Link>
            </h2>
            <p className="v4-plain">{post.excerpt}</p>
            <Link className="text-link" href={`/v4/insights/${post.slug}`}>
              Read article <span>↗</span>
            </Link>
          </article>
        ))}
      </section>
    </PageShell>
  );
}
