import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ slug: string }> };

// GET /api/public/gallery/:slug — return safe gallery metadata only
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { slug } = await params;

    const gallery = await prisma.gallery.findFirst({
      where: { publicSlug: slug, status: "PUBLISHED" },
      select: {
        id: true,
        name: true,
        publicSlug: true,
        status: true,
        publishedAt: true,
        event: { select: { name: true, eventDate: true, location: true } },
        _count: { select: { photos: true } },
      },
    });

    if (!gallery) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Gallery not found or not published." } },
        { status: 404 }
      );
    }

    // Never return: pinHash, internal IDs of photos, uploader info, storage keys
    return NextResponse.json({ success: true, data: gallery });
  } catch (error) {
    console.error("Public gallery GET error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load gallery." } },
      { status: 500 }
    );
  }
}
