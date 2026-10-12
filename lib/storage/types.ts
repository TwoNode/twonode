import { Readable } from "stream";

export type StorageProviderName =
  | "s3"
  | "cloudflare"
  | "r2"
  | "minio"
  | "supabase"
  | "cloudinary"
  | "vercel-blob"
  | "imagekit"
  | "local";

export type SurfboardFileType =
  | "pdf"
  | "cad"
  | "certificate"
  | "redcopy"
  | "viewer-attachment"
  | string;

export interface StorageUploadInput {
  file: File | Buffer | Uint8Array | Readable;
  fileName: string;
  contentType: string;
  userId?: string;
  planNumber?: string;
  fileType?: SurfboardFileType;
  metadata?: Record<string, string>;
}

export interface StorageUploadResult {
  url: string;
  key: string;
  originalName: string;
  provider: StorageProviderName;
}

export interface StoragePresignedUploadResult {
  uploadUrl: string;
  key: string;
  fileUrl: string;
  provider: StorageProviderName;
}

export interface StorageAdapter {
  name: StorageProviderName;

  /**
   * Upload a file buffer or stream directly to the target storage provider.
   */
  upload(input: StorageUploadInput): Promise<StorageUploadResult>;

  /**
   * Get a presigned upload URL for direct browser uploads (where supported).
   */
  getPresignedUploadUrl?(input: {
    fileType: SurfboardFileType;
    userId: string;
    fileName: string;
    contentType: string;
    planNumber?: string;
    expiresIn?: number;
  }): Promise<StoragePresignedUploadResult>;

  /**
   * Get a secure, signed temporary download/view URL with expiration.
   */
  /**
   * A short-lived signed link. `options.downloadName` asks the provider to
   * make the browser download the file under that name instead of showing it
   * (honoured by the S3 provider; others ignore it).
   */
  getDownloadUrl(
    keyOrUrl: string,
    expiresIn?: number,
    options?: { downloadName?: string }
  ): Promise<string>;

  /**
   * Delete an object from storage by key or canonical URL.
   */
  delete(keyOrUrl: string): Promise<boolean>;

  /**
   * Delete multiple objects in batch.
   */
  deleteMultiple?(items: Array<{ key?: string; url?: string }>): Promise<boolean>;
}
