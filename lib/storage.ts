import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from 'uuid';
import { Readable } from 'stream';
import fs from 'fs';
import path from 'path';

// Configuration
const config = {
  // Default to local storage in development
  storageProvider: process.env.STORAGE_PROVIDER || 'local',
  
  // S3 Configuration
  s3: {
    region: process.env.AWS_REGION || 'us-east-1',
    bucket: process.env.AWS_S3_BUCKET || 'surfboard-uploads',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  
  // Local storage configuration
  local: {
    uploadDir: path.join(process.cwd(), 'public/uploads'),
    publicUrl: process.env.BASE_URL || 'http://localhost:3000',
  },
};

// Initialize S3 client if credentials are available
const s3Client = config.s3.accessKeyId && config.s3.secretAccessKey
  ? new S3Client({
      region: config.s3.region,
      credentials: {
        accessKeyId: config.s3.accessKeyId,
        secretAccessKey: config.s3.secretAccessKey,
      },
    })
  : null;

// Ensure upload directory exists for local storage
if (config.storageProvider === 'local') {
  if (!fs.existsSync(config.local.uploadDir)) {
    fs.mkdirSync(config.local.uploadDir, { recursive: true });
  }
}

/**
 * Upload a file to the configured storage provider
 * @param file The file to upload (File, Buffer, or Readable)
 * @param filePath The path where the file should be stored (without extension)
 * @returns The public URL of the uploaded file
 */
async function __uploadFile(file: File | Buffer | Readable, filePath: string): Promise<string> {
  // Generate a unique filename with extension
  let fileName = filePath;
  let fileBuffer: Buffer;
  let fileType = 'application/octet-stream';

  // Handle different file types
  if (file instanceof File) {
    const ext = file.name.split('.').pop() || '';
    fileName = `${filePath}.${ext}`;
    fileType = file.type;
    
    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    fileBuffer = Buffer.from(arrayBuffer);
  } else if (file instanceof Buffer) {
    fileBuffer = file;
  } else if (file instanceof Readable) {
    // Convert Readable to Buffer
    const chunks: Buffer[] = [];
    for await (const chunk of file) {
      chunks.push(chunk);
    }
    fileBuffer = Buffer.concat(chunks as unknown as readonly Uint8Array[]);
  } else {
    throw new Error('Unsupported file type');
  }

  // Upload based on storage provider
  if (config.storageProvider === 's3' && s3Client) {
    return uploadToS3(fileBuffer, fileName, fileType);
  } else {
    return uploadToLocal(fileBuffer, fileName, fileType);
  }
}

/**
 * Delete a file from storage
 * @param fileUrl The URL or path of the file to delete
 * @returns True if deletion was successful
 */
export async function deleteFile(fileUrl: string): Promise<boolean> {
  if (config.storageProvider === 's3' && s3Client) {
    return deleteFromS3(fileUrl);
  } else {
    return deleteFromLocal(fileUrl);
  }
}

// Private functions for S3 storage
async function uploadToS3(file: Buffer, key: string, contentType: string): Promise<string> {
  if (!s3Client) {
    throw new Error('S3 client not configured');
  }

  const command = new PutObjectCommand({
    Bucket: config.s3.bucket,
    Key: key,
    Body: file,
    ContentType: contentType,
    ACL: 'public-read',
  });

  await s3Client.send(command);
  
  // Return public URL
  return `https://${config.s3.bucket}.s3.${config.s3.region}.amazonaws.com/${key}`;
}

async function deleteFromS3(fileUrl: string): Promise<boolean> {
  if (!s3Client) {
    throw new Error('S3 client not configured');
  }

  try {
    // Extract key from URL
    const url = new URL(fileUrl);
    const key = url.pathname.substring(1); // Remove leading slash

    const command = new DeleteObjectCommand({
      Bucket: config.s3.bucket,
      Key: key,
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    console.error('Error deleting file from S3:', error);
    return false;
  }
}

// Private functions for local storage
async function uploadToLocal(file: Buffer, fileName: string, _contentType: string): Promise<string> {
  const filePath = path.join(config.local.uploadDir, fileName);
  
  // Ensure directory exists
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Write file
  await fs.promises.writeFile(filePath, file as any);
  
  // Return public URL
  return `${config.local.publicUrl}/uploads/${fileName}`.replace(/\\/g, '/');
}

async function deleteFromLocal(fileUrl: string): Promise<boolean> {
  try {
    // Extract relative path from URL
    const url = new URL(fileUrl);
    const relativePath = url.pathname.replace(/^\/uploads\//, '');
    const filePath = path.join(config.local.uploadDir, relativePath);
    
    // Delete file
    await fs.promises.unlink(filePath);
    return true;
  } catch (error) {
    console.error('Error deleting local file:', error);
    return false;
  }
}

// Utility function to get file extension from filename or URL
function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

// Utility function to generate a unique filename
export function generateUniqueFilename(originalName: string, prefix = ''): string {
  const ext = getFileExtension(originalName);
  const uniqueId = uuidv4();
  return `${prefix}${uniqueId}${ext ? '.' + ext : ''}`;
}
