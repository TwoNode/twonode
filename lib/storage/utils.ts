import path from "path";
import { Readable } from "stream";

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
    ? `${planNumber.replace(/\//g, "_")}__${Date.now()}`
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
