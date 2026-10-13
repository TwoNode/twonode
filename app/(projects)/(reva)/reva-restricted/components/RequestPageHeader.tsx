import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

/**
 * The top of a request's detail page: a way back, what kind of request it
 * is, its reference, and the page-level actions (the PDF downloads).
 */
export function RequestPageHeader({
  kind,
  reference,
  actions,
}: {
  kind: string;
  reference: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <Link
          href="/reva-restricted/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          All requests
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
          {kind}
        </h1>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          {reference}
        </p>
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </header>
  );
}
