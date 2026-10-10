import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getIndustry, industries } from "../../data/industries";
import { ACCENT_CLASSES } from "../../components/Industries";

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
  return { title: `${industry.name} — TwoNode`, description: industry.context };
}

export default async function IndustryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const industry = getIndustry(slug);
  if (!industry) notFound();

  return (
    <div className="mx-auto max-w-3xl px-6 py-20 sm:px-8">
      <Link
        href="/v2/#industries"
        className="text-sm opacity-60 hover:opacity-100"
      >
        ← Industries
      </Link>
      <p className="mt-6 text-sm uppercase tracking-[0.2em] opacity-60">
        {industry.positioning}
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-medium sm:text-5xl">
        {industry.name}
      </h1>
      <p className="mt-8 text-lg leading-relaxed opacity-80">
        {industry.context}
      </p>

      <div className="mt-16 space-y-12">
        {industry.products.map((p) => (
          <div
            key={p.name}
            className="border-t pt-8"
            style={{ borderColor: "var(--v2-border)" }}
          >
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${ACCENT_CLASSES[p.accent] ?? ""}`}
            >
              <img
                src={p.logo}
                alt={p.name}
                className="h-3.5 w-auto max-w-7 object-contain"
              />
              {p.name}
            </span>
            <h2 className="mt-4 font-[family-name:var(--font-display)] text-2xl font-medium italic">
              {p.tagline}
            </h2>
            <p className="mt-3 leading-relaxed opacity-80">{p.description}</p>
            <Link
              href={p.href}
              className="mt-4 inline-block text-sm font-medium opacity-70 hover:opacity-100"
            >
              Visit {p.name} →
            </Link>
          </div>
        ))}
      </div>

      {industry.otherEcosystemWork && (
        <div
          className="mt-16 border-t pt-8"
          style={{ borderColor: "var(--v2-border)" }}
        >
          <h3 className="text-sm font-medium uppercase tracking-widest opacity-60">
            Other ecosystem work
          </h3>
          <p className="mt-3 leading-relaxed opacity-80">
            {industry.otherEcosystemWork}
          </p>
        </div>
      )}
    </div>
  );
}
