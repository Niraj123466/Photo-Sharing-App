import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// ─── IMPORTANT: This module must NEVER be imported in client-side code ───────
// R2 credentials are server-only.

export function getR2Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const endpoint = process.env.R2_ENDPOINT;

  if (!accountId || !accessKeyId || !secretAccessKey || !endpoint) {
    throw new Error(
      "Missing R2 credentials. Check R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT."
    );
  }

  // Auto-detect region if Backblaze B2 (e.g. s3.us-east-005.backblazeb2.com) or custom
  const detectedRegion = endpoint.includes("backblazeb2.com")
    ? endpoint.replace(/^https?:\/\/s3\./, "").split(".")[0]
    : "auto";
  const region = process.env.R2_REGION || detectedRegion;

  return new S3Client({
    region,
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle: true,
  });
}

const BUCKET = process.env.R2_BUCKET_NAME ?? "";

// ─────────────────────────────────────────────────────────────────────────────
// Presigned upload URL (browser → R2 direct upload)
// ─────────────────────────────────────────────────────────────────────────────
export async function generatePresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 600 // 10 minutes
): Promise<string> {
  const client = getR2Client();
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(client, command, { expiresIn });
}

// ─────────────────────────────────────────────────────────────────────────────
// Presigned download URL (authorized access to private objects)
// ─────────────────────────────────────────────────────────────────────────────
export async function generatePresignedDownloadUrl(
  key: string,
  expiresIn = 3600 // 1 hour
): Promise<string> {
  const client = getR2Client();
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  return getSignedUrl(client, command, { expiresIn });
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete an object
// ─────────────────────────────────────────────────────────────────────────────
export async function deleteObject(key: string): Promise<void> {
  const client = getR2Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Check if object exists
// ─────────────────────────────────────────────────────────────────────────────
export async function objectExists(key: string): Promise<boolean> {
  try {
    const client = getR2Client();
    await client.send(
      new HeadObjectCommand({
        Bucket: BUCKET,
        Key: key,
      })
    );
    return true;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Storage key helpers
// ─────────────────────────────────────────────────────────────────────────────
export function buildStorageKey(
  eventId: string,
  photoId: string,
  variant: "original" | "thumbnail" | "optimized"
): string {
  return `events/${eventId}/photos/${photoId}/${variant}`;
}
