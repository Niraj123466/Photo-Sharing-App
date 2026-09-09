# FrameVault — Photography Event Gallery Platform

A production-quality, full-stack collaborative photography event gallery platform built with Next.js 14, PostgreSQL (Neon), Cloudflare R2, Auth.js, and Sharp.

---

## Architecture Diagram

```mermaid
flowchart TD
    A[Admin / Team Member] --> B[Next.js App - Vercel]
    C[Customer] --> B

    B --> D[Auth.js - JWT Sessions]
    B --> E[API Route Handlers]
    E --> F[(Neon PostgreSQL)]
    E --> G[Cloudflare R2]

    A -->|Presigned Upload URL| G
    G --> H[Original Photos]
    G --> I[Thumbnails WebP]
    G --> J[Optimized WebP]

    C -->|Gallery URL + PIN| E
    E -->|Verify PIN - bcrypt| F
    E -->|Gallery Session Cookie| C
    C -->|Authorized Photo Requests| E
    E -->|Presigned Download URLs| G
```

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS + shadcn/ui |
| Database | PostgreSQL via Neon |
| ORM | Prisma |
| Auth | Auth.js v5 (Credentials provider) |
| Storage | Cloudflare R2 (S3-compatible API) |
| Image Processing | Sharp |
| Hosting | Vercel |
| Validation | Zod |
| Testing | Vitest + Playwright |
| CI/CD | GitHub Actions |

---

## Features

### Admin / Lead Photographer
- ✅ Register and login
- ✅ Create/edit/delete events
- ✅ Assign and remove team members
- ✅ View all photos for managed events
- ✅ Filter, search, and paginate photos
- ✅ Bulk-select/unselect photos for gallery
- ✅ Create a gallery with auto-generated secure slug
- ✅ Generate or set a 6-digit PIN (stored hashed)
- ✅ Publish/unpublish gallery
- ✅ Copy shareable gallery URL
- ✅ Regenerate PIN (invalidates existing customer sessions)
- ✅ View event statistics

### Team Member / Photographer
- ✅ Login and view assigned events
- ✅ Multi-file drag-and-drop upload
- ✅ Upload progress per file (via XHR)
- ✅ Retry failed uploads
- ✅ View own uploaded photos
- ❌ Cannot create events, publish galleries, or manage others

### Customer (no account required)
- ✅ Visit `/gallery/{slug}` URL
- ✅ Enter 6-digit PIN for access
- ✅ Temporary session (HTTP-only cookie, 1 hour)
- ✅ Browse published photos in masonry grid
- ✅ Full-screen lightbox with prev/next/keyboard nav
- ✅ Mobile-responsive gallery
- ❌ Cannot see unpublished/unselected photos

---

## Security Model

### Authentication
- **Auth.js v5** with Credentials provider
- **bcryptjs** password hashing (cost factor 12)
- **JWT sessions** (7-day expiry)
- Roles embedded in JWT/session token

### Authorization (RBAC)
All authorization enforced server-side via `requireAuth()`, `requireAdmin()`, `requireEventAdmin()`, `requireEventMember()`, `requireGalleryAdmin()` helpers.

**IDOR Protection**: Every API endpoint validates `userId + role + event/gallery ownership` against the database. Knowing an ID alone is never sufficient.

### Gallery PIN Security
- 6-digit PIN stored as **bcrypt hash** (never plaintext)
- **Rate limiting**: 5 attempts per 5 minutes per IP+slug
- Wrong PIN returns generic error (no timing difference revealed)
- PIN regeneration invalidates all existing gallery sessions
- Session stored as SHA-256 hash in DB (raw token in HTTP-only cookie)

### Upload Security
- File type validated server-side (MIME allowlist)
- File size enforced server-side
- Storage keys use photo IDs (never user-controlled filenames)
- R2 bucket is **private** — no public access
- Browser receives only temporary presigned URLs (10-min expiry)
- R2 credentials never exposed to client-side code

### HTTP Security
- Secure, HTTP-only, SameSite=Lax session cookies
- Server-side session validation on every protected API call

---

## Database Schema

### User
Stores admin and team member accounts. Password hashed with bcrypt.

