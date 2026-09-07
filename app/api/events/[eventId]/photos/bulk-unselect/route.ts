import { NextRequest, NextResponse } from "next/server";
import { requireEventAdmin, handleAuthError } from "@/lib/authorization";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ eventId: string }> };

// POST /api/events/:eventId/photos/bulk-unselect
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { eventId } = await params;
    await requireEventAdmin(eventId);

    const body = await request.json();
    const { photoIds, galleryId } = body;

    if (!Array.isArray(photoIds) || !galleryId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "photoIds and galleryId are required." } },
        { status: 400 }
      );
    }

    // Verify gallery belongs to event
    const gallery = await prisma.gallery.findFirst({ where: { id: galleryId, eventId } });
    if (!gallery) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Gallery not found." } },
        { status: 404 }
      );
    }

    const deleted = await prisma.galleryPhoto.deleteMany({
      where: { galleryId, photoId: { in: photoIds } },
    });

    return NextResponse.json({ success: true, data: { unselected: deleted.count } });
  } catch (error) {
    return handleAuthError(error);
  }
}
