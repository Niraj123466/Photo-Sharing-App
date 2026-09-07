import { NextRequest, NextResponse } from "next/server";
import { requireEventAdmin, handleAuthError } from "@/lib/authorization";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ eventId: string; userId: string }> };

// DELETE /api/events/:eventId/members/:userId
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { eventId, userId } = await params;
    await requireEventAdmin(eventId);

    const deleted = await prisma.eventMember.deleteMany({
      where: { eventId, userId },
    });

    if (deleted.count === 0) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Member not found in this event." } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: { userId, eventId } });
  } catch (error) {
    return handleAuthError(error);
  }
}
