/**
 * File Upload Utility
 * 
 * Handles file uploads (voice messages, images, etc.)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from './logger.js';
import { env } from '@config/env.js';
import { BadRequestError } from '@types/errors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Upload base64 file to disk
 */
export async function uploadBase64File(
  fileBase64: string,
  fileName: string | undefined,
  mimeType: string | undefined,
  subdirectory: string = 'uploads'
): Promise<{ fileUrl: string; filePath: string }> {
  try {
    // Determine file extension from mimeType or fileName
    let extension = 'm4a'; // default
    if (mimeType) {
      if (mimeType.includes('mpeg') || mimeType.includes('mp3')) {
        extension = 'mp3';
      } else if (mimeType.includes('wav')) {
        extension = 'wav';
      } else if (mimeType.includes('aac')) {
        extension = 'aac';
      }
    } else if (fileName) {
      const ext = path.extname(fileName).slice(1);
      if (ext) extension = ext;
    }

    // Create safe filename
    const safeName = fileName
      ? fileName.replace(/[^a-zA-Z0-9_\-.]/g, '')
      : `file_${Date.now()}.${extension}`;

    // Create upload directory
    const uploadsRoot = path.resolve(__dirname, `../../${subdirectory}`);
    if (!fs.existsSync(uploadsRoot)) {
      fs.mkdirSync(uploadsRoot, { recursive: true });
      logger.debug('Created upload directory', { path: uploadsRoot });
    }

    const filePath = path.join(uploadsRoot, safeName);

    // Decode base64 and write file
    const buffer = Buffer.from(fileBase64, 'base64');
    fs.writeFileSync(filePath, buffer);

    // Generate public URL
    const publicPath = `/${subdirectory}/${safeName}`;
    const baseUrl = env.NODE_ENV === 'production' 
      ? process.env.BASE_URL || 'https://your-domain.com'
      : 'http://localhost:' + env.PORT;
    const fileUrl = `${baseUrl}${publicPath}`;

    logger.info('File uploaded successfully', { filePath, fileUrl });

    return { fileUrl, filePath: publicPath };
  } catch (error) {
    logger.error('File upload error', error);
    throw new BadRequestError('Failed to upload file');
  }
}

/**
 * Delete file from disk
 */
export async function deleteFile(filePath: string): Promise<void> {
  try {
    const fullPath = path.resolve(__dirname, `../../${filePath}`);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      logger.debug('File deleted', { filePath: fullPath });
    }
  } catch (error) {
    logger.error('File deletion error', error);
    // Don't throw - file might not exist
  }
}

/**
 * Validate file size
 */
export function validateFileSize(fileBase64: string, maxSizeBytes: number = env.MAX_FILE_SIZE * 1024 * 1024): void {
  // Base64 is ~33% larger than original
  const estimatedSize = (fileBase64.length * 3) / 4;
  if (estimatedSize > maxSizeBytes) {
    throw new BadRequestError(`File size exceeds maximum of ${maxSizeBytes / 1024 / 1024}MB`);
  }
}


