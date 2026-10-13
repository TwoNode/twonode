export type MediaKind = "image" | "pdf" | "video" | "audio" | "other";

export type MediaItem = {
  /** What the link points at: a gateway link for private files, or a public URL. */
  href: string;
  /** Shown in the viewer header; derived from the link when missing. */
  name?: string;
  kind?: MediaKind;
};

const IMAGE = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "avif",
  "svg",
  "bmp",
]);
const VIDEO = new Set(["mp4", "webm", "mov", "m4v", "ogv"]);
const AUDIO = new Set(["mp3", "wav", "ogg", "m4a", "aac"]);

// Links whose target is signed on demand: the file gateways and the public
// (paid-session) certificate route.
const GATEWAY_PATHS = ["/files/view", "/public/certificate"];
const isGatewayPath = (pathname: string) =>
  GATEWAY_PATHS.some((p) => pathname.endsWith(p));

function parse(href: string): URL | null {
  try {
    return new URL(href, "http://local.invalid");
  } catch {
    return null;
  }
}

/** True for a link to the authenticated file gateway (`/api/v1/surfboard/files/view?...`). */
export function isGatewayLink(href: string): boolean {
  return isGatewayPath(parse(href)?.pathname ?? "");
}

/** The stored file behind a link: the `url` / `key` of a gateway link, else the link itself. */
export function fileRefOf(href: string): string {
  const u = parse(href);
  if (!u) return href;
  if (u.pathname.endsWith("/files/view")) {
    return u.searchParams.get("url") || u.searchParams.get("key") || href;
  }
  return href;
}

/** A readable file name: the last path segment, without the upload's `<timestamp>__<random>__` prefix. */
export function fileNameOf(href: string, fallback = "File"): string {
  const ref = fileRefOf(href);
  let path = ref.split(/[?#]/)[0];
  if (/^https?:\/\//i.test(ref)) {
    try {
      path = new URL(ref).pathname;
    } catch {
      /* keep the plain split */
    }
  }
  const last = path.split("/").filter(Boolean).pop() ?? "";
  let name = last;
  try {
    name = decodeURIComponent(last);
  } catch {
    /* keep the raw segment */
  }
  name = name.replace(/^\d{10,}__[a-z0-9]+__/i, "");
  return name || fallback;
}

export function mediaKindFor(href: string, name?: string): MediaKind {
  const label = name || fileNameOf(href, "");
  const ext = label.includes(".") ? label.split(".").pop()!.toLowerCase() : "";
  if (ext === "pdf") return "pdf";
  if (IMAGE.has(ext)) return "image";
  if (VIDEO.has(ext)) return "video";
  if (AUDIO.has(ext)) return "audio";
  return "other";
}

/**
 * The link that downloads instead of showing. Only the gateway can force a
 * download (it signs the link with an attachment disposition); other links are
 * returned unchanged.
 */
export function downloadHrefFor(href: string, name?: string): string {
  const u = parse(href);
  if (!u || !isGatewayPath(u.pathname)) return href;
  u.searchParams.set("download", "1");
  if (name) u.searchParams.set("name", name);
  return /^https?:\/\//i.test(href) ? u.toString() : `${u.pathname}${u.search}`;
}

/**
 * The same gateway link, asking for the signed URL as JSON instead of a
 * redirect, and for the longest window the gateway allows (15 minutes) because
 * PDF.js and video keep reading the file after the viewer opens.
 */
export function jsonHrefFor(href: string): string {
  const u = parse(href);
  if (!u) return href;
  u.searchParams.set("format", "json");
  u.searchParams.set("expiresIn", "900");
  return /^https?:\/\//i.test(href) ? u.toString() : `${u.pathname}${u.search}`;
}
