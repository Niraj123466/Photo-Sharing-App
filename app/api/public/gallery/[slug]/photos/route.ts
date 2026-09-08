import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getGalleryPhotosWithUrls } from "@/server/services/gallery-service";
import crypto from "crypto";

type Params = { params: Promise<{ slug: string }> };

// GET /api/public/gallery/:slug/photos
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor") ?? undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);

    // 1. Find gallery — must be PUBLISHED
    const gallery = await prisma.gallery.findFirst({
      where: { publicSlug: slug, status: "PUBLISHED" },
      select: { id: true },
    });

    if (!gallery) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Gallery not found or not published." } },
        { status: 404 }
      );
    }

    // 2. Validate gallery session from HTTP-only cookie
    const sessionToken = request.cookies.get("gallery_session")?.value;
    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Gallery access requires PIN verification." } },
        { status: 401 }
      );
    }

    const tokenHash = crypto.createHash("sha256").update(sessionToken).digest("hex");
    const session = await prisma.gallerySession.findFirst({
      where: {
        tokenHash,
        galleryId: gallery.id,
        expiresAt: { gt: new Date() },
      },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: "SESSION_EXPIRED", message: "Your gallery session has expired. Please enter the PIN again." } },
        { status: 401 }
      );
    }

    // 3. Return published gallery photos with presigned URLs
    const result = await getGalleryPhotosWithUrls(gallery.id, cursor, limit);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Gallery photos error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load photos." } },
      { status: 500 }
    );
  }
}
