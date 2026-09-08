import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcryptjs from "bcryptjs";
import { verifyPinSchema } from "@/lib/validation/schemas";
import { pinVerifyLimiter, applyRateLimit, getClientIp } from "@/lib/rate-limit";
import crypto from "crypto";

type Params = { params: Promise<{ slug: string }> };

const SESSION_DURATION_SECONDS = parseInt(process.env.GALLERY_SESSION_DURATION ?? "3600");

// POST /api/public/gallery/:slug/verify-pin
export async function POST(request: NextRequest, { params }: Params) {
  const ip = getClientIp(request);
  const { slug } = await params;

  // Rate limit: 5 attempts per 5 minutes per IP+slug combo
  const rateLimitResult = applyRateLimit(pinVerifyLimiter, `pin:${ip}:${slug}`);
  if (rateLimitResult) return rateLimitResult;

  try {
    const body = await request.json();
    const parsed = verifyPinSchema.safeParse(body);

    // Generic error — don't reveal whether slug exists
    const genericError = NextResponse.json(
      { success: false, error: { code: "INVALID_PIN", message: "Invalid PIN. Please try again." } },
      { status: 401 }
    );

    if (!parsed.success) return genericError;
    const { pin } = parsed.data;

    const gallery = await prisma.gallery.findFirst({
      where: { publicSlug: slug, status: "PUBLISHED" },
      select: { id: true, pinHash: true },
    });

    if (!gallery) return genericError;

    const isValid = await bcryptjs.compare(pin, gallery.pinHash);
    if (!isValid) return genericError;

    // Create secure session token
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000);

    await prisma.gallerySession.create({
      data: {
        galleryId: gallery.id,
        tokenHash,
        expiresAt,
      },
    });

    const response = NextResponse.json({
      success: true,
      data: { message: "PIN verified successfully." },
    });

    // Set HTTP-only session cookie
    response.cookies.set("gallery_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_DURATION_SECONDS,
      path: `/`,
    });

    return response;
  } catch (error) {
    console.error("PIN verify error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Verification failed." } },
      { status: 500 }
    );
  }
}
