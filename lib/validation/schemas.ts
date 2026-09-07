import { z } from "zod";

// ─────────────────────────────────────────────
// Auth schemas
// ─────────────────────────────────────────────
export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  role: z.enum(["ADMIN", "TEAM_MEMBER"]).default("TEAM_MEMBER"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// ─────────────────────────────────────────────
// Event schemas
// ─────────────────────────────────────────────
export const createEventSchema = z.object({
  name: z.string().min(1, "Event name is required").max(200),
  description: z.string().max(2000).optional(),
  eventDate: z.string().datetime(),
  location: z.string().max(500).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "COMPLETED", "ARCHIVED"]).default("DRAFT"),
});

export const updateEventSchema = createEventSchema.partial();

// ─────────────────────────────────────────────
// Team member schemas
// ─────────────────────────────────────────────
export const addMemberSchema = z.object({
  userId: z.string().cuid("Invalid user ID"),
});

// ─────────────────────────────────────────────
// Photo schemas
// ─────────────────────────────────────────────
export const presignUploadSchema = z.object({
  filename: z.string().min(1).max(500),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]),
  fileSize: z.number().int().positive().max(
    parseInt(process.env.MAX_UPLOAD_SIZE ?? "52428800")
  ),
});

export const completeUploadSchema = z.object({
  photoId: z.string().cuid(),
  storageKey: z.string().min(1),
});

export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  uploadedById: z.string().optional(),
  status: z.enum(["UPLOADING", "READY", "FAILED", "DELETED"]).optional(),
  search: z.string().max(200).optional(),
});

export const bulkSelectSchema = z.object({
  photoIds: z.array(z.string().cuid()).min(1).max(500),
  galleryId: z.string().cuid(),
});

// ─────────────────────────────────────────────
// Gallery schemas
// ─────────────────────────────────────────────
export const createGallerySchema = z.object({
  name: z.string().max(200).optional(),
  pin: z
    .string()
    .regex(/^\d{6}$/, "PIN must be exactly 6 digits")
    .optional(),
});

export const updateGallerySchema = z.object({
  name: z.string().max(200).optional(),
});

export const setPinSchema = z.object({
  pin: z.string().regex(/^\d{6}$/, "PIN must be exactly 6 digits"),
});

// ─────────────────────────────────────────────
// Public gallery schemas
// ─────────────────────────────────────────────
export const verifyPinSchema = z.object({
  pin: z.string().regex(/^\d{6}$/, "PIN must be exactly 6 digits"),
});
