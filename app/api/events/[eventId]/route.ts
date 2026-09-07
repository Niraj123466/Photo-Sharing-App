import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireEventAdmin, handleAuthError } from "@/lib/authorization";
import { prisma } from "@/lib/db";
import { updateEventSchema } from "@/lib/validation/schemas";

type Params = { params: Promise<{ eventId: string }> };

// GET /api/events/:eventId
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { eventId } = await params;
    const session = await requireAuth();

    // IDOR protection: verify access rights
    let event;
    if (session.user.role === "ADMIN") {
      event = await prisma.event.findFirst({
        where: { id: eventId, createdById: session.user.id },
        include: {
          members: {
            include: { user: { select: { id: true, name: true, email: true, role: true } } },
          },
          _count: { select: { photos: true } },
          galleries: {
            select: {
              id: true,
              name: true,
              status: true,
              publicSlug: true,
              publishedAt: true,
              createdAt: true,
              _count: { select: { photos: true } },
            },
          },
        },
      });
    } else {
      event = await prisma.event.findFirst({
        where: {
          id: eventId,
          members: { some: { userId: session.user.id } },
        },
        include: {
          members: {
            include: { user: { select: { id: true, name: true, email: true, role: true } } },
          },
          _count: { select: { photos: true } },
          galleries: {
            select: { id: true, status: true },
          },
        },
      });
    }

    if (!event) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Event not found." } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: event });
  } catch (error) {
    return handleAuthError(error);
  }
}

// PATCH /api/events/:eventId
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { eventId } = await params;
    await requireEventAdmin(eventId);

    const body = await request.json();
    const parsed = updateEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid input.", details: parsed.error.flatten().fieldErrors } },
        { status: 400 }
      );
    }

    const data: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.eventDate) {
      data.eventDate = new Date(parsed.data.eventDate);
    }

    const event = await prisma.event.update({ where: { id: eventId }, data });
    return NextResponse.json({ success: true, data: event });
  } catch (error) {
    return handleAuthError(error);
  }
}

// DELETE /api/events/:eventId
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { eventId } = await params;
    await requireEventAdmin(eventId);
    await prisma.event.delete({ where: { id: eventId } });
    return NextResponse.json({ success: true, data: { id: eventId } });
  } catch (error) {
    return handleAuthError(error);
  }
}
