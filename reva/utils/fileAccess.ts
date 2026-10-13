// TASK-0011 Phase 2: rules for who may get a signed link to a REVA file.

/** Folders REVA writes to: current (`reva/uploads/`), new (`private/reva/`) and the legacy `uploads/`. */
const REVA_KEY = /^(?:reva\/|private\/reva\/|uploads\/)/;
const REVA_REF =
  /^(?:https?:\/\/[^/]+\.amazonaws\.com\/|\/)?(?:reva\/|private\/reva\/|uploads\/)/;

/** True for a storage key that sits in a REVA folder. */
export function isRevaStorageKey(key: string): boolean {
  return REVA_KEY.test(key);
}

/**
 * True for a link or key that points at a REVA file in our storage, so it has
 * to be opened through the REVA file gateway. External links are left alone.
 */
export function isRevaFileRef(value: string | null | undefined): boolean {
  return !!value && REVA_REF.test(value);
}

/**
 * A requester may open only the site photos of their own requests. Documents
 * and the report stay behind the emailed one-time code, so they are not
 * listed here.
 */
export function ownSitePhotoMatches(
  key: string,
  ownedPhotoKeys: string[]
): boolean {
  return ownedPhotoKeys.includes(key);
}
