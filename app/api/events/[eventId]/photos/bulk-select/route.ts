import { NextRequest, NextResponse } from "next/server";
import { requireEventAdmin, handleAuthError } from "@/lib/authorization";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ eventId: string }> };

// POST /api/events/:eventId/photos/bulk-select
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { eventId } = await params;
    await requireEventAdmin(eventId);

    const body = await request.json();
    const { photoIds, galleryId } = body;

    if (!Array.isArray(photoIds) || photoIds.length === 0 || !galleryId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "photoIds array and galleryId are required." } },
        { status: 400 }
      );
    }

    // Verify gallery belongs to this event
    const gallery = await prisma.gallery.findFirst({
      where: { id: galleryId, eventId },
    });
    if (!gallery) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Gallery not found for this event." } },
        { status: 404 }
      );
    }

    // Only READY photos from this event can be selected
    const validPhotos = await prisma.photo.findMany({
      where: { id: { in: photoIds }, eventId, status: "READY" },
      select: { id: true },
    });

    const validPhotoIds = validPhotos.map((p) => p.id);

    // Upsert gallery photos (ignore duplicates)
    const created = await prisma.$transaction(
      validPhotoIds.map((photoId, index) =>
        prisma.galleryPhoto.upsert({
          where: { galleryId_photoId: { galleryId, photoId } },
          create: { galleryId, photoId, sortOrder: index },
          update: {},
        })
      )
    );

    return NextResponse.json({ success: true, data: { selected: created.length } });
  } catch (error) {
    return handleAuthError(error);
  }
}
