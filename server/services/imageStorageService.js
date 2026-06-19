import { Storage } from '@google-cloud/storage'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

const bucketName = (process.env.GCS_BUCKET_NAME || '').trim()
const credentialsJson = (process.env.GOOGLE_CREDENTIALS_JSON || '').trim()

let _storage = null
let _bucket = null

function getStorage() {
  if (!_storage) {
    const credentials = credentialsJson ? JSON.parse(credentialsJson) : undefined
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

export async function getImageSignedUrl(filename) {
  const bucket = getBucket()
  if (!bucket) return null
  const [url] = await bucket.file(filename).getSignedUrl({
    action: 'read',
    expires: Date.now() + 15 * 60 * 1000, // 15 minutes
  })
  return url
}
