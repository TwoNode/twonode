import path from "path";
import { Readable } from "stream";
import { planNumberToKeySegment } from "@/surfboard/utils/planNumber";

/**
 * Standardize an S3/storage key for a file upload across all providers.
 */
export function buildStorageKey(input: {
  userId?: string;
  fileType?: string;
  fileName: string;
  planNumber?: string;
}): string {
  const { userId, fileType = "general", fileName, planNumber } = input;

  const cleanName = fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s._-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();

  const uniqueSuffix = planNumber
    ? `${planNumberToKeySegment(planNumber)}__${Date.now()}`
    : `${Date.now()}__${Math.random().toString(36).substring(2, 12)}`;

  const prefix = userId
    ? `surfboard/${userId}/${fileType}`
    : `surfboard/${fileType}`;

  return `${prefix}/${uniqueSuffix}__${cleanName}`
    .replace(/\/+/g, "/")
    .replace(/^\/+/, "");
}

/**
 * Resolves a storage key under a base folder and throws if the result would
 * land outside it (for example a key containing "../").
 */
export function resolveWithin(baseDir: string, key: string): string {
  const base = path.resolve(baseDir);
  const target = path.resolve(base, key);
  if (target !== base && !target.startsWith(base + path.sep)) {
    throw new Error("Invalid storage key");
  }
  return target;
}

/**
 * Converts a File, Buffer, Uint8Array, or Readable into a Node Buffer.
 */
export async function toBuffer(
  input: File | Buffer | Uint8Array | Readable
): Promise<Buffer> {
  if (Buffer.isBuffer(input)) return input;
  if (input instanceof Uint8Array) return Buffer.from(input);

  if (typeof (input as File).arrayBuffer === "function") {
    const arrayBuffer = await (input as File).arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  if (input instanceof Readable) {
    const chunks: Buffer[] = [];
    for await (const chunk of input) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  throw new Error("Unsupported file input format");
}

/**
 * Extracts a storage key from a full URL or returns the key if already relative.
 */
export function extractKeyFromUrl(keyOrUrl: string): string {
  if (!keyOrUrl) return "";
  if (!keyOrUrl.startsWith("http://") && !keyOrUrl.startsWith("https://")) {
    return keyOrUrl.replace(/^\/+/, "");
  }

  try {
    const parsed = new URL(keyOrUrl);
    // Pathname starts with '/', strip it
    return decodeURIComponent(parsed.pathname.substring(1));
  } catch {
    return keyOrUrl;
  }
}

/**
 * A `Content-Disposition: attachment` header value for a download, safe for any
 * file name: an ASCII fallback plus the UTF-8 form (RFC 5987).
 */
export function attachmentDisposition(fileName: string): string {
  const clean = fileName
    .replace(/[\u0000-\u001f\u007f"\\/]/g, "")
    .trim()
    .slice(0, 180);
  const name = clean || "download";
  const ascii = name.replace(/[^\x20-\x7e]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

const PLAN_FILE_TYPES = new Set(["pdf", "cad", "certificate", "redcopy"]);

/** True for the upload kinds that are named after their plan (not attachments). */
export function isPlanFileType(fileType: string | undefined): boolean {
  return !!fileType && PLAN_FILE_TYPES.has(fileType);
}

/**
 * The key for a plan's file: `surfboard/<userId>/<type>/<PLAN_NUMBER>.<ext>`,
 * and `<PLAN_NUMBER>_2.<ext>`, `_3`... when that name is taken (`attempt` 1 is
 * the plain name). The plan number is the shared canonical form with `/` as `_`.
 */
export function buildPlanFileKey(input: {
  userId: string;
  fileType: string;
  planNumber: string;
  fileName: string;
  attempt?: number;
}): string {
  const dot = input.fileName.lastIndexOf(".");
  const rawExt = dot > 0 ? input.fileName.slice(dot + 1) : "";
  const ext = rawExt.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
  const base = planNumberToKeySegment(input.planNumber) || "file";
  const n = input.attempt ?? 1;
  return `surfboard/${input.userId}/${input.fileType}/${base}${n > 1 ? `_${n}` : ""}${ext ? `.${ext}` : ""}`;
}

/**
 * Writes a file under the first free name, never replacing an earlier file:
 * `put` must fail with an error `isTaken` recognises when the key exists
 * (S3: `IfNoneMatch: "*"`), and the next name is tried.
 */
export async function putUnderFreeName(
  build: (attempt: number) => string,
  put: (key: string) => Promise<void>,
  isTaken: (error: unknown) => boolean,
  maxAttempts = 50
): Promise<string> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const key = build(attempt);
    try {
      await put(key);
      return key;
    } catch (error) {
      if (!isTaken(error)) throw error;
    }
  }
  throw new Error("Could not find a free file name");
}