### Event
Photography events created by admins. Status: DRAFT, ACTIVE, COMPLETED, ARCHIVED.

### EventMember
Many-to-many junction between Users and Events. Unique constraint prevents duplicates.

### Photo
Metadata for uploaded photos. Binary data stored in R2, not PostgreSQL. Status: UPLOADING → READY | FAILED.

### Gallery
Public-facing gallery for an event. Contains secure slug and hashed PIN. Status: DRAFT, PUBLISHED, UNPUBLISHED, EXPIRED.

### GalleryPhoto
Many-to-many between Gallery and Photo. Enables future multiple galleries per event.

### GallerySession
Temporary customer access tokens (SHA-256 hashed). Used to validate cookie-based gallery sessions.

---

## Storage Architecture (Cloudflare R2)

```
Browser
  │
  ├─[1]─► Next.js API: POST /api/events/{id}/photos/presign
  │         └─ Validate user + event membership
  │         └─ Create pending Photo record (DB)
  │         └─ Generate R2 presigned PUT URL (10-min expiry)
  │         └─ Return presignedUrl + photoId
  │
  ├─[2]─► Cloudflare R2: PUT {presignedUrl}
  │         └─ Direct browser-to-R2 upload (no Next.js bottleneck)
  │
  └─[3]─► Next.js API: POST /api/events/{id}/photos/complete
            └─ Validate ownership
            └─ Trigger Sharp processing (async)
            │    └─ Download original from R2
            │    └─ Generate thumbnail (400px WebP)
            │    └─ Generate optimized (1920px WebP)
            │    └─ Upload variants to R2
            └─ Update Photo.status = READY

Storage key format:
  events/{eventId}/photos/{photoId}/original
  events/{eventId}/photos/{photoId}/thumbnail
  events/{eventId}/photos/{photoId}/optimized
```

---

## Local Setup

### Prerequisites
- Node.js 20+
- PostgreSQL (local via Docker or Neon cloud)
- Cloudflare R2 account and bucket

### Steps

```bash
# 1. Clone repository
git clone <repository-url>
cd photo-sharing-app

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env with your actual values

# 4. Run database migrations
npx prisma migrate dev

# 5. Generate Prisma client
npx prisma generate

# 6. Seed demo data
npm run db:seed

# 7. Start development server
npm run dev
```

Visit http://localhost:3000

### Local PostgreSQL via Docker

```bash
docker-compose up -d postgres
# Then set DATABASE_URL=postgresql://framevault:framevault_local@localhost:5432/framevault
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | Neon PostgreSQL connection string |
| `AUTH_SECRET` | ✅ | Auth.js secret (min 32 chars). Generate: `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | ✅ | Public app URL (e.g., `https://your-app.vercel.app`) |
| `R2_ACCOUNT_ID` | ✅ | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | ✅ | R2 API token access key |
| `R2_SECRET_ACCESS_KEY` | ✅ | R2 API token secret key |
| `R2_BUCKET_NAME` | ✅ | R2 bucket name |
| `R2_ENDPOINT` | ✅ | `https://{account-id}.r2.cloudflarestorage.com` |
| `MAX_UPLOAD_SIZE` | Optional | Max file size in bytes (default: 52428800 = 50MB) |
| `GALLERY_SESSION_DURATION` | Optional | Customer session duration in seconds (default: 3600 = 1 hour) |
| `SEED_ADMIN_PASSWORD` | Optional | Admin password for seed (default: Admin@demo123) |
| `SEED_MEMBER_PASSWORD` | Optional | Member password for seed (default: Member@demo123) |
| `SEED_GALLERY_PIN` | Optional | Demo gallery PIN for seed (default: 482917) |

---

## Testing

```bash
# Unit tests (Vitest)
npm test

# Unit tests with watch mode
npm run test:watch

# E2E tests (Playwright) — requires running dev server
npm run dev &
npm run test:e2e

# E2E with UI
npm run test:e2e:ui
```

Unit tests cover:
- PIN hashing and verification
- Storage key generation
- Authorization rules
- File validation
- Gallery publishing rules
- Rate limiting logic

---

## Deployment

### Vercel + Neon + Cloudflare R2

