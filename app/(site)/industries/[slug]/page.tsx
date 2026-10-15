import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { PageShell } from "../../components/PageShell";
import { getIndustry, industries } from "../../data/industries";

export function generateStaticParams() {
  return industries.map((i) => ({ slug: i.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const industry = getIndustry(slug);
  if (!industry) return {};
  return {
    title: `${industry.name} — TwoNode Technologies`,
    description: industry.context,
  };
}

export default async function V4IndustryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const industry = getIndustry(slug);
  if (!industry) notFound();

  return (
    <PageShell current="industry">
      <section className="story-hero section-wrap">
        <p className="eyebrow">
          <Link href="/#work">← Our work</Link>
          <span
            className={`status ${industry.status === "active" ? "status-active" : "status-next"}`}
          >
            {industry.status === "active" ? "Active" : "Next"}
          </span>
        </p>
        <h1>{industry.name}</h1>
        <p className="story-lede">{industry.context}</p>
        <div className="story-hero-note">
          <span className="tiny-line"></span>
          <span>{industry.positioning}</span>
        </div>
      </section>
      <section className="section-wrap v4-rows">
        {industry.products.map((p) => (
          <article className="v4-row v4-post" key={p.name}>
            <p className="eyebrow">{p.name.toUpperCase()}</p>
            <h2>{p.tagline}</h2>
            <p className="v4-plain">{p.description}</p>
            <a
              className="text-link"
              href={`https://www.twonodetechnologies.com${p.href}`}
              target="_blank"
              rel="noreferrer"
            >
              Visit {p.name} <span>↗</span>
            </a>
          </article>
        ))}
        {industry.otherEcosystemWork && (
          <div className="v4-row">
            <p className="eyebrow">OTHER ECOSYSTEM WORK</p>
            <p className="v4-plain">{industry.otherEcosystemWork}</p>
          </div>
        )}
      </section>
    </PageShell>
  );
}
