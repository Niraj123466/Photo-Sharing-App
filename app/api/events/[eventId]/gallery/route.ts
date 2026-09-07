import { NextRequest, NextResponse } from "next/server";
import { requireEventAdmin, handleAuthError } from "@/lib/authorization";
import { prisma } from "@/lib/db";
import { createGallerySchema } from "@/lib/validation/schemas";
import { generatePublicSlug, generatePin } from "@/server/services/gallery-service";
import bcryptjs from "bcryptjs";

type Params = { params: Promise<{ eventId: string }> };

// GET /api/events/:eventId/gallery
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { eventId } = await params;
    await requireEventAdmin(eventId);

    const gallery = await prisma.gallery.findFirst({
      where: { eventId },
      include: {
        _count: { select: { photos: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: gallery });
  } catch (error) {
    return handleAuthError(error);
  }
}

// POST /api/events/:eventId/gallery
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { eventId } = await params;
    await requireEventAdmin(eventId);

    // Check if gallery already exists for this event
    const existing = await prisma.gallery.findFirst({ where: { eventId } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: { code: "CONFLICT", message: "A gallery already exists for this event." } },
        { status: 409 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const parsed = createGallerySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid input.", details: parsed.error.flatten().fieldErrors } },
        { status: 400 }
      );
    }

    const pin = parsed.data.pin ?? generatePin();
    const pinHash = await bcryptjs.hash(pin, 12);

    // Generate unique slug
    let publicSlug = generatePublicSlug();
    while (await prisma.gallery.findUnique({ where: { publicSlug } })) {
      publicSlug = generatePublicSlug();
    }

    const gallery = await prisma.gallery.create({
      data: {
        eventId,
        name: parsed.data.name,
        publicSlug,
        pinHash,
        status: "DRAFT",
      },
    });

    return NextResponse.json({
      success: true,
      data: { ...gallery, pin }, // Return PIN once — admin needs to note it
    }, { status: 201 });
  } catch (error) {
    return handleAuthError(error);
  }
}
