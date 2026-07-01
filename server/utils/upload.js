import { fileTypeFromFile, fileTypeFromBuffer } from 'file-type'
import { unlink } from 'fs/promises'

export const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
export const ALLOWED_VIDEO_MIMES = new Set(['video/mp4', 'video/quicktime', 'video/webm'])

/**
 * Validates magic bytes of a Buffer (for multer memoryStorage).
 * Returns true on success, false on failure.
 */
export async function checkFileMagicBytesFromBuffer(buffer, allowedMimes) {
  try {
    const result = await fileTypeFromBuffer(buffer)
    if (result && allowedMimes.has(result.mime)) return true
  } catch {
    // fall through
  }
  return false
}

/**
 * Reads the magic bytes of an uploaded file and validates it belongs to allowedMimes.
 * Deletes the file and returns false if the check fails; returns true on success.
 */
export async function checkFileMagicBytes(filePath, allowedMimes) {
  try {
    const result = await fileTypeFromFile(filePath)
    if (result && allowedMimes.has(result.mime)) return true
  } catch {
    // fall through to delete
  }
  await unlink(filePath).catch(() => {})
  return false
}
