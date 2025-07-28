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

export async function uploadSurfboardFileToS3(
  file: File,
  fileType: "pdf" | "cad" | "certificate",
  planNumber?: string
) {
  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    const uniqueSuffix = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 15)}`;
    const prefix = planNumber
      ? `surfboard/${planNumber}/${fileType}`
      : `surfboard/${fileType}`;
    const key = `${prefix}/${uniqueSuffix}-${file.name}`;

    await s3.send(
      new PutObjectCommand({
        Bucket:
          process.env.SURFBOARD_AWS_BUCKET_NAME ||
          process.env.REVA_AWS_BUCKET_NAME!,
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

    const fileUrl = `https://${
      process.env.SURFBOARD_AWS_BUCKET_NAME || process.env.REVA_AWS_BUCKET_NAME
    }.s3.${
      process.env.SURFBOARD_AWS_REGION || process.env.REVA_AWS_REGION
    }.amazonaws.com/${key}`;

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

export async function uploadMultipleSurfboardFilesToS3(
  files: { file: File; type: "pdf" | "cad" | "certificate" }[],
  planNumber?: string
) {
  const uploadPromises = files.map(({ file, type }) =>
    uploadSurfboardFileToS3(file, type, planNumber)
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

export async function deletePlanFilesFromS3(planNumber: string) {
  // This would require listing objects with the plan prefix and deleting them
  // For now, we'll rely on individual file deletion
  console.log(`Files for plan ${planNumber} should be deleted individually`);
}
