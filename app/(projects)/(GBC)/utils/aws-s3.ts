// src/lib/aws-s3.ts
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import sharp from "sharp";

// Validate required environment variables
const requiredEnvVars = [
  "REVA_AWS_REGION",
  "REVA_AWS_ACCESS_KEY_ID",
  "REVA_AWS_SECRET_ACCESS_KEY",
  "REVA_AWS_BUCKET_NAME",
] as const;

// Check for missing environment variables
const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error("Missing required environment variables:", missingEnvVars);
  throw new Error(
    `Missing required environment variables: ${missingEnvVars.join(", ")}`
  );
}

const s3Client = new S3Client({
  region: process.env.REVA_AWS_REGION,
  credentials: {
    accessKeyId: process.env.REVA_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.REVA_AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.REVA_AWS_BUCKET_NAME!;
const BUCKET_REGION = process.env.REVA_AWS_REGION!;

interface UploadOptions {
  file: Buffer;
  fileName: string;
  contentType: string;
  folder?: string;
  generateThumbnail?: boolean;
}

interface UploadResult {
  key: string;
  url: string;
  thumbnailKey?: string;
  thumbnailUrl?: string;
}

/**
 * Generate unique file name
 */
function generateFileName(originalName: string, folder?: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split(".").pop();
  const sanitizedName = originalName
    .replace(/[^a-zA-Z0-9.-]/g, "_")
    .toLowerCase();

  const fileName = `${timestamp}-${randomString}-${sanitizedName}`;

  return folder ? `GBC2/${folder}/${fileName}` : `GBC2/${fileName}`;
}

/**
 * Upload file to S3
 */
export async function uploadToS3(
  options: UploadOptions
): Promise<UploadResult> {
  try {
    const { file, fileName, contentType, folder, generateThumbnail } = options;

    if (!BUCKET_NAME) {
      throw new Error("S3 bucket name is not configured");
    }

    // Generate unique file name
    const key = generateFileName(fileName, folder);

    console.log("Uploading to S3:", {
      bucket: BUCKET_NAME,
      key,
      contentType,
      size: file.length,
    });

    // Upload main file
    const uploadCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: contentType,
      CacheControl: "max-age=31536000", // 1 year
    });

    await s3Client.send(uploadCommand);

    const fileUrl = `https://${BUCKET_NAME}.s3.${BUCKET_REGION}.amazonaws.com/${key}`;

    const result: UploadResult = { key, url: fileUrl };

    // Generate and upload thumbnail if requested
    if (generateThumbnail && contentType.startsWith("image/")) {
      try {
        const thumbnail = await sharp(file)
          .resize(300, 300, {
            fit: "cover",
            position: "center",
          })
          .jpeg({ quality: 80 })
          .toBuffer();

        const thumbnailKey = key.replace(/\.[^.]+$/, "-thumb.jpg");

        const thumbnailCommand = new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: thumbnailKey,
          Body: thumbnail,
          ContentType: "image/jpeg",
          CacheControl: "max-age=31536000",
        });

        await s3Client.send(thumbnailCommand);

        result.thumbnailKey = thumbnailKey;
        result.thumbnailUrl = `https://${BUCKET_NAME}.s3.${BUCKET_REGION}.amazonaws.com/${thumbnailKey}`;
      } catch (thumbError) {
        console.error("Error generating thumbnail:", thumbError);
        // Continue without thumbnail if generation fails
      }
    }

    return result;
  } catch (error) {
    console.error("S3 upload error:", error);
    throw new Error(
      `Failed to upload file to S3: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Delete file from S3
 */
export async function deleteFromS3(key: string): Promise<void> {
  try {
    const deleteCommand = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(deleteCommand);
  } catch (error) {
    console.error("S3 delete error:", error);
    throw new Error("Failed to delete file from S3");
  }
}

/**
 * Delete multiple files from S3
 */
export async function deleteMultipleFromS3(keys: string[]): Promise<void> {
  try {
    await Promise.all(keys.map((key) => deleteFromS3(key)));
  } catch (error) {
    console.error("S3 multiple delete error:", error);
    throw new Error("Failed to delete files from S3");
  }
}

/**
 * Check if file exists in S3
 */
export async function fileExistsInS3(key: string): Promise<boolean> {
  try {
    const headCommand = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(headCommand);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get signed URL for temporary access
 */
export async function getSignedS3Url(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    return signedUrl;
  } catch (error) {
    console.error("S3 signed URL error:", error);
    throw new Error("Failed to generate signed URL");
  }
}

/**
 * Upload sponsor/partner logo
 */
export async function uploadLogo(
  file: Buffer,
  fileName: string,
  type: "sponsor" | "partner"
): Promise<UploadResult> {
  // Optimize image
  const optimizedImage = await sharp(file)
    .resize(400, 400, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .png({ quality: 90 })
    .toBuffer();

  return uploadToS3({
    file: optimizedImage,
    fileName,
    contentType: "image/png",
    folder: `logos/${type}s`,
  });
}

/**
 * Upload speaker photo
 */
export async function uploadSpeakerPhoto(
  file: Buffer,
  fileName: string
): Promise<UploadResult> {
  // Optimize image
  const optimizedImage = await sharp(file)
    .resize(500, 500, {
      fit: "cover",
      position: "center",
    })
    .jpeg({ quality: 85 })
    .toBuffer();

  return uploadToS3({
    file: optimizedImage,
    fileName,
    contentType: "image/jpeg",
    folder: "speakers",
  });
}

/**
 * Upload gallery media
 */
export async function uploadGalleryMedia(
  file: Buffer,
  fileName: string,
  contentType: string
): Promise<UploadResult> {
  const isImage = contentType.startsWith("image/");

  if (isImage) {
    // Optimize image
    const optimizedImage = await sharp(file)
      .resize(1920, 1080, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 90 })
      .toBuffer();

    return uploadToS3({
      file: optimizedImage,
      fileName,
      contentType: "image/jpeg",
      folder: "gallery",
      generateThumbnail: true,
    });
  }

  // For videos, upload as-is
  return uploadToS3({
    file,
    fileName,
    contentType,
    folder: "gallery",
  });
}

/**
 * Upload QR code
 */
export async function uploadQRCode(
  qrCodeBuffer: Buffer,
  ticketNumber: string
): Promise<UploadResult> {
  return uploadToS3({
    file: qrCodeBuffer,
    fileName: `${ticketNumber}.png`,
    contentType: "image/png",
    folder: "qrcodes",
  });
}

/**
 * Get file size from S3
 */
export async function getFileSize(key: string): Promise<number> {
  try {
    const headCommand = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const response = await s3Client.send(headCommand);
    return response.ContentLength || 0;
  } catch (error) {
    console.error("S3 file size error:", error);
    return 0;
  }
}

/**
 * Upload from base64 string
 */
export async function uploadFromBase64(
  base64: string,
  fileName: string,
  folder?: string
): Promise<UploadResult> {
  // Extract content type and data
  const matches = base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);

  if (!matches || matches.length !== 3) {
    throw new Error("Invalid base64 string");
  }

  const contentType = matches[1];
  const data = matches[2];
  const buffer = Buffer.from(data, "base64");

  return uploadToS3({
    file: buffer,
    fileName,
    contentType,
    folder,
  });
}

/**
 * Bulk upload files
 */
export async function bulkUpload(
  files: Array<{
    file: Buffer;
    fileName: string;
    contentType: string;
    folder?: string;
  }>
): Promise<UploadResult[]> {
  try {
    const uploads = files.map((fileData) => uploadToS3(fileData));
    return await Promise.all(uploads);
  } catch (error) {
    console.error("Bulk upload error:", error);
    throw new Error("Failed to upload files");
  }
}
