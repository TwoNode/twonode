import {
  StorageAdapter,
  StorageProviderName,
  StorageUploadInput,
  StorageUploadResult,
  StoragePresignedUploadResult,
  SurfboardFileType,
} from "./types";
import { S3StorageAdapter } from "./providers/s3";
import { CloudflareR2StorageAdapter } from "./providers/cloudflare-r2";
import { CloudinaryStorageAdapter } from "./providers/cloudinary";
import { VercelBlobStorageAdapter } from "./providers/vercel-blob";
import { ImageKitStorageAdapter } from "./providers/imagekit";
import { LocalStorageAdapter } from "./providers/local";

export * from "./types";
export * from "./utils";

let cachedAdapter: StorageAdapter | null = null;
let cachedProviderName: StorageProviderName | null = null;

export function getStorageProvider(
  providerName?: StorageProviderName
): StorageAdapter {
  const envProvider = (
    process.env.STORAGE_PROVIDER ||
    process.env.SURFBOARD_STORAGE_PROVIDER ||
    "s3"
  ).toLowerCase() as StorageProviderName;

  const targetName = providerName || envProvider;

  if (cachedAdapter && cachedProviderName === targetName) {
    return cachedAdapter;
  }

  let adapter: StorageAdapter;

  switch (targetName) {
    case "cloudflare":
    case "r2":
      adapter = new CloudflareR2StorageAdapter();
      break;
    case "cloudinary":
      adapter = new CloudinaryStorageAdapter();
      break;
    case "vercel-blob":
      adapter = new VercelBlobStorageAdapter();
      break;
    case "imagekit":
      adapter = new ImageKitStorageAdapter();
      break;
    case "local":
      adapter = new LocalStorageAdapter();
      break;
    case "s3":
    default:
      adapter = new S3StorageAdapter();
      break;
  }

  if (!providerName) {
    cachedAdapter = adapter;
    cachedProviderName = targetName;
  }

  return adapter;
}
