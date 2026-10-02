"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Home } from "lucide-react";

export default function NotFoundPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 py-16 dark:bg-gray-950">
      <div className="flex flex-col items-center text-center">
        <span
          className="select-none text-[6rem] font-extrabold leading-none tracking-tight sm:text-[8rem]"
          style={{
            backgroundImage:
              "linear-gradient(135deg, #082f49 0%, #0369a1 55%, #0ea5e9 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          404
        </span>
        <h1 className="mt-2 text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
          We couldn&apos;t find that page.
        </h1>
        <p className="mt-3 max-w-sm text-sm text-slate-500 dark:text-gray-400">
          It may have been moved, renamed, or the link is out of date.
          Double-check the URL, or head back to safety below.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-gray-200 dark:hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-sky-950 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-900"
          >
            <Home className="h-4 w-4" />
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
