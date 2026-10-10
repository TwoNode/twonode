import ImageKit from "imagekit";
import {
  StorageAdapter,
  StorageUploadInput,
  StorageUploadResult,
} from "../types";
import { buildStorageKey, extractKeyFromUrl, toBuffer } from "../utils";

export class ImageKitStorageAdapter implements StorageAdapter {
  name = "imagekit" as const;
  private ik: ImageKit;
  private urlEndpoint: string;

  constructor() {
    this.urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT || "https://ik.imagekit.io/dummy";
    this.ik = new ImageKit({
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY || "dummy_public_key",
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "dummy_private_key",
      urlEndpoint: this.urlEndpoint,
    });
  }

  async upload(input: StorageUploadInput): Promise<StorageUploadResult> {
    const buffer = await toBuffer(input.file);
    const key = buildStorageKey({
      userId: input.userId,
      fileType: input.fileType,
      fileName: input.fileName,
      planNumber: input.planNumber,
    });

    const folder = input.userId
      ? `/surfboard/${input.userId}/${input.fileType || "general"}`
      : `/surfboard/${input.fileType || "general"}`;

    const res = await this.ik.upload({
      file: buffer,
      fileName: key.split("/").pop() || input.fileName,
      folder,
      useUniqueFileName: false,
    });

    return {
      url: res.url,
      key: res.filePath.replace(/^\/+/, ""),
      originalName: input.fileName,
      provider: this.name,
    };
  }

  async getDownloadUrl(keyOrUrl: string, expiresIn = 300): Promise<string> {
    const key = extractKeyFromUrl(keyOrUrl);
    return this.ik.url({
      path: key.startsWith("/") ? key : `/${key}`,
      signed: true,
      expireSeconds: expiresIn,
    });
  }

  async delete(keyOrUrl: string): Promise<boolean> {
    const key = extractKeyFromUrl(keyOrUrl);
    try {
      // Find file ID by name / path then delete
      const files = await this.ik.listFiles({
        searchQuery: `name = "${key.split("/").pop()}"`,
        limit: 1,
      });

      if (files && files.length > 0) {
        const fileObj = files[0];
        if ("fileId" in fileObj && typeof fileObj.fileId === "string") {
          await this.ik.deleteFile(fileObj.fileId);
        }
      }
      return true;
    } catch (error) {
      console.error(`ImageKit delete error for ${key}:`, error);
      return false;
    }
  }
}
