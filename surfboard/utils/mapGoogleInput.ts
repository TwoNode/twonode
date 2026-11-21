import { z } from "zod";
import { ValidationError } from "@/lib/api/errors";

/**
 * What the map's Google routes accept (`surfboard/map/*`): coordinates inside Nigeria, a search
 * text, a session token and a place id. A request that cannot be one a surveyor in Nigeria makes
 * is refused before Google is asked (and billed).
 */

/** Nigeria's box, a little generous: south 4, north 14, west 2.5, east 15 degrees. */
const lat = z.number().finite().min(4).max(14);
const lng = z.number().finite().min(2.5).max(15);
export const point = z.object({ lat, lng });
export type MapPoint = z.infer<typeof point>;

export const routeBodySchema = z.object({
  origin: point,
  destination: point,
});

/** A random token the app makes for one search: Google bills a session's keystrokes together. */
export const sessionToken = z
  .string()
  .regex(/^[A-Za-z0-9_-]{16,64}$/, "not a session token");

const placeId = z.string().regex(/^[A-Za-z0-9_-]{10,300}$/, "not a place id");

const number = (text: string | null) =>
  text === null || text.trim() === "" ? undefined : Number(text);

/** "6.5,3.4": latitude then longitude, inside Nigeria. */
const near = z
  .string()
  .regex(/^-?\d{1,3}(\.\d+)?,-?\d{1,3}(\.\d+)?$/, "not lat,lng")
  .transform((text) => {
    const [la, ln] = text.split(",").map(Number);
    return { lat: la, lng: ln };
  })
  .pipe(point);

/** `input` (3 to 100 characters once trimmed), `sessionToken`, and `near`, where the map is looking (optional). */
export function parseAutocompleteQuery(searchParams: URLSearchParams): {
  input: string;
  sessionToken: string;
  near?: MapPoint;
} {
  const parsed = z
    .object({
      input: z.string().trim().min(3).max(100),
      sessionToken,
      near: near.optional(),
    })
    .safeParse({
      input: searchParams.get("input") ?? undefined,
      sessionToken: searchParams.get("sessionToken") ?? undefined,
      near: searchParams.get("near") ?? undefined,
    });
  if (!parsed.success) throw new ValidationError(parsed.error.format());
  return parsed.data;
}

/** The path's `placeId` and the query's `sessionToken` (the one the search used). */
export function parsePlaceDetailsRequest(
  id: string,
  searchParams: URLSearchParams
): { placeId: string; sessionToken: string } {
  const parsed = z.object({ placeId, sessionToken }).safeParse({
    placeId: id,
    sessionToken: searchParams.get("sessionToken") ?? undefined,
  });
  if (!parsed.success) throw new ValidationError(parsed.error.format());
  return parsed.data;
}

export function parseReverseGeocodeQuery(
  searchParams: URLSearchParams
): MapPoint {
  const parsed = point.safeParse({
    lat: number(searchParams.get("lat")),
    lng: number(searchParams.get("lng")),
  });
  if (!parsed.success) throw new ValidationError(parsed.error.format());
  return parsed.data;
}
