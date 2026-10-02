/**
 * §6.6 resolution: structured logging, no external service. Every error
 * that reaches the API layer already funnels through handleApiError
 * (lib/api/errors.ts) — that's the single place this logger is wired in,
 * so no route needs to call it directly. Output is one JSON line per
 * event to stdout/stderr, which is exactly what hosting platforms
 * (Vercel, etc.) already collect and let you search/filter on. Swapping
 * in Sentry later means changing `emit()` here, not any call site.
 */

type LogLevel = "info" | "warn" | "error";

export interface LogContext {
  [key: string]: unknown;
}

function serializeError(err: unknown): unknown {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack };
  }
  return err;
}

function emit(
  level: LogLevel,
  message: string,
  context?: LogContext,
  err?: unknown
) {
  const entry: Record<string, unknown> = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context,
  };
  if (err !== undefined) entry.error = serializeError(err);

  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (message: string, context?: LogContext) =>
    emit("info", message, context),
  warn: (message: string, context?: LogContext, err?: unknown) =>
    emit("warn", message, context, err),
  error: (message: string, context?: LogContext, err?: unknown) =>
    emit("error", message, context, err),
};
