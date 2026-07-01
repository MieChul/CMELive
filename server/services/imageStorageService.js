import { Storage } from '@google-cloud/storage'
import { writeFile, mkdir } from 'fs/promises'
import { createReadStream } from 'fs'
import { join } from 'path'

const bucketName = (process.env.GCS_BUCKET_NAME || '').trim()
const credentialsJson = (process.env.GOOGLE_CREDENTIALS_JSON || '').trim()

let _storage = null
let _bucket = null

function getStorage() {
  if (!_storage) {
    let credentials
    if (credentialsJson) {
      credentials = JSON.parse(credentialsJson)
      if (credentials.private_key) {
        credentials.private_key = credentials.private_key.replace(/\\n/g, '\n')
      }
    }
    _storage = credentials ? new Storage({ credentials }) : new Storage()
  }
  return _storage
}

function getBucket() {
  if (!bucketName) return null
  if (!_bucket) _bucket = getStorage().bucket(bucketName)
  return _bucket
}

export async function saveImage(buffer, filename, localDir) {
  const bucket = getBucket()

  if (bucket) {
    await bucket.file(filename).save(buffer, { metadata: { contentType: 'image/png' } })
    // Return server-side proxy path — signed URL generated on each request (no public bucket needed)
    return `/api/images/${filename}`
  }

  await mkdir(localDir, { recursive: true })
  await writeFile(join(localDir, filename), buffer)
  return `/news-images/${filename}`
}

/**
 * Upload an in-memory buffer to GCS (for small files ≤5MB).
 * Returns the GCS object path on success, null if GCS is not configured.
 */
export async function uploadBuffer(buffer, objectPath, contentType) {
  const bucket = getBucket()
  if (!bucket) return null
  await bucket.file(objectPath).save(buffer, { metadata: { contentType } })
  return objectPath
}

/**
 * Stream a local file to GCS (for large files like videos).
 * Returns the GCS object path on success, null if GCS is not configured.
 */
export async function uploadLocalFile(localPath, objectPath, contentType) {
  const bucket = getBucket()
  if (!bucket) return null
  return new Promise((resolve, reject) => {
    const writeStream = bucket.file(objectPath).createWriteStream({ metadata: { contentType } })
    createReadStream(localPath).pipe(writeStream)
    writeStream.on('finish', () => resolve(objectPath))
    writeStream.on('error', reject)
  })
}

/**
 * Get a signed read URL for any GCS media object.
 * Uses a longer TTL for videos so streaming doesn't expire mid-watch.
 */
export async function getObjectSignedUrl(objectPath, ttlMs = 15 * 60 * 1000) {
  const bucket = getBucket()
  if (!bucket) return null
  const [url] = await bucket.file(objectPath).getSignedUrl({
    action: 'read',
    expires: Date.now() + ttlMs,
  })
  return url
}

export async function getImageSignedUrl(filename) {
  const bucket = getBucket()
  if (!bucket) return null
  const [url] = await bucket.file(filename).getSignedUrl({
    action: 'read',
    expires: Date.now() + 15 * 60 * 1000, // 15 minutes
  })
  return url
}
