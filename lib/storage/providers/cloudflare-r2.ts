import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  StorageAdapter,
  StorageUploadInput,
  StorageUploadResult,
  StoragePresignedUploadResult,
  SurfboardFileType,
} from "../types";
import { buildStorageKey, extractKeyFromUrl, toBuffer } from "../utils";

export class CloudflareR2StorageAdapter implements StorageAdapter {
  name = "r2" as const;
  private client: S3Client;
  private bucket: string;
  private publicDomain: string;

  constructor() {
    const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID || "";
    const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || "";
    const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || "";
    this.bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME || "";
    this.publicDomain =
      process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN ||
      process.env.CLOUDFLARE_R2_CUSTOM_DOMAIN ||
      "";

    this.client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true,
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

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: input.contentType,
        Metadata: {
          originalName: input.fileName,
          fileType: input.fileType || "unknown",
          planNumber: input.planNumber || "unknown",
          uploadedAt: new Date().toISOString(),
          ...(input.metadata || {}),
        },
      })
    );

    const baseUrl = this.publicDomain
      ? `https://${this.publicDomain.replace(/^https?:\/\//, "")}`
      : `https://${this.bucket}.r2.cloudflarestorage.com`;
    const url = `${baseUrl}/${key}`;

    return {
      url,
      key,
      originalName: input.fileName,
      provider: this.name,
    };
  }

  async getPresignedUploadUrl(input: {
    fileType: SurfboardFileType;
    userId: string;
    fileName: string;
    contentType: string;
    planNumber?: string;
    expiresIn?: number;
  }): Promise<StoragePresignedUploadResult> {
    const key = buildStorageKey({
      userId: input.userId,
      fileType: input.fileType,
      fileName: input.fileName,
      planNumber: input.planNumber,
    });

    const uploadUrl = await getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: input.contentType,
      }),
      { expiresIn: input.expiresIn || 300 }
    );

    const baseUrl = this.publicDomain
      ? `https://${this.publicDomain.replace(/^https?:\/\//, "")}`
      : `https://${this.bucket}.r2.cloudflarestorage.com`;
    const fileUrl = `${baseUrl}/${key}`;

    return {
      uploadUrl,
      key,
      fileUrl,
      provider: this.name,
    };
  }

  async getDownloadUrl(keyOrUrl: string, expiresIn = 300): Promise<string> {
    const key = extractKeyFromUrl(keyOrUrl);
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
      { expiresIn }
    );
  }

  async delete(keyOrUrl: string): Promise<boolean> {
    const key = extractKeyFromUrl(keyOrUrl);
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );
      return true;
    } catch (error) {
      console.error(`Cloudflare R2 delete error for ${key}:`, error);
      return false;
    }
  }

  async deleteMultiple(items: Array<{ key?: string; url?: string }>): Promise<boolean> {
    const keys = items
      .map((item) => (item.key ? item.key : item.url ? extractKeyFromUrl(item.url) : null))
      .filter((k): k is string => !!k);

    if (keys.length === 0) return true;

    try {
      await this.client.send(
        new DeleteObjectsCommand({
          Bucket: this.bucket,
          Delete: {
            Objects: keys.map((Key) => ({ Key })),
            Quiet: false,
          },
        })
      );
      return true;
    } catch (error) {
      console.error("Cloudflare R2 batch delete error:", error);
      return false;
    }
  }
}
