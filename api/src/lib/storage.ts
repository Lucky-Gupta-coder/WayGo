import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, CopyObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { config } from '@/config'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'

// requestChecksumCalculation defaults to WHEN_SUPPORTED as of SDK v3.729+,
// which makes getSignedUrl() sign a checksum computed over an empty body
// (presigning happens before any file bytes exist). Real uploads with a
// non-empty body then fail checksum validation, surfacing to the browser as
// an opaque CORS-looking failure. WHEN_REQUIRED restores pre-3.729 behavior.
const s3 = new S3Client({
  region: config.S3_REGION,
  ...(config.S3_ENDPOINT ? { endpoint: config.S3_ENDPOINT } : {}),
  credentials: {
    accessKeyId: config.S3_ACCESS_KEY,
    secretAccessKey: config.S3_SECRET_KEY,
  },
  requestChecksumCalculation: 'WHEN_REQUIRED',
})

function getStorageUrlPrefix(): string {
  if (config.S3_ENDPOINT) {
    try {
      const parsed = new URL(config.S3_ENDPOINT)
      return `${parsed.protocol}//${config.S3_BUCKET_NAME}.${parsed.host}/`
    } catch {
      const cleaned = config.S3_ENDPOINT.replace(/^https?:\/\//, '').replace(/\/+$/, '')
      return `https://${config.S3_BUCKET_NAME}.${cleaned}/`
    }
  }
  return `https://${config.S3_BUCKET_NAME}.s3.${config.S3_REGION}.amazonaws.com/`
}

const S3_URL_PREFIX = getStorageUrlPrefix()

function extractKeyFromUrl(fileUrl: string): string | null {
  if (fileUrl.startsWith(S3_URL_PREFIX)) {
    return fileUrl.slice(S3_URL_PREFIX.length)
  }
  // Also recognize default AWS S3 prefix if migrating or accessing existing AWS URLs
  const awsPrefix = `https://${config.S3_BUCKET_NAME}.s3.${config.S3_REGION}.amazonaws.com/`
  if (fileUrl.startsWith(awsPrefix)) {
    return fileUrl.slice(awsPrefix.length)
  }
  return null
}

export async function uploadFile(
  file: Express.Multer.File,
  folder: string
): Promise<string> {
  const ext = path.extname(file.originalname).toLowerCase() || '.jpg'
  const key = `${folder}/${uuidv4()}${ext}`

  await s3.send(
    new PutObjectCommand({
      Bucket: config.S3_BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ContentLength: file.size,
    })
  )

  return `${S3_URL_PREFIX}${key}`
}

// Signing with an exact ContentLength is what makes a plain presigned PUT
// enforce a size cap -- S3 rejects the upload if the actual Content-Length
// header doesn't match what was signed. Presigned POST supports a size
// *range* via a policy document; presigned PUT only supports an exact
// value, which is fine here since the client already knows its (compressed)
// file's byte length before requesting the URL.
export async function getUploadUrl(key: string, contentType: string, contentLength: number): Promise<string> {
  return getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: config.S3_BUCKET_NAME, Key: key, ContentType: contentType, ContentLength: contentLength }),
    { expiresIn: 300 }
  )
}

export async function promotePendingUpload(pendingKey: string, folder: string): Promise<string> {
  const ext = path.extname(pendingKey) || '.jpg'
  const finalKey = `${folder}/${uuidv4()}${ext}`

  await s3.send(
    new CopyObjectCommand({
      Bucket: config.S3_BUCKET_NAME,
      CopySource: `${config.S3_BUCKET_NAME}/${pendingKey}`,
      Key: finalKey,
    })
  )
  await s3.send(new DeleteObjectCommand({ Bucket: config.S3_BUCKET_NAME, Key: pendingKey }))

  return `${S3_URL_PREFIX}${finalKey}`
}

export async function getPresignedUrl(fileUrl: string, expiresIn = 3600): Promise<string> {
  const key = extractKeyFromUrl(fileUrl)
  if (!key) return fileUrl

  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: config.S3_BUCKET_NAME, Key: key }),
    { expiresIn }
  )
}

export async function deleteFile(url: string): Promise<void> {
  const key = extractKeyFromUrl(url)
  if (!key) return

  await s3.send(new DeleteObjectCommand({ Bucket: config.S3_BUCKET_NAME, Key: key }))
}
