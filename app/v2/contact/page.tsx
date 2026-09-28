import type { Metadata } from "next";

export const metadata: Metadata = { title: "Contact — TwoNode" };

/**
 * No form submission wired up in this pass — the existing site's contact
 * form (components/ReachOutToUs.tsx) isn't a drop-in fit for /v2's design
 * language, and building a new backend endpoint is out of scope here.
 * Direct contact channels only; revisit if /v2 gets promoted.
 */
export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-20 sm:px-8">
      <p className="text-sm uppercase tracking-[0.2em] opacity-60">Build with us</p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-medium sm:text-5xl">
        Let&apos;s talk about your industry.
      </h1>
      <p className="mt-6 max-w-lg text-lg leading-relaxed opacity-80">
        Whether you want to work with TwoNode or join us in building, the fastest way to reach us is
        directly.
      </p>

      <div className="mt-14 grid gap-8 sm:grid-cols-2">
        <div>
          <h2 className="text-sm font-medium uppercase tracking-widest opacity-60">Email</h2>
          <a href="mailto:info@twonodetechnologies.com" className="mt-2 block text-lg hover:opacity-70">
            info@twonodetechnologies.com
          </a>
        </div>
        <div>
          <h2 className="text-sm font-medium uppercase tracking-widest opacity-60">Phone</h2>
          <a href="tel:+2347069227677" className="mt-2 block text-lg hover:opacity-70">
            (+234) 706-9227-677
          </a>
        </div>
      </div>

      <p className="mt-16 text-xs uppercase tracking-widest opacity-40">RC NO.: 7742902</p>
    </div>
  );
}
