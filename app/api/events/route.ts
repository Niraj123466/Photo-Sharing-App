import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/authorization";
import { handleAuthError } from "@/lib/authorization";
import { prisma } from "@/lib/db";
import { createEventSchema } from "@/lib/validation/schemas";

// GET /api/events — list events for current user
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? undefined;

    let events;
    if (session.user.role === "ADMIN") {
      // Admin sees events they created
      events = await prisma.event.findMany({
        where: {
          createdById: session.user.id,
          ...(status ? { status: status as "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED" } : {}),
        },
        include: {
          _count: {
            select: { members: true, photos: true },
          },
          galleries: {
            select: { id: true, status: true, publicSlug: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" },
      });
    } else {
      // Team member sees assigned events
      events = await prisma.event.findMany({
        where: {
          members: { some: { userId: session.user.id } },
          ...(status ? { status: status as "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED" } : {}),
        },
        include: {
          _count: {
            select: { members: true, photos: true },
          },
          galleries: {
            select: { id: true, status: true, publicSlug: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }

    return NextResponse.json({ success: true, data: events });
  } catch (error) {
    return handleAuthError(error);
  }
}

// POST /api/events — create event (Admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Only admins can create events." } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = createEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input.",
            details: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const event = await prisma.event.create({
      data: {
        ...parsed.data,
        eventDate: new Date(parsed.data.eventDate),
        createdById: session.user.id,
      },
    });

    return NextResponse.json({ success: true, data: event }, { status: 201 });
  } catch (error) {
    return handleAuthError(error);
  }
}
