import fs from "fs/promises";
import path from "path";
import {
  StorageAdapter,
  StorageUploadInput,
  StorageUploadResult,
} from "../types";
import { buildStorageKey, extractKeyFromUrl, toBuffer } from "../utils";

export class LocalStorageAdapter implements StorageAdapter {
  name = "local" as const;
  private uploadDir: string;
  private baseUrl: string;

  constructor() {
    // Default to public/uploads so dev server can serve directly or via proxy
    this.uploadDir = path.join(process.cwd(), "public", "uploads");
    this.baseUrl = "/uploads";
  }

  async upload(input: StorageUploadInput): Promise<StorageUploadResult> {
    const buffer = await toBuffer(input.file);
    const key = buildStorageKey({
      userId: input.userId,
      fileType: input.fileType,
      fileName: input.fileName,
      planNumber: input.planNumber,
    });

    const targetPath = path.join(this.uploadDir, key);
    const targetDir = path.dirname(targetPath);

    await fs.mkdir(targetDir, { recursive: true });
    await fs.writeFile(targetPath, buffer);

    const url = `${this.baseUrl}/${key}`;
    return {
      url,
      key,
      originalName: input.fileName,
      provider: this.name,
    };
  }

  async getDownloadUrl(keyOrUrl: string): Promise<string> {
    const key = extractKeyFromUrl(keyOrUrl);
    // In local dev, serve from /uploads or via proxy
    if (keyOrUrl.startsWith("http://") || keyOrUrl.startsWith("https://")) {
      return keyOrUrl;
    }
    return `${this.baseUrl}/${key}`;
  }

  async delete(keyOrUrl: string): Promise<boolean> {
    const key = extractKeyFromUrl(keyOrUrl);
    const targetPath = path.join(this.uploadDir, key);
    try {
      await fs.unlink(targetPath);
      return true;
    } catch (error: any) {
      if (error?.code !== "ENOENT") {
        console.error(`Local file delete error for ${targetPath}:`, error);
      }
      return false;
    }
  }

  async deleteMultiple(items: Array<{ key?: string; url?: string }>): Promise<boolean> {
    for (const item of items) {
      const keyOrUrl = item.key || item.url;
      if (keyOrUrl) await this.delete(keyOrUrl);
    }
    return true;
  }
}
