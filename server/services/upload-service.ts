import { prisma } from "@/lib/db";
import { buildStorageKey } from "@/lib/storage/storage";
import { getR2Client } from "@/lib/storage/r2";
import sharp from "sharp";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";

const THUMBNAIL_WIDTH = 400;
const OPTIMIZED_WIDTH = 1920;
const THUMBNAIL_QUALITY = 80;
const OPTIMIZED_QUALITY = 85;

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/**
 * Process a newly uploaded photo:
 * 1. Download original from R2
 * 2. Generate thumbnail + optimized variant with Sharp
 * 3. Upload both back to R2
 * 4. Update Photo record with dimensions and variant keys
 */
export async function processPhoto(
  photoId: string,
  eventId: string,
  storageKey: string
): Promise<void> {
  const client = getR2Client();
  const bucket = process.env.R2_BUCKET_NAME!;

  try {
    // Download original
    const getResponse = await client.send(
      new GetObjectCommand({ Bucket: bucket, Key: storageKey })
    );
    const originalBuffer = await streamToBuffer(getResponse.Body as Readable);

    // Get image metadata
    const metadata = await sharp(originalBuffer).metadata();
    const { width = 0, height = 0 } = metadata;

    // Generate thumbnail
    const thumbnailBuffer = await sharp(originalBuffer)
      .resize(THUMBNAIL_WIDTH, null, { withoutEnlargement: true })
      .webp({ quality: THUMBNAIL_QUALITY })
      .toBuffer();

    // Generate optimized version
    const optimizedBuffer = await sharp(originalBuffer)
      .resize(OPTIMIZED_WIDTH, null, { withoutEnlargement: true })
      .webp({ quality: OPTIMIZED_QUALITY })
      .toBuffer();

    const thumbnailKey = buildStorageKey(eventId, photoId, "thumbnail");
    const optimizedKey = buildStorageKey(eventId, photoId, "optimized");

    // Upload thumbnail
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: thumbnailKey,
        Body: thumbnailBuffer,
        ContentType: "image/webp",
      })
    );

    // Upload optimized
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: optimizedKey,
        Body: optimizedBuffer,
        ContentType: "image/webp",
      })
    );

    // Update DB record
    await prisma.photo.update({
      where: { id: photoId },
      data: {
        thumbnailKey,
        optimizedKey,
        width,
        height,
        status: "READY",
      },
    });
  } catch (error) {
    console.error(`Failed to process photo ${photoId}:`, error);
    await prisma.photo.update({
      where: { id: photoId },
      data: { status: "FAILED" },
    });
    throw error;
  }
}
