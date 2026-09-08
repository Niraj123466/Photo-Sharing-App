import { prisma } from "@/lib/db";
import { generatePresignedDownloadUrl } from "@/lib/storage/storage";

/**
 * Get a gallery by its public slug with authorization checks.
 * Only returns PUBLISHED galleries.
 */
export async function getPublishedGallery(slug: string) {
  return prisma.gallery.findFirst({
    where: {
      publicSlug: slug,
      status: "PUBLISHED",
    },
    include: {
      event: { select: { name: true } },
    },
  });
}

/**
 * Get photos for a published gallery with presigned download URLs.
 * Only returns photos in READY status.
 */
export async function getGalleryPhotosWithUrls(
  galleryId: string,
  cursor?: string,
  limit = 50
) {
  const galleryPhotos = await prisma.galleryPhoto.findMany({
    where: {
      galleryId,
      photo: { status: "READY" },
    },
    include: {
      photo: {
        select: {
          id: true,
          filename: true,
          thumbnailKey: true,
          optimizedKey: true,
          width: true,
          height: true,
        },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = galleryPhotos.length > limit;
  const items = hasMore ? galleryPhotos.slice(0, limit) : galleryPhotos;

  // Generate presigned download URLs for each photo (thumbnail + optimized)
  const photosWithUrls = await Promise.all(
    items.map(async (gp) => {
      const [thumbnailUrl, optimizedUrl] = await Promise.all([
        gp.photo.thumbnailKey
          ? generatePresignedDownloadUrl(gp.photo.thumbnailKey, 3600)
          : null,
        gp.photo.optimizedKey
          ? generatePresignedDownloadUrl(gp.photo.optimizedKey, 3600)
          : null,
      ]);

      return {
        id: gp.id,
        photoId: gp.photo.id,
        sortOrder: gp.sortOrder,
        width: gp.photo.width,
        height: gp.photo.height,
        thumbnailUrl,
        optimizedUrl,
      };
    })
  );

  return {
    photos: photosWithUrls,
    nextCursor: hasMore ? items[items.length - 1].id : null,
  };
}

/**
 * Generate a cryptographically secure public slug.
 */
export function generatePublicSlug(length = 11): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join("");
}

/**
 * Generate a random 6-digit PIN.
 */
export function generatePin(): string {
  const bytes = new Uint8Array(3);
  crypto.getRandomValues(bytes);
  const num = (bytes[0] * 65536 + bytes[1] * 256 + bytes[2]) % 1000000;
  return num.toString().padStart(6, "0");
}
