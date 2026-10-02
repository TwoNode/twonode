"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Shared UI for every root-layout group's error.tsx (app/(main), app/(noPopUp),
 * app/(projects), app/v2). Each group is an independent Next.js root layout
 * (its own <html>/<body>, per the "multiple root layouts" pattern — see
 * app/(projects)/layout.tsx), so a single top-level app/error.tsx is never
 * actually mounted for any of them; each group needs its own error.tsx,
 * exactly like not-found.tsx is already duplicated per group in this repo.
 * This component holds the shared UI so those files stay one-liners.
 */
export default function ErrorFallback({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.group("Error Details");
    console.warn("Error Message:", error.message);
    console.warn("Error Stack:", error.stack);
    console.warn("Error Digest:", error.digest);
    console.groupEnd();
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 py-12 dark:bg-gray-950">
      <h1 className="text-7xl font-extrabold text-blue-900 dark:text-blue-300 mb-4">
        500
      </h1>
      <p className="text-xl text-blue-700 dark:text-blue-200 mb-6">
        Oops! Something went wrong. Please try again later.
      </p>
      <div className="flex gap-4">
        <button
          onClick={() => reset()}
          className="px-6 py-2 bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-800 transition"
        >
          Try again
        </button>
        <Link
          href="/"
          className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
