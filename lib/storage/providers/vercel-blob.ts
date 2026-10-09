import { put, del } from "@vercel/blob";
import {
  StorageAdapter,
  StorageUploadInput,
  StorageUploadResult,
} from "../types";
import { buildStorageKey, extractKeyFromUrl, toBuffer } from "../utils";

export class VercelBlobStorageAdapter implements StorageAdapter {
  name = "vercel-blob" as const;

  async upload(input: StorageUploadInput): Promise<StorageUploadResult> {
    const buffer = await toBuffer(input.file);
    const key = buildStorageKey({
      userId: input.userId,
      fileType: input.fileType,
      fileName: input.fileName,
      planNumber: input.planNumber,
    });

    const blob = await put(key, buffer, {
      access: "public",
      contentType: input.contentType,
      addRandomSuffix: false,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    return {
      url: blob.url,
      key,
      originalName: input.fileName,
      provider: this.name,
    };
  }

  async getDownloadUrl(keyOrUrl: string): Promise<string> {
    // Vercel blob URLs are HTTPS CDN endpoints
    if (keyOrUrl.startsWith("http://") || keyOrUrl.startsWith("https://")) {
      return keyOrUrl;
    }
    // If only key provided, construct standard blob domain if known or return key
    return keyOrUrl;
  }

  async delete(keyOrUrl: string): Promise<boolean> {
    try {
      await del(keyOrUrl, {
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      return true;
    } catch (error) {
      console.error(`Vercel Blob delete error:`, error);
      return false;
    }
  }
}
