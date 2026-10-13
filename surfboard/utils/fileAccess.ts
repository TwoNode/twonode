// ADR-0012: rules for who may get a signed link to a stored file.

export const MIN_SIGNED_URL_SECONDS = 30;
export const MAX_SIGNED_URL_SECONDS = 900;
export const DEFAULT_SIGNED_URL_SECONDS = 300;

/** Keeps the advertised short-lived link short-lived, whatever the query string says. */
export function clampExpiresIn(raw: string | null): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_SIGNED_URL_SECONDS;
  return Math.min(MAX_SIGNED_URL_SECONDS, Math.max(MIN_SIGNED_URL_SECONDS, Math.floor(n)));
}

/** False for empty keys and anything that could climb out of its folder. */
export function isSafeStorageKey(key: string): boolean {
  if (!key || key.length < 8) return false;
  if (key.includes("\0") || key.includes("\\")) return false;
  return !key.split("/").some((seg) => seg === ".." || seg === ".");
}

const FILE_TYPE_FOLDERS = new Set([
  "pdf",
  "cad",
  "certificate",
  "redcopy",
  "viewer-attachment",
  "general",
]);

/**
 * Keys look like surfboard/<userId>/<type>/... (see buildStorageKey). A plan's
 * file fields are writable by its owner, so being listed on a plan proves
 * nothing: a key under someone else's folder is refused unless that someone is
 * one of the `allowedUserIds` (the plan owner, or the viewer who attached it).
 */
export function keyBelongsToAllowedUser(
  key: string,
  allowedUserIds: string[]
): boolean {
  const parts = key.split("/");
  if (parts[0] !== "surfboard" || parts.length < 3) return true; // legacy / unscoped key
  const folder = parts[1];
  if (FILE_TYPE_FOLDERS.has(folder)) return true; // unscoped, no owner folder
  return allowedUserIds.includes(folder);
}

/**
 * Record copies are stored under the plan number, not the owner's id:
 * `surfboard/<plan number>/redcopy/<file>` (I-023). That key proves ownership
 * when the folder is the plan's own number.
 */
export function isRedCopyKeyOfPlan(key: string, planNumber: string): boolean {
  if (!planNumber) return false;
  return key.startsWith(`surfboard/${planNumber}/redcopy/`);
}

/**
 * True for a link or key that points at our own storage (`surfboard/...`), so it
 * has to be opened through the file gateway. External links (e.g. Remita) are
 * left alone.
 */
export function isStorageFileRef(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^(?:https?:\/\/[^/]+\.amazonaws\.com\/|\/)?surfboard\//.test(value);
}
