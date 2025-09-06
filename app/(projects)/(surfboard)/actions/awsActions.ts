"use server";

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

const s3 = new S3Client({
  region: process.env.SURFBOARD_AWS_REGION || process.env.REVA_AWS_REGION!,
  credentials: {
    accessKeyId:
      process.env.SURFBOARD_AWS_ACCESS_KEY_ID ||
      process.env.REVA_AWS_ACCESS_KEY_ID!,
    secretAccessKey:
      process.env.SURFBOARD_AWS_SECRET_ACCESS_KEY ||
      process.env.REVA_AWS_SECRET_ACCESS_KEY!,
  },
  endpoint: `https://s3.${
    process.env.SURFBOARD_AWS_REGION || process.env.REVA_AWS_REGION
  }.amazonaws.com`,
  forcePathStyle: true,
});
const REGION = process.env.SURFBOARD_AWS_REGION || process.env.REVA_AWS_REGION;
const BUCKET =
  process.env.SURFBOARD_AWS_BUCKET_NAME ||
  (process.env.REVA_AWS_BUCKET_NAME as string);

export async function uploadSurfboardFileToS3(
  file: File,
  fileType: "pdf" | "cad" | "certificate" | "redcopy",
  userId: string,
  planNumber?: string,
  filename?: string
) {
  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    const uniqueSuffix = planNumber
      ? `${planNumber}__${Date.now()}`
      : `${Date.now()}__${Math.random().toString(36).substring(2, 15)}`;
    const prefix = userId
      ? `surfboard/${userId}/${fileType}`
      : `surfboard/${fileType}`;
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

    return {
      url: fileUrl,
      key: key,
      originalName: file.name,
    };
  } catch (error) {
    console.error(`Error uploading ${fileType} file to S3:`, error);
    throw new Error(
      `Failed to upload ${fileType} file to S3: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

export async function uploadSameTypeSurfboardFilesToS3(
  files: { file: File }[],
  userId: string,
  fileType: "pdf" | "cad" | "certificate",
  planNumber?: string
) {
  const uploadPromises = files.map(({ file }, index) =>
    uploadSurfboardFileToS3(
      file,
      fileType,
      userId,
      index == 0 ? planNumber : `${planNumber}__${index}`,
      file.name
    )
  );

  try {
    const results = await Promise.all(uploadPromises);
    return results;
  } catch (error) {
    console.error("Error uploading multiple files to S3:", error);
    throw new Error(
      `Failed to upload files to S3: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

export async function uploadMultipleSurfboardFilesToS3(
  files: { file: File; type: "pdf" | "cad" | "certificate" }[],
  userId: string,
  planNumber?: string
) {
  const uploadPromises = files.map(({ file, type }) =>
    uploadSurfboardFileToS3(file, type, userId, planNumber, file.name)
  );

  try {
    const results = await Promise.all(uploadPromises);
    return results;
  } catch (error) {
    console.error("Error uploading multiple files to S3:", error);
    throw new Error(
      `Failed to upload files to S3: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

export async function deleteSurfboardFileFromS3(input: {
  key?: string;
  url?: string;
}) {
  const { key, url } = input;

  let objectKey = key;

  if (!objectKey && url) {
    const bucketName =
      process.env.SURFBOARD_AWS_BUCKET_NAME ||
      process.env.REVA_AWS_BUCKET_NAME!;
    const region =
      process.env.SURFBOARD_AWS_REGION || process.env.REVA_AWS_REGION!;
    const bucketHost = `${bucketName}.s3.${region}.amazonaws.com/`;
    const idx = url.indexOf(bucketHost);
    if (idx === -1) throw new Error("Invalid S3 URL format");

    objectKey = url.substring(idx + bucketHost.length);
  }

  if (!objectKey) throw new Error("Missing key or valid url");

  try {
    await s3.send(
      new DeleteObjectCommand({
        Bucket:
          process.env.SURFBOARD_AWS_BUCKET_NAME ||
          process.env.REVA_AWS_BUCKET_NAME!,
        Key: objectKey,
      })
    );
  } catch (error) {
    console.error("Error deleting file from S3:", error);
    throw new Error(
      `Failed to delete file from S3: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

export async function deleteMultipleSurfboardFilesFromS3(
  items: { key?: string; url?: string }[]
) {
  const bucket =
    process.env.SURFBOARD_AWS_BUCKET_NAME || process.env.REVA_AWS_BUCKET_NAME!;
  const region =
    process.env.SURFBOARD_AWS_REGION || process.env.REVA_AWS_REGION!;
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
    await s3.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: keys.map((Key) => ({ Key })),
          Quiet: false,
        },
      })
    );
  } catch (error) {
    console.error("Error deleting multiple files from S3:", error);
    throw new Error(
      `Failed to delete files from S3: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

export async function deleteMultipleSurfboardFilesFromSS3(
  files: { url: string }[]
): Promise<void> {
  try {
    const deletePromises = files.map(({ url }) => {
      if (!url) return Promise.resolve();

      const bucketName =
        process.env.SURFBOARD_AWS_BUCKET_NAME ||
        process.env.REVA_AWS_BUCKET_NAME!;
      const region =
        process.env.SURFBOARD_AWS_REGION || process.env.REVA_AWS_REGION!;

      // Extract the key from the URL
      const urlObj = new URL(url);
      const key = urlObj.pathname.substring(1); // Remove leading '/'

      return s3
        .send(
          new DeleteObjectCommand({
            Bucket: bucketName,
            Key: key,
          })
        )
        .catch((error) => {
          console.error(`Failed to delete file ${key}:`, error);
          // Continue with other deletions even if one fails
        });
    });

    await Promise.all(deletePromises);
  } catch (error) {
    console.error("Error in deleteMultipleSurfboardFilesFromSS3:", error);
    // Don't rethrow to allow the main error to be handled by the caller
  }
}

export async function deletePlanFilesFromS3(planNumber: string) {
  // This would require listing objects with the plan prefix and deleting them
  // For now, we'll rely on individual file deletion
  console.log(`Files for plan ${planNumber} should be deleted individually`);
}

//
//
//
//

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
function getExt(name: string) {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

export async function _getUploadTargets(args: {
  userId: string;
  planNumber: string;
  category: "cad" | "pdf" | "certificate";
  files: { name: string; type?: string }[];
}) {
  const { userId, planNumber, category, files } = args;
  const safePlan = slugify(planNumber);
  const base = `surfboard/${userId}/${category}/${safePlan}`;

  const out: { key: string; url: string; publicUrl: string }[] = [];
  let idx = 0;
  for (const f of files) {
    const ext = getExt(f.name) || ".bin";
    const key = idx === 0 ? `${base}${ext}` : `${base}__${idx}${ext}`;
    idx++;
    const url = await getPresignedPutUrl({
      key,
      contentType: f.type || "application/octet-stream",
    });
    const publicUrl = `https://${BUCKET}.s3.amazonaws.com/${key}`;

    // Auditing console logs
    console.log(
      "[aws:getUploadTargets] userId=%s plan=%s category=%s key=%s",
      userId,
      planNumber,
      category,
      key
    );

    out.push({ key, url, publicUrl });
  }
  return out;
}

async function getPresignedPutUrl({
  key,
  contentType,
}: {
  key: string;
  contentType: string;
}) {
  // Note: If you already use S3 presigned URLs elsewhere (v4 signer), adapt to that util.
  // Here’s a minimal inlined signer (URL valid ~15 minutes) via @aws-sdk/s3-request-presigner if available.
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
  const cmd = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });
  const url = await getSignedUrl(s3, cmd, { expiresIn: 900 });
  return url;
}
//
//
//
//
//
//
//

