import { NextRequest, NextResponse } from "next/server";
import { requireGalleryAdmin, handleAuthError } from "@/lib/authorization";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ galleryId: string }> };

// POST /api/galleries/:galleryId/unpublish
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const { galleryId } = await params;
    await requireGalleryAdmin(galleryId);

    // Invalidate all gallery sessions when unpublishing
    await prisma.gallerySession.deleteMany({ where: { galleryId } });

    const updated = await prisma.gallery.update({
      where: { id: galleryId },
      data: { status: "UNPUBLISHED" },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return handleAuthError(error);
  }
}
