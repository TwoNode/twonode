import { z } from "zod";
import { ValidationError } from "@/lib/api/errors";

/** The most plans one pillars call may ask about: the plans in view, not the account. */
export const MAP_PILLAR_PLAN_LIMIT = 60;

const idList = z
  .string()
  .min(1)
  .transform((text) =>
    // A repeated id is asked once.
    [...new Set(text.split(",").map((id) => id.trim()))]
  )
  .pipe(
    z
      .array(z.string().regex(/^[A-Za-z0-9_-]{1,100}$/, "not a plan id"))
      .min(1)
      .max(MAP_PILLAR_PLAN_LIMIT)
  );

/**
 * Reads and checks the query string of `GET plans/map/pillars`: `ids`, the plans (comma separated,
 * 1 to 60, each a plan id) to send pillars for. A missing, empty or over-long list is a 400
 * naming the field.
 */
export function parseMapPillarsQuery(searchParams: URLSearchParams): {
  ids: string[];
} {
  const parsed = z
    .object({ ids: idList })
    .safeParse({ ids: searchParams.get("ids") ?? undefined });
  if (!parsed.success) throw new ValidationError(parsed.error.format());
  return { ids: parsed.data.ids };
}
