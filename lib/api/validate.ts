import { NextRequest } from "next/server";
import { z } from "zod";
import { ValidationError } from "@/lib/api/errors";

/**
 * Parses and validates a request body against a Zod schema, throwing a
 * ValidationError (caught by withAuth's built-in handler, or by
 * handleApiError directly on unauthenticated routes) on failure — routes
 * call this and use the result directly, no if-check needed.
 */
export async function validateBody<T extends z.ZodType>(
  req: NextRequest,
  schema: T
): Promise<z.infer<T>> {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.format());
  }
  return parsed.data;
}
