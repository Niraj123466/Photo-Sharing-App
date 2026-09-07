import { NextRequest, NextResponse } from "next/server";
import { requireEventAdmin, requireAuth, handleAuthError, AuthorizationError } from "@/lib/authorization";
import { prisma } from "@/lib/db";
import { addMemberSchema } from "@/lib/validation/schemas";

type Params = { params: Promise<{ eventId: string }> };

// GET /api/events/:eventId/members
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { eventId } = await params;
    await requireEventAdmin(eventId);

    const members = await prisma.eventMember.findMany({
      where: { eventId },
      include: {
        user: { select: { id: true, name: true, email: true, role: true, createdAt: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ success: true, data: members });
  } catch (error) {
    return handleAuthError(error);
  }
}

// POST /api/events/:eventId/members
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { eventId } = await params;
    await requireEventAdmin(eventId);

    const body = await request.json();
    const parsed = addMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid input.", details: parsed.error.flatten().fieldErrors } },
        { status: 400 }
      );
    }

    const { userId } = parsed.data;

    // Verify user exists and is a team member
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "User not found." } },
        { status: 404 }
      );
    }

    // Create membership — unique constraint prevents duplicates
    try {
      const member = await prisma.eventMember.create({
        data: { eventId, userId },
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      });
      return NextResponse.json({ success: true, data: member }, { status: 201 });
    } catch (e: unknown) {
      if ((e as { code?: string }).code === "P2002") {
        return NextResponse.json(
          { success: false, error: { code: "CONFLICT", message: "This user is already a member of this event." } },
          { status: 409 }
        );
      }
      throw e;
    }
  } catch (error) {
    return handleAuthError(error);
  }
}
