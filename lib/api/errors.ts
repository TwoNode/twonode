import { NextResponse } from "next/server";
import { Prisma } from "../../prisma/generated";
import type { ApiFailure } from "@/lib/api/types";
import { logger, type LogContext } from "@/lib/observability/logger";

/**
 * Base class for anything a service or route handler intentionally throws
 * with a known HTTP mapping. withAuth() (and any route not using withAuth)
 * only ever needs to catch this one type, plus Prisma's own error class.
 * See docs/development-history/ARCHITECTURE_REBUILD_PROPOSAL.md §4.7.
 */
export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: unknown
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends ApiError {
  constructor(details: unknown) {
    super(400, "VALIDATION_ERROR", "Invalid request", details);
  }
}
export class UnauthenticatedError extends ApiError {
  constructor() {
    super(401, "UNAUTHENTICATED", "Not signed in");
  }
}
export class ForbiddenError extends ApiError {
  constructor() {
    super(403, "FORBIDDEN", "Not allowed");
  }
}
export class NotFoundError extends ApiError {
  constructor(entity: string) {
    super(404, "NOT_FOUND", `${entity} not found`);
  }
}
export class ConflictError extends ApiError {
  constructor(message: string) {
    super(409, "CONFLICT", message);
  }
}
export class RateLimitError extends ApiError {
  constructor() {
    super(429, "RATE_LIMITED", "Too many requests");
  }
}
/**
 * Distinct from ForbiddenError so callers (and the client) can tell "you're
 * not allowed to do this at all" apart from "you'd be allowed if your
 * subscription were active" — the latter should prompt an upgrade CTA
 * rather than a generic permission-denied message.
 */
export class SubscriptionRequiredError extends ApiError {
  constructor(message = "An active subscription is required for this action") {
    super(403, "SUBSCRIPTION_REQUIRED", message);
  }
}

/**
 * Distinct from ForbiddenError so callers and client apps can tell "you're
 * blocked until your email is verified" apart from generic forbidden errors.
 */
export class EmailVerificationRequiredError extends ApiError {
  constructor(
    message = "Email verification is required to perform this action"
  ) {
    super(403, "EMAIL_VERIFICATION_REQUIRED", message);
  }
}

/**
 * The mobile app is older than the lowest version the server still serves
 * (settings.mobileApp, see lib/api/mobileApp.ts). 426 ("Upgrade Required") is
 * the status written for exactly this; the app shows an update screen and does
 * not sign the person out. `details` carries what the screen needs:
 * { platform, minimumVersion, storeUrl } (storeUrl is "" when none is set).
 */
export class AppUpdateRequiredError extends ApiError {
  constructor(details: {
    platform: string | null;
    minimumVersion: string;
    storeUrl: string;
  }) {
    super(
      426,
      "APP_UPDATE_REQUIRED",
      "This version of the app is no longer supported. Please update it.",
      details
    );
  }
}

/**
 * The emergency switch (settings.mobileApp.signInEnabled) is off: new sign-ins
 * from the app are paused. 503 so a client treats it as "try again later", not
 * as a wrong password. Sessions that are already open are not touched.
 */
export class MobileSignInDisabledError extends ApiError {
  constructor() {
    super(
      503,
      "MOBILE_SIGN_IN_DISABLED",
      "Signing in from the app is paused. Please try again later."
    );
  }
}

/**
 * Prisma error-code -> friendly message table. Ported from the existing
 * app/(projects)/(surfboard)/utils/prismaErrorHandler.ts (the one place this
 * codebase already had thorough coverage, but Surfboard-only and shaped to
 * return a string for the old server-action convention) — same coverage,
 * now returning an HTTP status + code so every product's API routes share it.
 */
const PRISMA_ERROR_MESSAGES: Record<string, string> = {
  P2000: "The provided value is too long for the field",
  P2001: "Record not found",
  P2002: "A record with this value already exists",
  P2003: "Related record not found",
  P2004: "Database constraint violation",
  P2005: "Invalid value provided for the field",
  P2006: "The provided value is invalid",
  P2007: "Data validation error",
  P2008: "Query parsing failed",
  P2009: "Query validation failed",
  P2010: "Raw query failed",
  P2011: "Null constraint violation",
  P2012: "Missing required value",
  P2013: "Missing required argument",
  P2014: "Relation violation",
  P2015: "Related record not found",
  P2016: "Query interpretation error",
  P2017: "Records not connected",
  P2018: "Required connected records not found",
  P2019: "Input error",
  P2020: "Value out of range",
  P2021: "Table does not exist",
  P2022: "Column does not exist",
  P2023: "Inconsistent column data",
  P2024: "Connection pool timeout",
  P2025: "Record to update/delete not found",
  P2026: "Database query error",
  P2027: "Multiple database errors occurred",
  P2028: "Transaction API error",
  P2030: "Cannot find fulltext index",
  P2033: "Number out of range",
  P2034: "Transaction failed",
};

function prismaStatusFor(code: string): number {
  if (code === "P2002") return 409; // unique constraint
  if (
    code === "P2025" ||
    code === "P2001" ||
    code === "P2015" ||
    code === "P2018"
  )
    return 404;
  if (code === "P2003" || code === "P2014" || code === "P2017") return 400;
  return 500;
}

/**
 * Route-level wrapper — every route's error path funnels through this
 * (directly, or via withAuth's built-in try/catch), which is also why this
 * is the one place §6.6's structured-logging decision is wired in: every
 * caller gets logging for free, none of them need their own logger.error()
 * calls. `context` is optional so existing callers keep working unchanged;
 * withAuth passes route/method/user context automatically.
 */
export function handleApiError(
  err: unknown,
  context?: LogContext
): NextResponse<ApiFailure> {
  if (err instanceof ApiError) {
    // 4xx ApiErrors (validation, not-found, unauthenticated, ...) are
    // expected control flow, not failures — logged at warn so they don't
    // drown out real 5xx errors, but still visible if you're debugging a
    // specific route or user.
    const level = err.status >= 500 ? "error" : "warn";
    logger[level](err.message, {
      ...context,
      code: err.code,
      status: err.status,
    });
    return NextResponse.json(
      {
        success: false,
        error: err.message,
        code: err.code,
        details: err.details,
      },
      { status: err.status }
    );
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    logger.error("Unhandled Prisma error", { ...context, code: err.code }, err);
    return NextResponse.json(
      {
        success: false,
        error: PRISMA_ERROR_MESSAGES[err.code] ?? "Database error",
        code: err.code,
      },
      { status: prismaStatusFor(err.code) }
    );
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    logger.error("Prisma validation error", context, err);
    return NextResponse.json(
      {
        success: false,
        error: "Invalid data provided",
        code: "PRISMA_VALIDATION_ERROR",
      },
      { status: 400 }
    );
  }

  // Unknown/unexpected — log server-side, never leak internals to the client.
  logger.error("Unhandled error in API route", context, err);
  return NextResponse.json(
    { success: false, error: "Internal server error" },
    { status: 500 }
  );
}
