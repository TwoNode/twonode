"use server";

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { revalidatePath } from "next/cache";

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

  revalidatePath("/reva/requestform"); // Optional: revalidate page if needed
}

export async function uploadToS3FromServer(files: File[]) {
  if (files.length === 0) throw new Error("No file(s) provided");

  const fileUrls: string[] = [];

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

    const fileUrl = `https://${process.env.REVA_AWS_BUCKET_NAME!}.s3.${process
      .env.REVA_AWS_REGION!}.amazonaws.com/${key}`;

    fileUrls.push(fileUrl);
  }

  console.log("Uploaded files:", fileUrls);

  return fileUrls;
}
