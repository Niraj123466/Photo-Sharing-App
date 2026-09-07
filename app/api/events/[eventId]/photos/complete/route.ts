import { NextRequest, NextResponse } from "next/server";
import { requireEventMember, handleAuthError } from "@/lib/authorization";
import { prisma } from "@/lib/db";
import { processPhoto } from "@/server/services/upload-service";

type Params = { params: Promise<{ eventId: string }> };

// POST /api/events/:eventId/photos/complete
// Called after browser finishes direct upload to R2
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { eventId } = await params;
    const session = await requireEventMember(eventId);

    const body = await request.json();
    const { photoId } = body;

    if (!photoId || typeof photoId !== "string") {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "photoId is required." } },
        { status: 400 }
      );
    }

    // Verify the photo belongs to this user and event (IDOR protection)
    const photo = await prisma.photo.findFirst({
      where: {
        id: photoId,
        eventId,
        uploadedById: session.user.id,
        status: "UPLOADING",
      },
    });

    if (!photo) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Photo not found or already processed." } },
        { status: 404 }
      );
    }

    // Process asynchronously (in production this would be a background job/queue)
    // For now we process inline but respond quickly with "processing" status
    // Fire-and-forget processing
    processPhoto(photo.id, eventId, photo.storageKey).catch((err) => {
      console.error(`Background photo processing failed for ${photo.id}:`, err);
    });

    return NextResponse.json({
      success: true,
      data: { photoId: photo.id, status: "UPLOADING", message: "Photo upload received, processing..." },
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
