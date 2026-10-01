import { S3Client, PutObjectCommand, DeleteObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "stream";

/**
 * Migrated from app/(projects)/(surfboard)/actions/awsActions.ts — the last
 * of the 4 shared-dependency files (planService.ts/profileService.ts both
 * import from here directly). uploadSameTypeSurfboardFilesToS3/
 * uploadMultipleSurfboardFilesToS3/__deleteMultipleSurfboardFilesFromS3WithUrl/
 * deletePlanFilesFromS3/_getUploadTargets/getUploadTargets/
 * buildSurfboardObjectKey/completeSurfboardUpload were NOT migrated —
 * grep-confirmed dead (zero call sites anywhere, including internally
 * within the source file itself).
 *
 * uploadSurfboardFileWithAuth/getSurfboardUploadTargetsMulti previously
 * resolved the user via getAuthenticatedSurfUserFromCookie() (the legacy
 * cookie); callers now pass userId explicitly instead, same pattern as
 * every other migrated service this phase.
 */

const s3 = new S3Client({
  region: process.env.SURFBOARD_AWS_REGION || process.env.REVA_AWS_REGION!,
  credentials: {
    accessKeyId: process.env.SURFBOARD_AWS_ACCESS_KEY_ID || process.env.REVA_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.SURFBOARD_AWS_SECRET_ACCESS_KEY || process.env.REVA_AWS_SECRET_ACCESS_KEY!,
  },
  endpoint: `https://s3.${process.env.SURFBOARD_AWS_REGION || process.env.REVA_AWS_REGION}.amazonaws.com`,
  forcePathStyle: true,
});
const REGION = process.env.SURFBOARD_AWS_REGION || process.env.REVA_AWS_REGION;
const BUCKET = process.env.SURFBOARD_AWS_BUCKET_NAME || (process.env.REVA_AWS_BUCKET_NAME as string);

export async function uploadSurfboardFileToS3(
  file: File,
  fileType: "pdf" | "cad" | "certificate" | "redcopy" | "viewer-attachment",
  userId: string,
  planNumber?: string,
  filename?: string
) {
  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    const uniqueSuffix = planNumber ? `${planNumber}__${Date.now()}` : `${Date.now()}__${Math.random().toString(36).substring(2, 15)}`;
    const prefix = userId ? `surfboard/${userId}/${fileType}` : `surfboard/${fileType}`;
    const key = `${prefix}/${uniqueSuffix}__${filename || file.name}`;

    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: file.type,
        Metadata: {
          originalName: file.name,
          fileType: fileType,
          planNumber: planNumber || "unknown",
          uploadedAt: new Date().toISOString(),
        },
      })
    );

    const fileUrl = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;

    return { url: fileUrl, key, originalName: file.name };
  } catch (error) {
    console.error(`Error uploading ${fileType} file to S3:`, error);
    throw new Error(`Failed to upload ${fileType} file to S3: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * A presigned PUT URL for the browser to upload directly to S3, bypassing
 * our own Vercel route handler entirely — Route Handlers (unlike Server
 * Actions) aren't covered by next.config.mjs's bodySizeLimit and sit behind
 * Vercel's platform-level ~4.5MB request body cap, which broke uploads of
 * real multi-MB survey report PDFs. Key format matches
 * uploadSurfboardFileToS3's exactly so both paths are interchangeable.
 */
export async function getPresignedUploadUrl(
  fileType: "pdf" | "cad" | "certificate" | "redcopy" | "viewer-attachment",
  userId: string,
  fileName: string,
  contentType: string,
  planNumber?: string
) {
  const uniqueSuffix = planNumber ? `${planNumber}__${Date.now()}` : `${Date.now()}__${Math.random().toString(36).substring(2, 15)}`;
  const prefix = userId ? `surfboard/${userId}/${fileType}` : `surfboard/${fileType}`;
  const key = `${prefix}/${uniqueSuffix}__${fileName}`;

  const uploadUrl = await getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType }),
    { expiresIn: 300 }
  );
  const fileUrl = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;

  return { uploadUrl, key, fileUrl };
}

export async function uploadSurfboardFileWithAuth(
  userId: string,
  file: File,
  fileType: "pdf" | "cad" | "certificate" | "redcopy",
  planNumber?: string
) {
  return uploadSurfboardFileToS3(file, fileType, userId, planNumber, file.name);
}

export async function deleteSurfboardFileFromS3(input: { key?: string; url?: string }) {
  const { key, url } = input;
  let objectKey = key;

  if (!objectKey && url) {
    const bucketName = process.env.SURFBOARD_AWS_BUCKET_NAME || process.env.REVA_AWS_BUCKET_NAME!;
    const region = process.env.SURFBOARD_AWS_REGION || process.env.REVA_AWS_REGION!;
    const bucketHost = `${bucketName}.s3.${region}.amazonaws.com/`;
    const idx = url.indexOf(bucketHost);
    if (idx === -1) throw new Error("Invalid S3 URL format");

    objectKey = url.substring(idx + bucketHost.length);
  }

  if (!objectKey) throw new Error("Missing key or valid url");

  try {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: process.env.SURFBOARD_AWS_BUCKET_NAME || process.env.REVA_AWS_BUCKET_NAME!,
        Key: objectKey,
      })
    );
  } catch (error) {
    console.error("Error deleting file from S3:", error);
    throw new Error(`Failed to delete file from S3: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export async function deleteMultipleSurfboardFilesFromS3(items: { key?: string; url?: string }[]) {
  const bucket = process.env.SURFBOARD_AWS_BUCKET_NAME || process.env.REVA_AWS_BUCKET_NAME!;
  const region = process.env.SURFBOARD_AWS_REGION || process.env.REVA_AWS_REGION!;
  const bucketHost = `${bucket}.s3.${region}.amazonaws.com/`;

  const keys = items
    .map(({ key, url }) => {
      if (key) return key;
      if (url) {
        const idx = url.indexOf(bucketHost);
        if (idx === -1) return null;
        return url.substring(idx + bucketHost.length);
      }
      return null;
    })
    .filter((k): k is string => !!k);

  if (keys.length === 0) throw new Error("No valid keys or URLs provided");

  try {
    await s3.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: false } }));
  } catch (error) {
    console.error("Error deleting multiple files from S3:", error);
    throw new Error(`Failed to delete files from S3: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export async function deleteMultipleSurfboardFilesFromS3WithUrl(
  files: Array<string | { url: string }>
): Promise<{ success: boolean; error?: string }> {
  try {
    const normalizedFiles = files.map((file) => ({ url: typeof file === "string" ? file : file.url }));
    const bucketName = process.env.SURFBOARD_AWS_BUCKET_NAME || process.env.REVA_AWS_BUCKET_NAME!;

    const deletePromises = normalizedFiles.map(({ url }) => {
      if (!url) return Promise.resolve();

      const urlObj = new URL(url);
      const key = urlObj.pathname.substring(1);

      return s3
        .send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }))
        .catch((error) => {
          console.error(`Failed to delete file ${key}:`, error);
        });
    });

    await Promise.all(deletePromises);
    return { success: true };
  } catch (error) {
    console.error("Error in deleteMultipleSurfboardFilesFromS3WithUrl:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export type UploadCategory = "cad" | "pdf" | "certificate";

export interface UploadTarget {
  key: string;
  url: string;
  publicUrl: string;
  uploadId?: string;
}

/** Create many presigned-style upload targets (uploads directly server-side, not truly presigned) for a multi-file plan submission. */
export async function getSurfboardUploadTargetsMulti(userId: string, formData: FormData): Promise<UploadTarget[]> {
  const planNumber = formData.get("planNumber") as string;
  const category = formData.get("category") as UploadCategory;

  if (!planNumber || !category) {
    throw new Error("Missing required fields: planNumber and category are required");
  }

  const files: { file: File; name: string; type: string }[] = [];
  let index = 0;

  while (formData.has(`file-${index}`)) {
    const file = formData.get(`file-${index}`) as File;
    const name = formData.get(`filename-${index}`) as string;
    const type = (formData.get(`filetype-${index}`) as string) || "application/octet-stream";

    if (file && name) {
      const decodedName = decodeURIComponent(name);
      files.push({ file, name: decodedName, type });
    }
    index++;
  }

  const targets: UploadTarget[] = [];

  for (let i = 0; i < files.length; i++) {
    const { file, name, type } = files[i];
    const extension = name.split(".").pop()?.toLowerCase() || "";

    let newFilename: string;
    const safePlanNumber = planNumber.replace(/\//g, "_");
    if (files.length === 1) {
      newFilename = `${safePlanNumber}.${extension}`;
    } else {
      newFilename = `${safePlanNumber}__${i + 1}.${extension}`;
    }

    const prefix = `surfboard/${userId}/${category}`;
    const key = `${prefix}/${newFilename}`.replace(/^\/+/, "").replace(/\/+/g, "/");

    try {
      const buffer = Buffer.from(await file.arrayBuffer());

      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: key,
          Body: buffer,
          ContentType: type,
          Metadata: {
            originalName: newFilename,
            fileType: category,
            planNumber: planNumber || "unknown",
            uploadedAt: new Date().toISOString(),
          },
        })
      );

      const publicUrl = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
      targets.push({ key, url: publicUrl, publicUrl });
    } catch (error) {
      console.error(`Error uploading file ${name}:`, error);
      throw new Error(`Failed to upload file ${name}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  return targets;
}

/** Uploads a file to S3 with proper type handling and metadata — accepts File, Buffer, or Readable. */
export async function uploadFile(
  file: File | Buffer | Readable,
  fileType: string,
  userId: string,
  planNumber?: string,
  filename?: string
): Promise<{ url: string; key: string; originalName: string }> {
  try {
    let fileBuffer: Buffer;
    let originalName = "file";
    let contentType = "application/octet-stream";

    if (file instanceof File) {
      originalName = file.name;
      contentType = file.type || contentType;
      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    } else if (file instanceof Buffer) {
      fileBuffer = file;
    } else if (file instanceof Readable) {
      const chunks: Buffer[] = [];
      for await (const chunk of file) {
        chunks.push(chunk);
      }
      fileBuffer = Buffer.concat(chunks as unknown as readonly Uint8Array[]);
    } else {
      throw new Error("Unsupported file type. Must be File, Buffer, or Readable");
    }

    const cleanName = (filename || originalName)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9\s._-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .toLowerCase();

    const uniqueSuffix = planNumber ? `${planNumber}__${Date.now()}` : `${Date.now()}__${Math.random().toString(36).substring(2, 8)}`;

    const prefix = `surfboard/${userId}/${fileType}`;
    const key = `${prefix}/${uniqueSuffix}__${cleanName}`.replace(/\/+/g, "/").replace(/^\/+/, "");

    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
        Metadata: {
          originalName: cleanName,
          fileType: fileType,
          planNumber: planNumber || "not-specified",
          uploadedAt: new Date().toISOString(),
          uploadedBy: userId,
        },
      })
    );

    const fileUrl = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;

    return { url: fileUrl, key, originalName: cleanName };
  } catch (error) {
    console.error("Error uploading file to S3:", error);
    throw new Error(`Failed to upload file to S3: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
