import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import {
  StorageAdapter,
  StorageUploadInput,
  StorageUploadResult,
} from "../types";
import { buildStorageKey, extractKeyFromUrl, toBuffer } from "../utils";

export class CloudinaryStorageAdapter implements StorageAdapter {
  name = "cloudinary" as const;

  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
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

    const isPdf =
      input.contentType === "application/pdf" ||
      input.fileName.toLowerCase().endsWith(".pdf");

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          public_id: key,
          resource_type: isPdf ? "raw" : "auto",
          type: "authenticated", // Keep files private by default
          tags: [input.fileType || "surfboard", input.userId || "anonymous"],
        },
        (error, res) => {
          if (error || !res) {
            reject(error || new Error("Cloudinary upload failed"));
          } else {
            resolve(res);
          }
        }
      );
      uploadStream.end(buffer);
    });

    return {
      url: result.secure_url,
      key: result.public_id,
      originalName: input.fileName,
      provider: this.name,
    };
  }

  async getDownloadUrl(keyOrUrl: string, expiresIn = 300): Promise<string> {
    const publicId = extractKeyFromUrl(keyOrUrl);
    const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;

    // Generate authenticated signed URL with expiry
    const signedUrl = cloudinary.utils.private_download_url(publicId, "", {
      expires_at: expiresAt,
      resource_type: "raw",
      type: "authenticated",
    });

    return signedUrl || keyOrUrl;
  }

  async delete(keyOrUrl: string): Promise<boolean> {
    const publicId = extractKeyFromUrl(keyOrUrl);
    try {
      await cloudinary.uploader.destroy(publicId, {
        resource_type: "raw",
        type: "authenticated",
      });
      return true;
    } catch (error) {
      console.error(`Cloudinary delete error for ${publicId}:`, error);
      return false;
    }
  }
}
