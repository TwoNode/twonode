import Link from "next/link";

export function WhatsNext() {
  return (
    <section
      className="border-t"
      style={{
        borderColor: "var(--v2-border)",
        background: "var(--v2-surface)",
      }}
    >
      <div className="mx-auto max-w-3xl px-6 py-28 text-center sm:px-8">
        <p className="text-lg opacity-75">
          We&apos;ve started with the industries we know.
          <br />
          There are more problems to understand. More systems to connect. More
          people to build with.
        </p>
        <h2 className="mt-8 font-[family-name:var(--font-display)] text-4xl font-medium">
          Build with us.
        </h2>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/v2/contact"
            className="rounded-full px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--v2-fg)" }}
          >
            Work with TwoNode →
          </Link>
          <Link
            href="/v2/contact"
            className="rounded-full border px-6 py-3 text-sm font-medium transition-colors hover:opacity-80"
            style={{ borderColor: "var(--v2-border)" }}
          >
            Join TwoNode →
          </Link>
        </div>
      </div>
    </section>
  );
}
