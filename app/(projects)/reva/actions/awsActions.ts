"use server";

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.REVA_AWS_REGION!,
  credentials: {
    accessKeyId: process.env.REVA_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.REVA_AWS_SECRET_ACCESS_KEY!,
  },
  // endpoint: `https://${process.env.REVA_AWS_BUCKET_NAME}.s3.${process.env.REVA_AWS_REGION}.amazonaws.com`, // Explicitly set endpoint
  endpoint: `https://s3.${process.env.REVA_AWS_REGION}.amazonaws.com`, // Correct endpoint format
  forcePathStyle: true, // Force path-style for compatibility
});

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
        Bucket: process.env.REVA_AWS_BUCKET_NAME!,
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
    console.log(files);
    console.warn("S3 upload Error: No file(s) provided");
    throw new Error("No file(s) provided");
  }

  const fileUrls: string[] = [];

  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());

    const uniqueSuffix = `${
      reference ? reference + "-" : ""
    }${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

    const key = options?.useDirectFileName
      ? `reva/uploads/${file.name}`
      : `reva/uploads/${uniqueSuffix}-${file.name}`;

    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.REVA_AWS_BUCKET_NAME!,
        Key: key,
        Body: buffer,
        ContentType: file.type,
      })
    );

    const fileUrl = `https://${process.env.REVA_AWS_BUCKET_NAME!}.s3.${process
      .env.REVA_AWS_REGION!}.amazonaws.com/${key}`;

    fileUrls.push(fileUrl);
  }

  console.log("Uploaded files:", fileUrls);

  return fileUrls;
}

export async function deleteFromS3(input: { key?: string; url?: string }) {
  const { key, url } = input;

  let objectKey = key;

  if (!objectKey && url) {
    const bucketHost = `${process.env.REVA_AWS_BUCKET_NAME!}.s3.${process.env
      .REVA_AWS_REGION!}.amazonaws.com/`;
    const idx = url.indexOf(bucketHost);
    if (idx === -1) throw new Error("Invalid S3 URL format");

    objectKey = url.substring(idx + bucketHost.length);
  }

  if (!objectKey) throw new Error("Missing key or valid url");

  await s3.send(
    new DeleteObjectCommand({
      Bucket: process.env.REVA_AWS_BUCKET_NAME!,
      Key: objectKey,
    })
  );
}

export async function deleteManyFromS3(
  items: { key?: string; url?: string }[]
) {
  const bucket = process.env.REVA_AWS_BUCKET_NAME!;
  const region = process.env.REVA_AWS_REGION!;
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
    .filter((k): k is string => !!k); // Ensure only valid strings

  if (keys.length === 0) throw new Error("No valid keys or URLs provided");

  await s3.send(
    new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: {
        Objects: keys.map((Key) => ({ Key })),
        Quiet: false,
      },
    })
  );
}
