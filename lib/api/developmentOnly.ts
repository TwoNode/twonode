import { NextResponse } from "next/server";

/**
 * Wraps a route handler so that it exists only on a development server and
 * answers 404 everywhere else (staging and production both run with NODE_ENV
 * "production"). For debug tools that must never be reachable on a deployed
 * site (I-053). The check is made on every request and comes before the
 * handler's own session check, so a stranger gets the same 404 as anybody.
 */
export function developmentOnly<A extends unknown[]>(
  handler: (...args: A) => Promise<Response>
) {
  return async (...args: A): Promise<Response> => {
    if (process.env.NODE_ENV !== "development") {
      return NextResponse.json(
        { success: false, error: "Not found" },
        { status: 404 }
      );
    }
    return handler(...args);
  };
}
