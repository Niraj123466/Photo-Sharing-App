import { NextRequest, NextResponse } from "next/server";
import { requireGalleryAdmin, handleAuthError } from "@/lib/authorization";
import { prisma } from "@/lib/db";
import { generatePin } from "@/server/services/gallery-service";
import { setPinSchema } from "@/lib/validation/schemas";
import bcryptjs from "bcryptjs";

type Params = { params: Promise<{ galleryId: string }> };

// POST /api/galleries/:galleryId/regenerate-pin
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { galleryId } = await params;
    await requireGalleryAdmin(galleryId);

    const body = await request.json().catch(() => ({}));

    let pin: string;
    if (body.pin) {
      // Use provided PIN
      const parsed = setPinSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: { code: "VALIDATION_ERROR", message: "PIN must be exactly 6 digits." } },
          { status: 400 }
        );
      }
      pin = parsed.data.pin;
    } else {
      // Auto-generate
      pin = generatePin();
    }

    const pinHash = await bcryptjs.hash(pin, 12);

    // Invalidate existing gallery sessions when PIN changes
    await prisma.gallerySession.deleteMany({ where: { galleryId } });

    await prisma.gallery.update({
      where: { id: galleryId },
      data: { pinHash },
    });

    return NextResponse.json({
      success: true,
      data: { pin }, // Return new PIN once to admin
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
