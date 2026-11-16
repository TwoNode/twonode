import Link from "next/link";
import type { LegalDoc } from "@/lib/legal/surfboard";
import { LEGAL_EFFECTIVE_DATE } from "@/lib/legal/surfboard";

/** A plain, readable page for a legal document. A server component: no script, no data fetching. */
export function LegalDocument({
  doc,
  backHref,
  backLabel,
  otherHref,
  otherLabel,
}: {
  doc: LegalDoc;
  backHref: string;
  backLabel: string;
  otherHref: string;
  otherLabel: string;
}) {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 text-slate-800 dark:text-slate-200">
      <Link
        href={backHref}
        className="text-sm font-semibold text-[#233dff] hover:underline dark:text-sky-300"
      >
        ← {backLabel}
      </Link>
      <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
        {doc.title}
      </h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Effective {LEGAL_EFFECTIVE_DATE}
      </p>
      <p className="mt-6 leading-7">{doc.intro}</p>

      {doc.sections.map((section, index) => (
        <section key={section.heading} className="mt-8">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            {index + 1}. {section.heading}
          </h2>
          {section.paragraphs?.map((text) => (
            <p key={text} className="mt-3 leading-7">
              {text}
            </p>
          ))}
          {section.items && (
            <ul className="mt-3 list-disc space-y-2 pl-6 leading-7">
              {section.items.map((text) => (
                <li key={text}>{text}</li>
              ))}
            </ul>
          )}
        </section>
      ))}

      <p className="mt-12 border-t border-slate-200 pt-6 text-sm dark:border-white/10">
        <Link
          href={otherHref}
          className="font-semibold text-[#233dff] hover:underline dark:text-sky-300"
        >
          {otherLabel}
        </Link>
      </p>
    </main>
  );
}
