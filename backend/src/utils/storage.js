import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import config from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Local file storage for voice messages
const uploadsDir = path.resolve(__dirname, '../../', config.uploadDir || './uploads/voice-messages');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * Upload file to local storage
 * @param {Buffer} file - File buffer
 * @param {string} fileName - Original file name
 * @returns {Promise<string>} Relative URL path
 */
export async function uploadFile(file, fileName) {
  const key = `${Date.now()}-${fileName}`;
  const filePath = path.join(uploadsDir, key);

  fs.writeFileSync(filePath, file);

  // Return relative URL path
  return `/uploads/voice-messages/${key}`;
}

/**
 * Delete file from local storage
 * @param {string} fileUrl - File URL to delete
 * @returns {Promise<void>}
 */
export async function deleteFile(fileUrl) {
  const key = path.basename(fileUrl);
  const filePath = path.join(uploadsDir, key);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

/**
 * Get signed file URL (for local storage, just return relative URL)
 * @param {string} key - File key
 * @returns {Promise<string>} File URL
 */
export async function getSignedFileUrl(key) {
  return `/uploads/voice-messages/${key}`;
}
