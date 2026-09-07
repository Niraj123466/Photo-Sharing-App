import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireEventAdmin, handleAuthError, AuthorizationError } from "@/lib/authorization";
import { prisma } from "@/lib/db";
import { paginationSchema } from "@/lib/validation/schemas";
import { generatePresignedDownloadUrl } from "@/lib/storage/storage";

type Params = { params: Promise<{ eventId: string }> };

// GET /api/events/:eventId/photos — with role-based photo visibility
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { eventId } = await params;
    const session = await requireAuth();

    // Verify access to this event
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { createdById: true },
    });
    if (!event) {
      throw new AuthorizationError("NOT_FOUND", "Event not found.", 404);
    }

    const isAdmin = session.user.role === "ADMIN" && event.createdById === session.user.id;
    if (!isAdmin) {
      // Must be assigned member
      const membership = await prisma.eventMember.findUnique({
        where: { eventId_userId: { eventId, userId: session.user.id } },
      });
      if (!membership) {
        throw new AuthorizationError("FORBIDDEN", "You are not a member of this event.", 403);
      }
    }

    const { searchParams } = new URL(request.url);
    const paginationParsed = paginationSchema.safeParse({
      cursor: searchParams.get("cursor") ?? undefined,
      limit: searchParams.get("limit") ?? 50,
      uploadedById: searchParams.get("uploadedById") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      search: searchParams.get("search") ?? undefined,
    });

    if (!paginationParsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid pagination params." } },
        { status: 400 }
      );
    }

    const { cursor, limit, uploadedById, status, search } = paginationParsed.data;

    // IDOR: Team members can only see their own photos; admins see all
    const whereUploadedById = isAdmin
      ? (uploadedById ?? undefined)
      : session.user.id;

    const photos = await prisma.photo.findMany({
      where: {
        eventId,
        ...(whereUploadedById ? { uploadedById: whereUploadedById } : {}),
        ...(status ? { status } : { status: { not: "DELETED" } }),
        ...(search ? { originalFilename: { contains: search, mode: "insensitive" } } : {}),
      },
      include: {
        uploadedBy: { select: { id: true, name: true, email: true } },
        galleries: { select: { galleryId: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = photos.length > limit;
    const items = hasMore ? photos.slice(0, limit) : photos;

    // Attach thumbnail presigned URLs
    const photosWithUrls = await Promise.all(
      items.map(async (photo) => {
        const thumbnailUrl = photo.thumbnailKey
          ? await generatePresignedDownloadUrl(photo.thumbnailKey, 3600).catch(() => null)
          : null;
        return { ...photo, thumbnailUrl };
      })
    );

    return NextResponse.json({
      success: true,
      data: photosWithUrls,
      pagination: {
        hasMore,
        nextCursor: hasMore ? items[items.length - 1].id : null,
      },
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