import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getAuthenticatedSurfUserFromCookie } from "@/utils/surfAuth";

const CDN = process.env.CDN_BASE_URL; // optional

type Category = "cad" | "pdf" | "certificate";

function extFromName(name: string) {
  const idx = name.lastIndexOf(".");
  return idx >= 0 ? name.slice(idx + 1).toLowerCase() : "bin";
}

function safePart(s: string) {
  return s.replace(/[^a-zA-Z0-9_.-]/g, "-").slice(0, 128);
}

function makeKey(
  userId: string,
  category: Category,
  planNumber: string,
  index: number,
  filename: string
) {
  const base = `surfboard/${safePart(userId)}/${category}/${safePart(
    planNumber
  )}`;
  const ext = extFromName(filename);
  const suffix = index === 0 ? "" : `__${index}`;
  const key = `${base}${suffix}.${ext}`;
  console.log("[awsActions] build key", {
    userId,
    category,
    planNumber,
    index,
    filename,
    key,
  });
  return key;
}

export async function getUploadTargets(args: {
  userId: string;
  planNumber: string;
  category: Category;
  files: { name: string; type?: string }[];
}): Promise<{ key: string; url: string; publicUrl: string }[]> {
  const out: { key: string; url: string; publicUrl: string }[] = [];
  for (let i = 0; i < args.files.length; i++) {
    const f = args.files[i];
    const key = makeKey(args.userId, args.category, args.planNumber, i, f.name);
    const cmd = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: f.type || "application/octet-stream",
    });
    const url = await getSignedUrl(s3, cmd, { expiresIn: 60 * 5 });
    const publicUrl = CDN
      ? `${CDN}/${key}`
      : `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
    console.log("[awsActions] presign", {
      category: args.category,
      key,
      url: url.slice(0, 64) + "...",
    });
    out.push({ key, url, publicUrl });
  }
  return out;
}
//
//
//
//
//
//
export type UploadCategory = "cad" | "pdf" | "certificate";

export interface UploadTarget {
  key: string;
  url: string; // presigned PUT url
  publicUrl: string;
}

function padIndex(i: number) {
  return i === 0 ? "" : `__${i}`;
}

function extOf(filename: string) {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(dot) : "";
}

export async function buildSurfboardObjectKey(params: {
  category: UploadCategory;
  planNumber: string;
  index: number; // 0-based
  filename?: string;
}) {
  const user = await getAuthenticatedSurfUserFromCookie();
  if (!user) throw new Error("User not authenticated");

  const { category, planNumber, index, filename } = params;
  const ext = filename ? extOf(filename) : "";
  const safePlan = planNumber.replace(/[^a-zA-Z0-9_-]+/g, "-");
  const key = `surfboard/${user.id}/${category}/${safePlan}${padIndex(
    index
  )}${ext}`;
  return key;
}

// Create many presigned PUT URLs for multi-file upload; add audit logs
export async function getSurfboardUploadTargetsMulti(input: {
  planNumber: string;
  category: UploadCategory;
  files: { name: string; type?: string }[];
}): Promise<UploadTarget[]> {
  const user = await getAuthenticatedSurfUserFromCookie();
  if (!user) throw new Error("User not authenticated");

  console.log("[awsActions] getSurfboardUploadTargetsMulti: start", {
    userId: user.id,
    planNumber: input.planNumber,
    category: input.category,
    count: input.files.length,
  });

  // TODO: Replace with your SDK/presign implementation
  // The function below is a placeholder to illustrate expected return shape.
  // In your real code, call your backend/lambda to generate presigned PUT urls
  const basePublic = process.env.NEXT_PUBLIC_CDN_BASE || "https://example-cdn";
  const baseUpload =
    process.env.NEXT_PUBLIC_UPLOAD_BASE || "https://example-upload";

  const targets: UploadTarget[] = await Promise.all(
    input.files.map(async (f, i) => {
      const key = await buildSurfboardObjectKey({
        category: input.category,
        planNumber: input.planNumber,
        index: i,
        filename: f.name,
      });
      return {
        key,
        url: `${baseUpload}/put/${encodeURIComponent(key)}`,
        publicUrl: `${basePublic}/${key}`,
      };
    })
  );

  console.log(
    "[awsActions] getSurfboardUploadTargetsMulti: generated targets",
    targets
  );
  return targets;
}
