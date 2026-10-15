"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Last-resort fallback only — catches errors thrown before any root-layout
 * group (app/(site), app/(legacy), app/(noPopUp), app/(projects) — see their own
 * error.tsx, backed by components/ErrorFallback.tsx) has a chance to mount.
 * This is the one file allowed to render its own <html>/<body>: the
 * `global-error` filename is what makes Next.js treat it as a full root
 * layout replacement; naming this `error.tsx` (as it previously was) meant
 * it sat above every route group without a layout.tsx to pair with, so it
 * was never actually reachable for real page errors.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.group("Error Details");
    console.warn("Error Message:", error.message);
    console.warn("Error Stack:", error.stack);
    console.warn("Error Digest:", error.digest);
    console.groupEnd();
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex flex-col items-center justify-center bg-blue-50 px-4 py-12">
          <h1 className="text-7xl font-extrabold text-blue-900 mb-4">500</h1>
          <p className="text-xl text-blue-700 mb-6">
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
      </body>
    </html>
  );
}
