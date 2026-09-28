import type { Metadata } from "next";

export const metadata: Metadata = { title: "Our Story — TwoNode" };

export default function OurStoryPage() {
  return (
    <article className="mx-auto max-w-2xl px-6 py-20 sm:px-8">
      <p className="text-sm uppercase tracking-[0.2em] opacity-60">Our story</p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-medium leading-tight sm:text-5xl">
        We started with problems we knew.
      </h1>
      <div className="mt-10 space-y-6 text-lg leading-relaxed opacity-85">
        <p>
          TwoNode didn&apos;t start with a piece of technology looking for a home. It started inside
          the surveying and geospatial industry — watching how a survey plan actually moves from a
          surveyor&apos;s hands to a ministry&apos;s approval stamp, and how much of that movement
          still happens on paper, through relationships, and by memory.
        </p>
        <p>
          What frustrated us wasn&apos;t the paperwork itself. It was how much good work — a
          surveyor&apos;s careful record, a ministry officer&apos;s diligence — got lost to a system
          that had no shared, trustworthy record for any of it to live in.
        </p>
        <p>
          That&apos;s what made us start building: not a search for a market, but a specific, firsthand
          frustration with watching real work go unrecognized because the infrastructure around it
          couldn&apos;t hold it.
        </p>
        <p>
          We continue to work across industries for the same reason we started in one. The pattern
          repeats — a chain of people, information and trust that nobody currently owns end to end —
          and every industry we enter, we find it again in a new shape.
        </p>
        <p className="text-sm italic opacity-60">
          Founder profiles are coming soon for readers who want more detail on the people building
          this.
        </p>
      </div>
    </article>
  );
}
