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

export class SupabaseStorageAdapter implements StorageAdapter {
  name = "supabase" as const;
  private client: S3Client;
  private bucket: string;
  private projectUrl: string;

  constructor() {
    const projectUrl =
      process.env.SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      "";
    this.projectUrl = projectUrl.replace(/\/$/, "");

    const endpoint =
      process.env.SUPABASE_STORAGE_ENDPOINT ||
      (this.projectUrl ? `${this.projectUrl}/storage/v1/s3` : "");

    const accessKeyId =
      process.env.SUPABASE_STORAGE_ACCESS_KEY_ID ||
      process.env.SUPABASE_ACCESS_KEY_ID ||
      "";
    const secretAccessKey =
      process.env.SUPABASE_STORAGE_SECRET_ACCESS_KEY ||
      process.env.SUPABASE_SECRET_ACCESS_KEY ||
      "";
    this.bucket =
      process.env.SUPABASE_STORAGE_BUCKET_NAME ||
      process.env.SUPABASE_BUCKET_NAME ||
      "twonode-uploads";
    const region =
      process.env.SUPABASE_STORAGE_REGION ||
      process.env.SUPABASE_REGION ||
      "us-east-1";

    this.client = new S3Client({
      region,
      endpoint,
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

    const publicUrl = process.env.SUPABASE_STORAGE_PUBLIC_URL
      ? `${process.env.SUPABASE_STORAGE_PUBLIC_URL.replace(/\/$/, "")}/${this.bucket}/${key}`
      : this.projectUrl
      ? `${this.projectUrl}/storage/v1/object/public/${this.bucket}/${key}`
      : `${this.bucket}/${key}`;

    return {
      url: publicUrl,
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

    const fileUrl = this.projectUrl
      ? `${this.projectUrl}/storage/v1/object/public/${this.bucket}/${key}`
      : `${this.bucket}/${key}`;

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
      console.error(`Supabase Storage delete error for ${key}:`, error);
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
      console.error("Supabase Storage batch delete error:", error);
      return false;
    }
  }
}
