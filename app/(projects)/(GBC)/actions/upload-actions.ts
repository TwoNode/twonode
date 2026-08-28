// src/actions/upload-actions.ts
"use server";

import { requireAdmin } from "@/gbc/utils/auth";

import {
  uploadLogo,
  uploadSpeakerPhoto,
  uploadGalleryMedia,
  deleteFromS3,
} from "@/gbc/utils/aws-s3";
/**
 * Upload sponsor logo
 */
export async function uploadGBCSponsorLogo(
  formData: FormData
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    await requireAdmin();

    const file = formData.get("file") as File;

    if (!file) {
      return { success: false, error: "No file provided" };
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return { success: false, error: "Only images are allowed" };
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: "File size must be less than 5MB" };
    }

    // Convert to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to S3
    const result = await uploadLogo(buffer, file.name, "sponsor");

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Sponsor logo upload error:", error);
    return {
      success: false,
      error: "Failed to upload logo",
    };
  }
}

/**
 * Upload partner logo
 */
export async function uploadGBCPartnerLogo(
  formData: FormData
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    await requireAdmin();

    const file = formData.get("file") as File;

    if (!file) {
      return { success: false, error: "No file provided" };
    }

    if (!file.type.startsWith("image/")) {
      return { success: false, error: "Only images are allowed" };
    }

    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: "File size must be less than 5MB" };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadLogo(buffer, file.name, "partner");

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Partner logo upload error:", error);
    return {
      success: false,
      error: "Failed to upload logo",
    };
  }
}

/**
 * Upload speaker photo
 */
export async function uploadGBCSpeakerPhoto(
  formData: FormData
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    await requireAdmin();

    const file = formData.get("file") as File;

    if (!file) {
      return { success: false, error: "No file provided" };
    }

    if (!file.type.startsWith("image/")) {
      return { success: false, error: "Only images are allowed" };
    }

    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: "File size must be less than 5MB" };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadSpeakerPhoto(buffer, file.name);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Speaker photo upload error:", error);
    return {
      success: false,
      error: "Failed to upload photo",
    };
  }
}

/**
 * Upload gallery media (image or video)
 */
export async function uploadGBCGalleryMedia(
  formData: FormData
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    await requireAdmin();

    const file = formData.get("file") as File;

    if (!file) {
      return { success: false, error: "No file provided" };
    }

    // Validate file type
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      return { success: false, error: "Only images and videos are allowed" };
    }

    // Validate file size (max 100MB for videos, 10MB for images)
    const maxSize = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return {
        success: false,
        error: `File size must be less than ${isVideo ? "100MB" : "10MB"}`,
      };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadGalleryMedia(buffer, file.name, file.type);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Gallery media upload error:", error);
    return {
      success: false,
      error: "Failed to upload media",
    };
  }
}

/**
 * Delete file from S3
 */
export async function deleteGBCFile(
  key: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    await requireAdmin();

    if (!key) {
      return { success: false, error: "No file key provided" };
    }

    await deleteFromS3(key);

    return {
      success: true,
      message: "File deleted successfully",
    };
  } catch (error) {
    console.error("File deletion error:", error);
    return {
      success: false,
      error: "Failed to delete file",
    };
  }
}

/**
 * Upload multiple files (bulk upload)
 */
export async function uploadGBCBulkFiles(
  formData: FormData
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    await requireAdmin();

    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return { success: false, error: "No files provided" };
    }

    const results = [];
    const errors = [];

    for (const file of files) {
      try {
        if (!file.type.startsWith("image/")) {
          errors.push({ file: file.name, error: "Not an image" });
          continue;
        }

        if (file.size > 10 * 1024 * 1024) {
          errors.push({ file: file.name, error: "File too large" });
          continue;
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const result = await uploadGalleryMedia(buffer, file.name, file.type);
        results.push(result);
      } catch (error) {
        errors.push({
          file: file.name,
          error: error instanceof Error ? error.message : "Upload failed",
        });
      }
    }

    return {
      success: true,
      data: {
        uploaded: results.length,
        failed: errors.length,
        results,
        errors,
      },
    };
  } catch (error) {
    console.error("Bulk upload error:", error);
    return {
      success: false,
      error: "Failed to upload files",
    };
  }
}

/**
 * Get upload limits
 */
export async function getGBCUploadLimits(): Promise<{
  success: boolean;
  data: any;
}> {
  return {
    success: true,
    data: {
      logo: {
        maxSize: 5 * 1024 * 1024, // 5MB
        allowedTypes: ["image/jpeg", "image/png", "image/webp"],
      },
      photo: {
        maxSize: 5 * 1024 * 1024, // 5MB
        allowedTypes: ["image/jpeg", "image/png", "image/webp"],
      },
      image: {
        maxSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: ["image/jpeg", "image/png", "image/webp"],
      },
      video: {
        maxSize: 100 * 1024 * 1024, // 100MB
        allowedTypes: ["video/mp4", "video/webm", "video/ogg"],
      },
    },
  };
}

/**
 * Delete multiple files from S3
 */
export async function deleteMultipleGBCFiles(
  keys: string[]
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    await requireAdmin();

    if (!keys || keys.length === 0) {
      return { success: false, error: "No keys provided" };
    }

    // Delete all files
    await Promise.all(keys.map((key) => deleteGBCFile(key)));

    return {
      success: true,
      message: `${keys.length} file(s) deleted successfully`,
    };
  } catch (error) {
    console.error("Multiple file deletion error:", error);
    return {
      success: false,
      error: "Failed to delete files",
    };
  }
}
