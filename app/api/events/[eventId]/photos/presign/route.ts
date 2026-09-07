import { NextRequest, NextResponse } from "next/server";
import { requireEventMember, handleAuthError, AuthorizationError } from "@/lib/authorization";
import { prisma } from "@/lib/db";
import { presignUploadSchema } from "@/lib/validation/schemas";
import { generatePresignedUploadUrl, buildStorageKey } from "@/lib/storage/storage";
import { presignLimiter, applyRateLimit, getClientIp } from "@/lib/rate-limit";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

type Params = { params: Promise<{ eventId: string }> };

// POST /api/events/:eventId/photos/presign
// Returns a presigned R2 upload URL + a new photo record ID
export async function POST(request: NextRequest, { params }: Params) {
  const ip = getClientIp(request);
  const rateLimitResult = applyRateLimit(presignLimiter, `presign:${ip}`);
  if (rateLimitResult) return rateLimitResult;

  try {
    const { eventId } = await params;
    const session = await requireEventMember(eventId);

    const body = await request.json();
    const parsed = presignUploadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid input.", details: parsed.error.flatten().fieldErrors } },
        { status: 400 }
      );
    }

    const { filename, contentType, fileSize } = parsed.data;

    // Server-side MIME validation (don't trust client alone)
    if (!ALLOWED_MIME_TYPES.includes(contentType)) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_FILE_TYPE", message: "Unsupported file type." } },
        { status: 400 }
      );
    }

    const maxSize = parseInt(process.env.MAX_UPLOAD_SIZE ?? "52428800");
    if (fileSize > maxSize) {
      return NextResponse.json(
        { success: false, error: { code: "FILE_TOO_LARGE", message: `File exceeds maximum size of ${Math.round(maxSize / 1048576)}MB.` } },
        { status: 400 }
      );
    }

    // Create a pending photo record first to get the ID
    const photo = await prisma.photo.create({
      data: {
        eventId,
        uploadedById: session.user.id,
        filename: filename,
        originalFilename: filename,
        storageKey: "pending", // Will be updated after upload
        mimeType: contentType,
        fileSize,
        status: "UPLOADING",
      },
    });

    const storageKey = buildStorageKey(eventId, photo.id, "original");

    // Update with the real storage key
    await prisma.photo.update({
      where: { id: photo.id },
      data: { storageKey },
    });

    const presignedUrl = await generatePresignedUploadUrl(storageKey, contentType, 600);

    return NextResponse.json({
      success: true,
      data: {
        photoId: photo.id,
        presignedUrl,
        storageKey,
      },
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
