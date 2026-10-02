import Link from "next/link";

export function OurStory() {
  return (
    <section className="border-t" style={{ borderColor: "var(--v2-border)" }}>
      <div className="mx-auto max-w-3xl px-6 py-24 text-center sm:px-8">
        <p className="text-sm uppercase tracking-[0.2em] opacity-60">
          Our story
        </p>
        <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl italic font-medium sm:text-4xl">
          We started with problems we knew.
        </h2>
        <Link
          href="/v2/our-story"
          className="mt-8 inline-block text-sm font-medium opacity-80 hover:opacity-100"
        >
          Read where we came from →
        </Link>
      </div>
    </section>
  );
}
