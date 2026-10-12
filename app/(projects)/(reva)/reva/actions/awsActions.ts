"use server";

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  endpoint: `https://s3.${process.env.AWS_REGION}.amazonaws.com`,
  forcePathStyle: true,
});

const BUCKET_NAME = process.env.AWS_BUCKET_NAME!;
const BUCKET_REGION = process.env.AWS_REGION!;
const BUCKET_HOST = `${BUCKET_NAME}.s3.${BUCKET_REGION}.amazonaws.com/`;

function extractS3KeyFromUrl(url: string): string {
  const idx = url.indexOf(BUCKET_HOST);
  if (idx === -1)
    throw new Error(`Invalid S3 URL format. Expected host: ${BUCKET_HOST}`);
  return url.substring(idx + BUCKET_HOST.length);
}

export async function uploadToS3(formData: FormData) {
  const files = formData.getAll("file") as File[];

  if (files.length === 0) throw new Error("No file(s) provided");

  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());

    const uniqueSuffix = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 15)}`;
    const key = `uploads/${uniqueSuffix}-${file.name}`;

    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: file.type,
      })
    );
  }
}

export async function uploadToS3FromServer(
  files: File[],
  reference = "",
  options = { useDirectFileName: false }
) {
  console.log("Uploading File to S3 Bucket...");
  if (files.length === 0) {
    console.warn("S3 upload Error: No file(s) provided");
    throw new Error("No file(s) provided");
  }

  const fileUrls: string[] = [];

  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());

    const uniqueSuffix = `${
      reference ? `${reference}-` : ""
    }${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

    const key = options?.useDirectFileName
      ? `reva/uploads/${file.name}`
      : `reva/uploads/${uniqueSuffix}-${file.name}`;

    try {
      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key,
          Body: buffer,
          ContentType: file.type,
        })
      );

      const fileUrl = `https://${BUCKET_NAME}.s3.${BUCKET_REGION}.amazonaws.com/${key}`;
      fileUrls.push(fileUrl);
    } catch (error) {
      console.error("Error uploading file to S3:", error);
      throw new Error(
        `Failed to upload file ${file.name}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  console.log("Successfully uploaded files:", fileUrls);
  return fileUrls;
}

export async function deleteFromS3(input: { key?: string; url?: string }) {
  const { key, url } = input;

  const objectKey = key ?? (url ? extractS3KeyFromUrl(url) : undefined);

  if (!objectKey) throw new Error("Missing key or valid url");

  try {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: objectKey,
      })
    );
  } catch (error) {
    console.error("Error deleting file from S3:", error);
    throw new Error(
      `Failed to delete file: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

export async function deleteManyFromS3(
  items: { key?: string; url?: string }[]
) {
  const keys = items
    .map(({ key, url }) => {
      if (key) return key;
      if (url) {
        try {
          return extractS3KeyFromUrl(url);
        } catch {
          console.warn(`Invalid S3 URL format: ${url}`);
          return null;
        }
      }
      return null;
    })
    .filter((k): k is string => !!k);

  if (keys.length === 0) {
    console.warn("No valid keys or URLs provided for deletion");
    throw new Error("No valid keys or URLs provided");
  }

  try {
    await s3.send(
      new DeleteObjectsCommand({
        Bucket: BUCKET_NAME,
        Delete: {
          Objects: keys.map((Key) => ({ Key })),
          Quiet: false,
        },
      })
    );
  } catch (error) {
    console.error("Error deleting files from S3:", error);
    throw new Error(
      `Failed to delete files: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Turns a permanent public S3 URL into a short-lived signed one, so a
 * verified download can be handed a real URL without that URL working
 * forever for anyone who later obtains it (browser history, a forwarded
 * email, a network-tab capture).
 */
export async function getPresignedDownloadUrl(
  rawUrl: string,
  expiresIn = 300
): Promise<string> {
  const key = extractS3KeyFromUrl(rawUrl);
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key }),
    { expiresIn }
  );
}