#### 1. Cloudflare R2 Setup
1. Create Cloudflare account at [dash.cloudflare.com](https://dash.cloudflare.com)
2. Navigate to R2 → Create bucket
3. Keep bucket **private** (no public access)
4. Go to R2 → Manage R2 API Tokens → Create Token
5. Grant "Object Read & Write" permissions on your bucket
6. Note: Account ID, Access Key ID, Secret Access Key
7. Configure CORS for browser uploads:
   ```json
   [{"AllowedOrigins":["https://your-app.vercel.app"],"AllowedMethods":["PUT","GET"],"AllowedHeaders":["*"],"MaxAgeSeconds":3000}]
   ```

#### 2. Neon PostgreSQL Setup
1. Create account at [neon.tech](https://neon.tech)
2. Create a new project and database
3. Copy the connection string (pooled URL recommended)
4. Run migrations in production:
   ```bash
   DATABASE_URL=your-neon-url npx prisma migrate deploy
   ```

#### 3. Vercel Setup
1. Push code to GitHub
2. Import repository in [vercel.com](https://vercel.com)
3. Add all environment variables from `.env.example`
4. Deploy!
5. After deploy, run seed if needed:
   ```bash
   DATABASE_URL=your-neon-url npm run db:seed
   ```

---

## Demo Credentials

> ⚠️ **For demonstration only.** Change in production.

**Admin:**
```
Email:    admin@example.com
Password: Admin@demo123
```

**Demo Photographer:**
```
Email:    photographer@example.com
Password: Member@demo123
```

**Demo Gallery:**
```
URL: https://your-domain.com/gallery/demo-wedding
PIN: 482917
```

To reset demo data:
```bash
npm run db:seed
```

---

## API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/signin` | Auth.js sign-in |
| POST | `/api/auth/signout` | Auth.js sign-out |

### Events (Admin only for write)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/events` | List events (role-filtered) |
| POST | `/api/events` | Create event |
| GET | `/api/events/:id` | Get event detail |
| PATCH | `/api/events/:id` | Update event |
| DELETE | `/api/events/:id` | Delete event |

### Team Members
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/events/:id/members` | List members |
| POST | `/api/events/:id/members` | Add member |
| DELETE | `/api/events/:id/members/:userId` | Remove member |

### Photos
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/events/:id/photos` | List photos (paginated) |
| POST | `/api/events/:id/photos/presign` | Get R2 presigned upload URL |
| POST | `/api/events/:id/photos/complete` | Confirm upload + trigger processing |
| POST | `/api/events/:id/photos/bulk-select` | Add photos to gallery |
| POST | `/api/events/:id/photos/bulk-unselect` | Remove photos from gallery |

### Gallery
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/events/:id/gallery` | Get gallery info |
| POST | `/api/events/:id/gallery` | Create gallery |
| PATCH | `/api/galleries/:id` | Update gallery |
| POST | `/api/galleries/:id/publish` | Publish gallery |
| POST | `/api/galleries/:id/unpublish` | Unpublish gallery |
| POST | `/api/galleries/:id/regenerate-pin` | Regenerate PIN |

### Public Gallery
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/public/gallery/:slug` | Get gallery metadata |
| POST | `/api/public/gallery/:slug/verify-pin` | Verify PIN + create session |
| GET | `/api/public/gallery/:slug/photos` | Get published photos (session required) |

---

## Known Limitations

1. **Image processing is synchronous in the API handler** — for very large uploads or high traffic, this should be moved to a background queue (e.g., Vercel Queue, Inngest, or BullMQ).
2. **Rate limiting uses in-memory LRU cache** — resets on server restart. For production at scale, replace with Upstash Redis rate limiter.
3. **Gallery sessions stored in PostgreSQL** — adequate for most use cases; for high traffic add a Redis cache layer.
4. **No CDN for gallery photos** — presigned R2 URLs are generated per-request. For public galleries with heavy traffic, consider Cloudflare R2 public bucket + Workers for URL signing.
5. **Sharp processing on Vercel** — function timeout limits apply. Files > 20MB may take longer to process. Consider Edge Functions or dedicated workers.
6. **No email notifications** — team members are not emailed when assigned to events.
7. **Single gallery per event** — schema supports multiple galleries (via GalleryPhoto junction), but the current UI only creates one per event.
