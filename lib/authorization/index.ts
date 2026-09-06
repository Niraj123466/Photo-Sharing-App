import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export type AuthSession = {
  user: {
    id: string;
    name: string;
    email: string;
    role: "ADMIN" | "TEAM_MEMBER";
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// requireAuth — throws 401 if not authenticated
// ─────────────────────────────────────────────────────────────────────────────
export async function requireAuth(): Promise<AuthSession> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new AuthorizationError("UNAUTHORIZED", "Authentication required.", 401);
  }
  return session as AuthSession;
}

// ─────────────────────────────────────────────────────────────────────────────
// requireAdmin — throws 403 if not ADMIN
// ─────────────────────────────────────────────────────────────────────────────
export async function requireAdmin(): Promise<AuthSession> {
  const session = await requireAuth();
  if (session.user.role !== "ADMIN") {
    throw new AuthorizationError(
      "FORBIDDEN",
      "This action requires admin privileges.",
      403
    );
  }
  return session;
}

// ─────────────────────────────────────────────────────────────────────────────
// requireEventAdmin — must be ADMIN and own the event
// ─────────────────────────────────────────────────────────────────────────────
export async function requireEventAdmin(eventId: string): Promise<AuthSession> {
  const session = await requireAdmin();
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { createdById: true },
  });
  if (!event) {
    throw new AuthorizationError("NOT_FOUND", "Event not found.", 404);
  }
  if (event.createdById !== session.user.id) {
    throw new AuthorizationError(
      "FORBIDDEN",
      "You do not have permission to manage this event.",
      403
    );
  }
  return session;
}

// ─────────────────────────────────────────────────────────────────────────────
// requireEventMember — must be assigned to the event (ADMIN owner or TEAM_MEMBER)
// ─────────────────────────────────────────────────────────────────────────────
export async function requireEventMember(eventId: string): Promise<AuthSession> {
  const session = await requireAuth();
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { createdById: true },
  });
  if (!event) {
    throw new AuthorizationError("NOT_FOUND", "Event not found.", 404);
  }
  // Admin owner always has access
  if (session.user.role === "ADMIN" && event.createdById === session.user.id) {
    return session;
  }
  // Team member must have an EventMember record
  const membership = await prisma.eventMember.findUnique({
    where: { eventId_userId: { eventId, userId: session.user.id } },
  });
  if (!membership) {
    throw new AuthorizationError(
      "FORBIDDEN",
      "You are not a member of this event.",
      403
    );
  }
  return session;
}

// ─────────────────────────────────────────────────────────────────────────────
// requireGalleryAdmin — must be ADMIN and own the event linked to gallery
// ─────────────────────────────────────────────────────────────────────────────
export async function requireGalleryAdmin(
  galleryId: string
): Promise<AuthSession> {
  const session = await requireAdmin();
  const gallery = await prisma.gallery.findUnique({
    where: { id: galleryId },
    select: { event: { select: { createdById: true } } },
  });
  if (!gallery) {
    throw new AuthorizationError("NOT_FOUND", "Gallery not found.", 404);
  }
  if (gallery.event.createdById !== session.user.id) {
    throw new AuthorizationError(
      "FORBIDDEN",
      "You do not have permission to manage this gallery.",
      403
    );
  }
  return session;
}

// ─────────────────────────────────────────────────────────────────────────────
// AuthorizationError — structured error for clean API responses
// ─────────────────────────────────────────────────────────────────────────────
export class AuthorizationError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 403
  ) {
    super(message);
    this.name = "AuthorizationError";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// handleAuthError — converts AuthorizationError to NextResponse
// ─────────────────────────────────────────────────────────────────────────────
export function handleAuthError(error: unknown): NextResponse {
  if (error instanceof AuthorizationError) {
    return NextResponse.json(
      { success: false, error: { code: error.code, message: error.message } },
      { status: error.status }
    );
  }
  console.error("Unexpected error:", error);
  return NextResponse.json(
    { success: false, error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." } },
    { status: 500 }
  );
}
