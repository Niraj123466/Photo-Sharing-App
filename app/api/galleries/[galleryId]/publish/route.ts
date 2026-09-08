import { NextRequest, NextResponse } from "next/server";
import { requireGalleryAdmin, handleAuthError } from "@/lib/authorization";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ galleryId: string }> };

// POST /api/galleries/:galleryId/publish
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const { galleryId } = await params;
    await requireGalleryAdmin(galleryId);

    const gallery = await prisma.gallery.findUnique({
      where: { id: galleryId },
      include: {
        photos: {
          include: { photo: { select: { status: true } } },
        },
      },
    });

    if (!gallery) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Gallery not found." } },
        { status: 404 }
      );
    }

    // Validate publishing requirements
    if (!gallery.pinHash) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_PIN", message: "Gallery must have a PIN before publishing." } },
        { status: 400 }
      );
    }

    if (gallery.photos.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "NO_PHOTOS", message: "Gallery must have at least one photo selected." } },
        { status: 400 }
      );
    }

    const unreadyPhotos = gallery.photos.filter((gp) => gp.photo.status !== "READY");
    if (unreadyPhotos.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNREADY_PHOTOS",
            message: `${unreadyPhotos.length} photo(s) are not ready. Only READY photos can be published.`,
          },
        },
        { status: 400 }
      );
    }

    const updated = await prisma.gallery.update({
      where: { id: galleryId },
      data: { status: "PUBLISHED", publishedAt: new Date() },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return handleAuthError(error);
  }
}
