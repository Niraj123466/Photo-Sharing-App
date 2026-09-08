import { NextRequest, NextResponse } from "next/server";
import { requireGalleryAdmin, handleAuthError } from "@/lib/authorization";
import { prisma } from "@/lib/db";
import { setPinSchema, updateGallerySchema } from "@/lib/validation/schemas";
import { generatePin, generatePublicSlug } from "@/server/services/gallery-service";
import bcryptjs from "bcryptjs";

type Params = { params: Promise<{ galleryId: string }> };

// PATCH /api/galleries/:galleryId
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { galleryId } = await params;
    await requireGalleryAdmin(galleryId);

    const body = await request.json();
    const parsed = updateGallerySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid input." } },
        { status: 400 }
      );
    }

    const gallery = await prisma.gallery.update({
      where: { id: galleryId },
      data: parsed.data,
    });

    return NextResponse.json({ success: true, data: gallery });
  } catch (error) {
    return handleAuthError(error);
  }
}
