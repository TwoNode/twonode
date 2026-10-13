import { Readable } from "stream";
import { getStorageProvider, extractKeyFromUrl } from "@/lib/storage/index";
import { planNumberToKeySegment } from "@/surfboard/utils/planNumber";

/**
 * Storage Service for Surfboard
 * 
 * Delegates file storage operations (upload, presigned URLs, private signed download URLs, deletions)
 * to the pluggable storage provider configured via `STORAGE_PROVIDER` or `SURFBOARD_STORAGE_PROVIDER`:
 * - 's3' (AWS S3)
 * - 'cloudflare' / 'r2' (Cloudflare R2)
 * - 'minio' (MinIO S3-compatible self-hosted storage)
 * - 'supabase' (Supabase Storage S3-compatible API)
 * - 'cloudinary'
 * - 'vercel-blob'
 * - 'imagekit'
 * - 'local' (Local filesystem for offline development)
 */

export async function uploadSurfboardFileToS3(
  file: File,
  fileType: "pdf" | "cad" | "certificate" | "redcopy" | "viewer-attachment",
  userId: string,
  planNumber?: string,
  filename?: string
) {
  try {
    const provider = getStorageProvider();
    const result = await provider.upload({
      file,
      fileName: filename || file.name,
      contentType: file.type || "application/octet-stream",
      userId,
      planNumber,
      fileType,
    });

    return {
      url: result.url,
      key: result.key,
      originalName: result.originalName,
    };
  } catch (error) {
    console.error(`Error uploading ${fileType} file to storage:`, error);
    throw new Error(
      `Failed to upload ${fileType} file to storage: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * A presigned upload URL for direct browser uploads.
 * If the active provider does not support presigned uploads, falls back to S3 provider.
 */
export async function getPresignedUploadUrl(
  fileType: "pdf" | "cad" | "certificate" | "redcopy" | "viewer-attachment",
  userId: string,
  fileName: string,
  contentType: string,
  planNumber?: string
) {
  const provider = getStorageProvider();
  if (provider.getPresignedUploadUrl) {
    return provider.getPresignedUploadUrl({
      fileType,
      userId,
      fileName,
      contentType,
      planNumber,
    });
  }

  // Fallback to S3 provider if current provider doesn't support direct presigned upload
  const s3Provider = getStorageProvider("s3");
  if (s3Provider.getPresignedUploadUrl) {
    return s3Provider.getPresignedUploadUrl({
      fileType,
      userId,
      fileName,
      contentType,
      planNumber,
    });
  }

  throw new Error(`Presigned upload URL not supported for provider ${provider.name}`);
}

/**
 * Generates a short-lived, secure signed URL for viewing or downloading private files.
 */
export async function getPresignedDownloadUrl(
  keyOrUrl: string,
  expiresIn = 300,
  options?: { downloadName?: string }
): Promise<string> {
  const provider = getStorageProvider();
  return provider.getDownloadUrl(keyOrUrl, expiresIn, options);
}

/**
 * Extracts a storage key from a full URL or relative path.
 */
export function extractS3KeyFromUrl(rawUrl: string): string {
  return extractKeyFromUrl(rawUrl);
}

export async function uploadSurfboardFileWithAuth(
  userId: string,
  file: File,
  fileType: "pdf" | "cad" | "certificate" | "redcopy",
  planNumber?: string
) {
  return uploadSurfboardFileToS3(file, fileType, userId, planNumber, file.name);
}

export async function deleteSurfboardFileFromS3(input: {
  key?: string;
  url?: string;
}) {
  const { key, url } = input;
  const target = key || url;
  if (!target) throw new Error("Missing key or valid url");

  const provider = getStorageProvider();
  const ok = await provider.delete(target);
  if (!ok) {
    throw new Error(`Failed to delete file from storage: ${target}`);
  }
}

export async function deleteMultipleSurfboardFilesFromS3(
  items: { key?: string; url?: string }[]
) {
  const provider = getStorageProvider();
  if (provider.deleteMultiple) {
    const ok = await provider.deleteMultiple(items);
    if (!ok) throw new Error("Failed to delete files from storage");
    return;
  }

  for (const item of items) {
    const target = item.key || item.url;
    if (target) await provider.delete(target);
  }
}

export async function deleteMultipleSurfboardFilesFromS3WithUrl(
  files: Array<string | { url: string }>
): Promise<{ success: boolean; error?: string }> {
  try {
    const provider = getStorageProvider();
    const items = files.map((file) => ({
      url: typeof file === "string" ? file : file.url,
    }));

    if (provider.deleteMultiple) {
      await provider.deleteMultiple(items);
    } else {
      for (const item of items) {
        if (item.url) await provider.delete(item.url);
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Error in deleteMultipleSurfboardFilesFromS3WithUrl:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export type UploadCategory = "cad" | "pdf" | "certificate";

export interface UploadTarget {
  key: string;
  url: string;
  publicUrl: string;
  uploadId?: string;
}

/** Create upload targets for a multi-file plan submission. */
export async function getSurfboardUploadTargetsMulti(
  userId: string,
  formData: FormData
): Promise<UploadTarget[]> {
  const planNumber = formData.get("planNumber") as string;
  const category = formData.get("category") as UploadCategory;

  if (!planNumber || !category) {
    throw new Error(
      "Missing required fields: planNumber and category are required"
    );
  }

  const files: { file: File; name: string; type: string }[] = [];
  let index = 0;

  while (formData.has(`file-${index}`)) {
    const file = formData.get(`file-${index}`) as File;
    const name = formData.get(`filename-${index}`) as string;
    const type =
      (formData.get(`filetype-${index}`) as string) ||
      "application/octet-stream";

    if (file && name) {
      const decodedName = decodeURIComponent(name);
      files.push({ file, name: decodedName, type });
    }
    index++;
  }

  const provider = getStorageProvider();
  const targets: UploadTarget[] = [];

  for (let i = 0; i < files.length; i++) {
    const { file, name, type } = files[i];
    const extension = name.split(".").pop()?.toLowerCase() || "";

    let newFilename: string;
    const safePlanNumber = planNumberToKeySegment(planNumber);
    if (files.length === 1) {
      newFilename = `${safePlanNumber}.${extension}`;
    } else {
      newFilename = `${safePlanNumber}__${i + 1}.${extension}`;
    }

    const uploadRes = await provider.upload({
      file,
      fileName: newFilename,
      contentType: type,
      userId,
      planNumber,
      fileType: category,
    });

    targets.push({
      key: uploadRes.key,
      url: uploadRes.url,
      publicUrl: uploadRes.url,
    });
  }

  return targets;
}

/** Uploads a file with proper type handling and metadata — accepts File, Buffer, or Readable. */
export async function uploadFile(
  file: File | Buffer | Readable,
  fileType: string,
  userId: string,
  planNumber?: string,
  filename?: string
): Promise<{ url: string; key: string; originalName: string }> {
  const provider = getStorageProvider();
  const originalName =
    filename || (file instanceof File ? file.name : "file");
  const contentType =
    file instanceof File ? file.type || "application/octet-stream" : "application/octet-stream";

  const res = await provider.upload({
    file,
    fileName: originalName,
    contentType,
    userId,
    planNumber,
    fileType,
  });

  return {
    url: res.url,
    key: res.key,
    originalName: res.originalName,
  };
}
