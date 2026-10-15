// src/lib/aws-s3.ts
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PhotonImage, SamplingFilter, crop, resize } from "@cf-wasm/photon";
import { gbcPublicKey, gbcQrCodeKey } from "@/gbc/utils/storageKeys";

// Validate required environment variables
const requiredEnvVars = [
  "AWS_REGION",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_BUCKET_NAME",
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
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.AWS_BUCKET_NAME!;
const BUCKET_REGION = process.env.AWS_REGION!;

/**
 * Resize to exactly targetW x targetH, cropping the excess on the longer
 * axis (center) first — equivalent to sharp's `fit: "cover", position: "center"`.
 * Frees any intermediate crop; caller is responsible for freeing `src` and
 * the returned image.
 */
function resizeCover(
  src: PhotonImage,
  targetW: number,
  targetH: number
): PhotonImage {
  const srcW = src.get_width();
  const srcH = src.get_height();
  const srcAspect = srcW / srcH;
  const targetAspect = targetW / targetH;

  let region = src;
  let croppedRegion: PhotonImage | null = null;

  if (srcAspect > targetAspect) {
    const cropW = Math.max(1, Math.round(srcH * targetAspect));
    const x1 = Math.floor((srcW - cropW) / 2);
    croppedRegion = crop(src, x1, 0, x1 + cropW, srcH);
    region = croppedRegion;
  } else if (srcAspect < targetAspect) {
    const cropH = Math.max(1, Math.round(srcW / targetAspect));
    const y1 = Math.floor((srcH - cropH) / 2);
    croppedRegion = crop(src, 0, y1, srcW, y1 + cropH);
    region = croppedRegion;
  }

  const resized = resize(region, targetW, targetH, SamplingFilter.Lanczos3);
  croppedRegion?.free();
  return resized;
}

/**
 * Scale down to fit within targetW x targetH, preserving aspect ratio and
 * never upscaling — equivalent to sharp's `fit: "inside", withoutEnlargement: true`.
 * Caller is responsible for freeing `src` and the returned image.
 */
function resizeInside(
  src: PhotonImage,
  targetW: number,
  targetH: number
): PhotonImage {
  const srcW = src.get_width();
  const srcH = src.get_height();
  const scale = Math.min(targetW / srcW, targetH / srcH, 1);
  const newW = Math.max(1, Math.round(srcW * scale));
  const newH = Math.max(1, Math.round(srcH * scale));
  return resize(src, newW, newH, SamplingFilter.Lanczos3);
}

function processImageCover(
  file: Buffer,
  width: number,
  height: number
): PhotonImage {
  const src = PhotonImage.new_from_byteslice(new Uint8Array(file));
  const output = resizeCover(src, width, height);
  src.free();
  return output;
}

function processImageInside(
  file: Buffer,
  width: number,
  height: number
): PhotonImage {
  const src = PhotonImage.new_from_byteslice(new Uint8Array(file));
  const output = resizeInside(src, width, height);
  src.free();
  return output;
}

interface UploadOptions {
  file: Buffer;
  fileName: string;
  contentType: string;
  folder?: string;
  /** Edition the file belongs to; needed for a public file when no full `key` is given. */
  edition?: string;
  /** Full key, when the file does not belong under `public/gbc/<edition>/<folder>/` (QR codes). */
  key?: string;
  generateThumbnail?: boolean;
}

interface UploadResult {
  key: string;
  url: string;
  thumbnailKey?: string;
  thumbnailUrl?: string;
}

/**
 * Upload file to S3
 */
export async function uploadToS3(
  options: UploadOptions
): Promise<UploadResult> {
  try {
    const { file, fileName, contentType, folder, edition, generateThumbnail } =
      options;

    if (!BUCKET_NAME) {
      throw new Error("S3 bucket name is not configured");
    }

    // Generate unique file name
    if (!options.key && !(edition && folder)) {
      throw new Error("A public GBC upload needs an edition and a folder");
    }
    const key = options.key ?? gbcPublicKey(edition!, folder!, fileName);

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
        const thumbnailImage = processImageCover(file, 300, 300);
        const thumbnail = Buffer.from(thumbnailImage.get_bytes_jpeg(80));
        thumbnailImage.free();

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
  expiresIn: number = 3600,
  options: { downloadName?: string } = {}
): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ...(options.downloadName
        ? {
            ResponseContentDisposition: `attachment; filename="${options.downloadName.replace(/[^\w.\- ]/g, "_")}"`,
          }
        : {}),
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
  type: "sponsor" | "partner",
  edition: string
): Promise<UploadResult> {
  // Optimize image
  const resizedImage = processImageInside(file, 400, 400);
  const optimizedImage = Buffer.from(resizedImage.get_bytes());
  resizedImage.free();

  return uploadToS3({
    file: optimizedImage,
    fileName,
    contentType: "image/png",
    folder: `logos/${type}s`,
    edition,
  });
}

/**
 * Upload speaker photo
 */
export async function uploadSpeakerPhoto(
  file: Buffer,
  fileName: string,
  edition: string
): Promise<UploadResult> {
  // Optimize image
  const resizedImage = processImageCover(file, 500, 500);
  const optimizedImage = Buffer.from(resizedImage.get_bytes_jpeg(85));
  resizedImage.free();

  return uploadToS3({
    file: optimizedImage,
    fileName,
    contentType: "image/jpeg",
    folder: "speakers",
    edition,
  });
}

/**
 * Upload gallery media
 */
export async function uploadGalleryMedia(
  file: Buffer,
  fileName: string,
  contentType: string,
  edition: string
): Promise<UploadResult> {
  const isImage = contentType.startsWith("image/");

  if (isImage) {
    // Optimize image
    const resizedImage = processImageInside(file, 1920, 1080);
    const optimizedImage = Buffer.from(resizedImage.get_bytes_jpeg(90));
    resizedImage.free();

    return uploadToS3({
      file: optimizedImage,
      fileName,
      contentType: "image/jpeg",
      folder: "gallery",
      edition,
      generateThumbnail: true,
    });
  }

  // For videos, upload as-is
  return uploadToS3({
    file,
    fileName,
    contentType,
    folder: "gallery",
    edition,
  });
}

/**
 * Upload QR code
 */
export async function uploadQRCode(
  qrCodeBuffer: Buffer,
  ticketNumber: string,
  edition: string
): Promise<UploadResult> {
  return uploadToS3({
    file: qrCodeBuffer,
    fileName: `${ticketNumber}.png`,
    contentType: "image/png",
    key: gbcQrCodeKey(edition, ticketNumber),
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
  folder?: string,
  edition?: string
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
    edition,
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
    edition?: string;
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
