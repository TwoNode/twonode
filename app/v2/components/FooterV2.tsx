import Link from "next/link";

export function FooterV2() {
  return (
    <footer className="border-t" style={{ borderColor: "var(--v2-border)" }}>
      <div className="mx-auto max-w-6xl px-6 py-12 sm:px-8">
        <p className="font-[family-name:var(--font-display)] text-xl italic">
          Understand the industry. Build what it needs. Connect the people within it.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 text-sm opacity-70">
          <span>© {new Date().getFullYear()} TwoNode Technologies. RC NO.: 7742902.</span>
          <div className="flex gap-6">
            <Link href="/v2/our-story" className="hover:opacity-100">Our Story</Link>
            <Link href="/v2/insights" className="hover:opacity-100">Insights</Link>
            <Link href="/v2/contact" className="hover:opacity-100">Contact</Link>
            <a href="mailto:info@twonodetechnologies.com" className="hover:opacity-100">
              info@twonodetechnologies.com
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
