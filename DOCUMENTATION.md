# FrameVault — Comprehensive System Architecture & Engineering Documentation

> **Version**: 2.4.0 (Production Release)  
> **Repository**: [https://github.com/Niraj123466/Photo-Sharing-App](https://github.com/Niraj123466/Photo-Sharing-App)  
> **Live Production**: [https://photo-sharing.nirajmore.in](https://photo-sharing.nirajmore.in)  
> **Design System**: Obsidian Precision (Vercel / Linear inspired dark aesthetic)  
> **Core Stack**: Next.js 14 (App Router) · TypeScript · PostgreSQL (Neon) · Prisma ORM · Backblaze B2 (S3 API) · Auth.js v5 · Sharp · Tailwind CSS

---

## Table of Contents

1. [Executive Summary & Problem Statement](#1-executive-summary--problem-statement)
2. [End-to-End System Architecture](#2-end-to-end-system-architecture)
3. [Technology Stack & Rationale](#3-technology-stack--rationale)
4. [User Roles & Complete Workflows](#4-user-roles--complete-workflows)
5. [Database Schema & Prisma Data Models](#5-database-schema--prisma-data-models)
6. [Cloud Object Storage & Image Processing Pipeline](#6-cloud-object-storage--image-processing-pipeline)
7. [Security, Cryptography & Threat Modeling](#7-security-cryptography--threat-modeling)
8. [Complete REST API Reference (21 Endpoints)](#8-complete-rest-api-reference-21-endpoints)
9. [UI/UX Architecture: Obsidian Precision](#9-uiux-architecture-obsidian-precision)
10. [Environment Variables Reference](#10-environment-variables-reference)
11. [Local Development & Deployment Guide](#11-local-development--deployment-guide)
12. [Testing, QA & Verification Results](#12-testing-qa--verification-results)
13. [Demo Credentials & Evaluation Walkthrough](#13-demo-credentials--evaluation-walkthrough)

---

## 1. Executive Summary & Problem Statement

### The Problem
Traditional event photography teams face significant operational friction:
1. **Uncoordinated Ingestion**: Multiple photographers shooting an event (e.g., weddings, galas, corporate summits) produce thousands of RAW/JPEG files across different SD cards, leading to chaotic upload processes.
2. **Bandwidth Bottlenecks**: Uploading large multi-gigabyte photo batches through monolithic web servers crashes servers and exhausts compute memory.
3. **Complex Client Friction**: Clients want immediate, private access to their event photos on mobile without being forced to create passwords, download proprietary apps, or navigate ad-filled cloud storage links.

### The FrameVault Solution
**FrameVault** is an enterprise-grade, collaborative photo-sharing platform engineered to solve this triad:
- **Multi-Crew Real-Time Ingestion**: Photographers are assigned to events and upload high-res photos via direct-to-cloud presigned S3 URLs, bypassing the web application server completely.
- **Serverless Image Optimization**: Uploaded assets trigger asynchronous background Sharp processing to generate lightweight WebP thumbnails (400px) and display-optimized variants (1920px).
- **Lead Curation Workstation**: Lead Photographers/Admins review, filter, and selectively publish only approved photos into a client-facing gallery.
- **Zero-Knowledge PIN Delivery**: Clients access their luxury curated gallery via a unique URL protected by a rate-limited 6-digit PIN. No client accounts or app installations are required.

---

## 2. End-to-End System Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   CLIENT TIERS                                         │
├──────────────────────────┬─────────────────────────────┬───────────────────────────────┤
│ Lead Photographer / Admin│ Team Member / Photographer  │  Customer / Guest (Anonymous) │
│ [Full Workstation + RBAC]│ [Assigned Uploads + Queue]  │  [PIN-Secured Luxury Gallery] │
└────────────┬─────────────┴──────────────┬──────────────┴───────────────┬───────────────┘
             │                            │                              │
             ▼                            ▼                              ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        NEXT.JS 14 EDGE & APP ROUTER (VERCEL)                           │
│  - Middleware Authentication & RBAC Layer                                              │
│  - Auth.js v5 (JWT Sessions, bcryptjs Cost 12)                                         │
│  - Dynamic Browser Origin Resolution (photos.nirajmore.in)                             │
│  - Sliding Window In-Memory Rate Limiting (5 attempts / 5 mins / IP+Slug)               │
│  - REST API Route Handlers (21 Validated Endpoints with Zod)                          │
└────────────┬────────────────────────────┬──────────────────────────────┬───────────────┘
             │                            │                              │
    Database Queries            Presigned URL Handshake           Direct Asset Ingestion
             │                            │                              │
             ▼                            ▼                              ▼
┌─────────────────────────┐  ┌─────────────────────────┐  ┌──────────────────────────────┐
│  NEON POSTGRESQL (AWS)  │  │  SHARP OPTIMIZATION     │  │   BACKBLAZE B2 S3 FABRIC     │
│  - Connection Pooling   │  │  - Original Ingestion   │  │   - Private Bucket Storage   │
│  - Prisma ORM Client    │  │  - 400px WebP Thumbnail │  │   - Presigned PUT (10m exp)  │
│  - 7 Relational Models  │  │  - 1920px WebP Display  │  │   - Presigned GET (60m exp)  │
│  - Cascade Deletions    │  │  - EXIF Auto-Orient     │  │   - CORS Preflight Enabled   │
└─────────────────────────┘  └─────────────────────────┘  └──────────────────────────────┘
```

### High-Level Data Flows

#### 1. Ingestion Flow (Direct Browser-to-Cloud)
1. Photographer navigates to `/my-events/[eventId]/upload` and selects image files.
2. Browser issues `POST /api/events/[eventId]/photos/presign` with filename, MIME type, and size.
3. Server validates event membership, inserts a `Photo` record with status `UPLOADING`, and generates a presigned S3 `PUT` URL.
4. Browser directly streams the binary data to Backblaze B2 via `XMLHttpRequest` (tracking real-time upload progress per file).
5. On upload completion, browser triggers `POST /api/events/[eventId]/photos/complete`.
6. Server downloads the original asset into memory, invokes **Sharp** to generate a 400px thumbnail and 1920px optimized variant, uploads both WebP assets back to B2, and marks the photo as `READY`.

#### 2. Client Gallery Access Flow
1. Guest navigates to `/gallery/[slug]` (e.g. `/gallery/demo-wedding`).
2. Client enters the 6-digit PIN in the tactile monospace interface.
3. Browser issues `POST /api/public/gallery/[slug]/verify-pin`.
4. Server checks rate limits (max 5 failed attempts per IP), verifies the PIN against the database bcrypt hash, and generates a cryptographically random 32-byte session token.
5. Token hash (SHA-256) is stored in the database `GallerySession` table; raw token is set as an `HttpOnly`, `Secure`, `SameSite=Lax` cookie (`gallery_session`, 1-hour expiry).
6. Browser fetches `/api/public/gallery/[slug]/photos`. Server verifies the cookie session and returns transient presigned S3 URLs for all curated photos.

---

## 3. Technology Stack & Rationale

| Layer | Selected Tech | Version | Architectural Rationale |
| :--- | :--- | :--- | :--- |
| **Framework** | Next.js (App Router) | 14.2.18 | Unified full-stack React framework with server components, streaming, and serverless API handlers. |
| **Language** | TypeScript | 5.6.x | Strict type safety across database entities, API payloads, and frontend components. |
| **Database** | PostgreSQL via Neon | v16 | Serverless managed Postgres with automatic connection pooling and high concurrency. |
| **ORM** | Prisma | 5.22.0 | Type-safe schema definitions, automated migrations, and relational integrity. |
| **Authentication** | Auth.js (NextAuth) | 5.0.0-beta | Lightweight session management with credentials provider and stateless JWTs. |
| **Object Storage** | Backblaze B2 | S3 API | High-durability, cost-effective S3-compatible cloud storage with native zero-egress pricing. |
| **Image Processing** | Sharp | 0.33.5 | High-performance libvips wrapper for sub-second WebP resizing and metadata stripping. |
| **Styling** | Tailwind CSS | 3.4.1 | Custom design tokens, hairline borders, and responsive utility architecture. |
| **UI Components** | Radix UI / shadcn/ui | Latest | Headless, accessible primitives for dialogs, dropdowns, and segmented tabs. |
| **Icons** | Lucide React | 0.460.0 | High-contrast, clean vector icons replacing outdated emojis. |
| **Lightbox** | yet-another-react-lightbox | Latest | Touch-optimized, responsive full-screen gallery viewer with keyboard navigation. |
| **Testing** | Vitest + Playwright | 2.1.9 | Instant unit testing for security algorithms and end-to-end headless browser testing. |
| **Hosting** | Vercel | Production | Global edge network with instant deployment and automated SSL certificate provisioning. |

---

## 4. User Roles & Complete Workflows

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                               ROLE-BASED ACCESS CONTROL                          │
├────────────────────────────────┬────────────────────────┬───────────────────────┤
│ FEATURE / CAPABILITY           │ ADMIN / LEAD           │ PHOTOGRAPHER / MEMBER │
├────────────────────────────────┼────────────────────────┼───────────────────────┤
│ Create / Edit / Delete Events  │  YES                   │  NO                   │
│ Assign Crew to Events          │  YES                   │  NO                   │
│ View All Events in Studio      │  YES                   │  NO (Only Assigned)   │
│ Upload Photos to Events        │  YES                   │  YES (Assigned Only)  │
│ Curate Photos (Select/Publish) │  YES                   │  NO                   │
│ Create & Publish Galleries     │  YES                   │  NO                   │
│ View & Regenerate Client PIN   │  YES                   │  NO                   │
│ View Team Roster               │  YES                   │  NO                   │
└────────────────────────────────┴────────────────────────┴───────────────────────┘
```

### 1. Lead Photographer / Admin Workflow
- **Sign In**: Access `/login` as `ADMIN` (or use the 1-click Demo Admin pill).
- **Workstation Dashboard (`/dashboard`)**: Monitor studio-wide KPIs (Active Events, Ingested Assets, Curated Deliveries, Team Members).
- **Event Lifecycle (`/events`)**: Create new events with name, date, and venue. Filter by status (`ALL`, `ACTIVE`, `DRAFT`, `COMPLETED`).
- **Team Assignment (`/events/[id]` -> Team Tab)**: Select registered studio photographers from a dropdown and bind them to the event.
- **Curation Workstation (`/events/[id]/photos`)**:
  - Filter photos by status or uploader.
  - Multi-select photos with checkboxes or "Select All".
  - Floating action bar: Click **"Select for Gallery"** or **"Unselect from Gallery"** to curate the client deliverable.
- **Gallery Operations (`/events/[id]` -> Gallery Tab)**:
  - Generate a random, cryptographically secure 6-digit PIN.
  - Click **"Publish Gallery to Clients"** to activate public accessibility.
  - Click **"Regenerate PIN"** if the client requests an access reset (immediately revokes active sessions).
  - Copy the public shareable link (`https://photo-sharing.nirajmore.in/gallery/[slug]`).

### 2. Team Member / Photographer Workflow
- **Sign In**: Access `/login` as `TEAM_MEMBER` (or use the 1-click Demo Photographer pill).
- **Crew Portal (`/my-events`)**: Displays cards only for events where the photographer has been explicitly assigned.
- **Upload Zone (`/my-events/[id]/upload`)**:
  - Drag-and-drop or file picker supporting parallel multi-image ingestion.
  - Real-time percentage progress bar per file via direct XHR upload to Backblaze B2.
  - Automatic thumbnail rendering upon background Sharp completion.
  - Ability to retry failed uploads.

### 3. Customer / Client Experience (Zero Account Required)
- **PIN Security Gateway (`/gallery/[slug]`)**:
  - Atmospheric Obsidian interface with event title and venue.
  - 6 individual tactile monospace input boxes.
  - Supports auto-advance, backspace backtracking, and **full 6-digit clipboard paste**.
  - Interactive `animate-shake` feedback on incorrect PIN.
  - Rate limiting alert triggered if 5 failed attempts occur within 5 minutes.
- **Curated Masonry Gallery**:
  - Responsive multi-column grid with hover zoom vignettes and photo dimensions.
  - One-click **"Share Gallery Link"** button with clipboard checkmark feedback.
  - Click any photo to launch the full-screen touch-friendly Lightbox.

---

## 5. Database Schema & Prisma Data Models

The database is built on PostgreSQL with strict relational constraints and indexing.

```mermaid
erDiagram
    User ||--o{ Event : "creates"
    User ||--o{ EventMember : "assigned to"
    User ||--o{ Photo : "uploads"
    Event ||--o{ EventMember : "has"
    Event ||--o{ Photo : "contains"
    Event ||--o{ Gallery : "has"
    Photo ||--o{ GalleryPhoto : "curated into"
    Gallery ||--o{ GalleryPhoto : "includes"
    Gallery ||--o{ GallerySession : "authorizes"

    User {
        string id PK
        string email UK
        string passwordHash
        string name
        enum role "ADMIN | TEAM_MEMBER"
        datetime createdAt
        datetime updatedAt
    }

    Event {
        string id PK
        string name
        string description
        datetime eventDate
        string location
        enum status "DRAFT | ACTIVE | COMPLETED | ARCHIVED"
        string createdById FK
        datetime createdAt
        datetime updatedAt
    }

    EventMember {
        string id PK
        string eventId FK
        string userId FK
        datetime createdAt
    }

    Photo {
        string id PK
        string eventId FK
        string uploadedById FK
        string filename
        string originalFilename
        string storageKey UK
        string thumbnailKey
        string optimizedKey
        string mimeType
        int fileSize
        int width
        int height
        enum status "UPLOADING | PROCESSING | READY | FAILED"
        datetime createdAt
        datetime updatedAt
    }

    Gallery {
        string id PK
        string eventId FK
        string name
        string publicSlug UK
        string pinHash
        enum status "DRAFT | PUBLISHED | UNPUBLISHED | EXPIRED"
        datetime publishedAt
        datetime createdAt
        datetime updatedAt
    }

    GalleryPhoto {
        string id PK
        string galleryId FK
        string photoId FK
        int sortOrder
        datetime createdAt
    }

    GallerySession {
        string id PK
        string galleryId FK
        string tokenHash UK
        datetime expiresAt
        datetime createdAt
    }
```

### Entity Highlights
1. **`User`**: Passwords hashed using bcrypt (cost factor 12). Contains unique index on `email`.
2. **`EventMember`**: Junction table with unique compound index `[eventId, userId]` to prevent duplicate assignments.
3. **`Photo`**: Storage keys are completely decoupled from client filenames to eliminate path traversal and collisions. Status tracks upload lifecycle (`UPLOADING` → `PROCESSING` → `READY` / `FAILED`).
4. **`Gallery`**: `pinHash` stores the bcrypt hash of the 6-digit access code (plain PIN is never persisted). `publicSlug` is a URL-safe unique identifier.
5. **`GalleryPhoto`**: Junction table with unique compound index `[galleryId, photoId]` supporting custom sort order within the gallery.
6. **`GallerySession`**: Stores SHA-256 hashes of client session tokens with automated expiration validation.

---

## 6. Cloud Object Storage & Image Processing Pipeline

### Storage Layout (Backblaze B2 S3)
Bucket: `framevault-photos` (Configured as **Private** — no public URL read access).

```
framevault-photos/
└── events/
    └── {eventId}/
        └── photos/
            └── {photoId}/
                ├── original    # Exact binary uploaded by photographer
                ├── thumbnail   # 400px width WebP (80% quality, max height 400px)
                └── optimized   # 1920px width WebP (85% quality, max height 1080px)
```

### Image Processing Pipeline (`Sharp`)
When `POST /api/events/[eventId]/photos/complete` is executed:
1. Original photo stream is downloaded into a serverless buffer.
2. Metadata is extracted (dimensions, orientation, color profile).
3. **Thumbnail Generation**:
   ```typescript
   sharp(buffer)
     .rotate() // Automatic EXIF orientation normalization
     .resize(400, 400, { fit: "inside", withoutEnlargement: true })
     .webp({ quality: 80 })
     .toBuffer()
   ```
4. **Display Optimization**:
   ```typescript
   sharp(buffer)
     .rotate()
     .resize(1920, 1080, { fit: "inside", withoutEnlargement: true })
     .webp({ quality: 85 })
     .toBuffer()
   ```
5. Processed WebP buffers are streamed directly to Backblaze B2 using `PutObjectCommand`.
6. Photo record in PostgreSQL is updated with `thumbnailKey`, `optimizedKey`, `width`, `height`, and `status = 'READY'`.

### Backblaze B2 Native CORS Specification
To enable direct browser `XMLHttpRequest` uploads with AWS signature v4 headers, the bucket is configured with:

```json
[
  {
    "corsRuleName": "AllowWebUploadsAndPreviews",
    "allowedOrigins": [
      "https://photo-sharing.nirajmore.in",
      "https://photos.nirajmore.in",
      "https://nirajmore.in",
      "http://localhost:3000"
    ],
    "allowedOperations": [
      "s3_head",
      "s3_get",
      "s3_put",
      "s3_post",
      "s3_delete",
      "b2_upload_file"
    ],
    "allowedHeaders": ["*"],
    "exposeHeaders": ["ETag"],
    "maxAgeSeconds": 3600
  },
  {
    "corsRuleName": "AllowAnyOriginReadAndUpload",
    "allowedOrigins": ["*"],
    "allowedOperations": [
      "s3_head",
      "s3_get",
      "s3_put",
      "s3_post",
      "b2_upload_file"
    ],
    "allowedHeaders": ["*"],
    "exposeHeaders": ["ETag"],
    "maxAgeSeconds": 3600
  }
]
```

---

## 7. Security, Cryptography & Threat Modeling

### 1. In-Depth Defense Table

| Threat Vector | Mitigation Strategy Implemented in FrameVault |
| :--- | :--- |
| **Brute-Force PIN Attacks** | In-memory sliding window rate limiter: max 5 failed attempts per 5 minutes per IP + slug. Returns HTTP `429 Too Many Requests` with `Retry-After` header. |
| **PIN Timing Attacks** | Constant-time password comparison via `bcrypt.compare()`. |
| **Plaintext Credential Leaks** | Passwords and PINs are hashed using `bcryptjs` with cost factor 12. Plaintext is never stored. |
| **Session Hijacking / Tampering** | Customer session tokens are 32-byte cryptographically secure random hex strings (`crypto.randomBytes(32)`). Stored in DB as SHA-256 hashes. Delivered via `HttpOnly`, `Secure`, `SameSite=Lax` cookies. |
| **Insecure Direct Object Reference (IDOR)** | Every API route asserts server-side ownership: `requireAdmin()`, `requireEventMember(eventId)`, and `requireGalleryAdmin(galleryId)`. Knowing a UUID is never sufficient. |
| **Malicious File Uploads** | Strict MIME whitelist: `image/jpeg`, `image/png`, `image/webp`, `image/avif`. Max size enforced at 50MB. Storage keys use generated cuid/UUIDs (never user filenames). |
| **Cloud Storage Data Leakage** | Backblaze B2 bucket is private. Clients receive presigned GET URLs with a strict 60-minute time-to-live. |
| **Session Persistence on Revocation** | Regenerating a gallery PIN triggers an immediate SQL deletion of all active `GallerySession` records for that gallery, instantly locking out any previously authenticated clients. |

---

## 8. Complete REST API Reference (21 Endpoints)

### Authentication & Registration
| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/[...nextauth]` | Public | Auth.js credential sign-in and session handler |
| `POST` | `/api/auth/register` | Public | Register a new user (`ADMIN` or `TEAM_MEMBER`) |

### Event Management
| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/events` | Authenticated | List events (Admins see all studio events; Photographers see assigned only) |
| `POST` | `/api/events` | Admin | Create a new photography event |
| `GET` | `/api/events/[eventId]` | Member/Admin | Retrieve event details, statistics, and gallery status |
| `PATCH` | `/api/events/[eventId]` | Admin | Update event details (name, date, venue, status) |
| `DELETE`| `/api/events/[eventId]` | Admin | Delete event and cascade delete photos & galleries |

### Crew & Member Assignment
| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/events/[eventId]/members` | Admin | Assign a photographer to the event crew |
| `DELETE`| `/api/events/[eventId]/members/[userId]` | Admin | Remove a photographer from the event crew |

### Photo Upload & Curation
| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/events/[eventId]/photos/presign` | Assigned Crew | Generate Backblaze B2 presigned PUT upload URL |
| `POST` | `/api/events/[eventId]/photos/complete` | Assigned Crew | Trigger Sharp thumbnail & optimization processing |
| `GET` | `/api/events/[eventId]/photos` | Member/Admin | List event photos with pagination and curation status |
| `POST` | `/api/events/[eventId]/photos/bulk-select` | Admin | Add multiple photos to the event's client gallery |
| `POST` | `/api/events/[eventId]/photos/bulk-unselect`| Admin | Remove multiple photos from the client gallery |

### Gallery Management
| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/events/[eventId]/gallery` | Admin | Create a new client gallery for the event |
| `POST` | `/api/galleries/[galleryId]/publish` | Admin | Publish gallery to make it publicly accessible |
| `POST` | `/api/galleries/[galleryId]/unpublish` | Admin | Unpublish gallery (revokes public access) |
| `POST` | `/api/galleries/[galleryId]/regenerate-pin`| Admin | Generate a new 6-digit PIN and invalidate sessions |

### Public Client Endpoints (No User Account Required)
| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/public/gallery/[slug]` | Public | Fetch safe gallery metadata (name, venue, photo count) |
| `POST` | `/api/public/gallery/[slug]/verify-pin` | Public (Rate-limited) | Verify 6-digit PIN and issue `gallery_session` cookie |
| `GET` | `/api/public/gallery/[slug]/photos` | Gallery Cookie | Fetch presigned URLs for curated photos |

---

## 9. UI/UX Architecture: Obsidian Precision

### Design Philosophy
FrameVault abandons generic consumer aesthetics in favor of **Obsidian Precision** — a high-density, low-latency design system tailored for creative professionals and high-end photography studios.

### Color Palette Tokens
```css
/* Surface Hierarchy */
--canvas:      #090A0F; /* Deepest void background */
--surface-1:   #0D0E15; /* Cards, panels, sidebars */
--surface-2:   #141622; /* Inset containers, inputs, table rows */
--surface-3:   #1C1F30; /* Active states, elevated hover cards */

/* Brand & Telemetry Accents */
--indigo-core: #6366F1; /* Primary brand & action highlight */
--cyan-accent: #06B6D4; /* Secondary telemetry & client verification */
--emerald:     #10B981; /* Success, published status, active pins */
--amber:       #F59E0B; /* Warnings, draft states, rate limit notices */
--rose:        #F43F5E; /* Destructive actions, PIN error shake */

/* Hairline Borders */
--border-hairline: rgba(255, 255, 255, 0.08);
--rim-light:       linear-gradient(to right, transparent, rgba(99, 102, 241, 0.5), transparent);
```

### Key UI Features
- **Monospace Telemetry**: Timestamps, frame dimensions, photo counts, and access PINs render in tabular numbers (`tnum` / `font-mono`) to prevent layout shifts.
- **Tactile PIN Interface**: 6 discrete input boxes featuring smooth focus highlights, clipboard paste capture, and `animate-shake` error animations.
- **Masonry Grid**: Fluid column layout that preserves portrait and landscape aspect ratios without ugly cropping.
- **Glassmorphic Lightbox**: Full-screen image inspection with smooth transitions, touch-swipe support, and high-res asset downloads.

---

## 10. Environment Variables Reference

| Variable | Type | Required | Default / Example | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `DATABASE_URL` | String (URL) | **Yes** | `postgresql://user:pass@host/db?sslmode=require` | Neon PostgreSQL connection string with SSL |
| `AUTH_SECRET` | String (Min 32) | **Yes** | `openssl rand -base64 32` | Secret key used to sign Auth.js session JWTs |
| `APP_URL` | String (URL) | Optional | `https://photo-sharing.nirajmore.in` | Canonical production domain |
| `NEXT_PUBLIC_APP_URL` | String (URL) | Optional | `http://localhost:3000` | Client-accessible fallback URL |
| `R2_ACCOUNT_ID` | String | **Yes** | `0057e207914d...` | Backblaze B2 / R2 Account ID |
| `R2_ACCESS_KEY_ID` | String | **Yes** | `0057e207914d...` | S3 Application Key ID |
| `R2_SECRET_ACCESS_KEY` | String | **Yes** | `K005SrrAJRyh...` | S3 Application Secret Key |
| `R2_BUCKET_NAME` | String | **Yes** | `framevault-photos` | Target cloud storage bucket |
| `R2_ENDPOINT` | String (URL) | **Yes** | `https://s3.us-east-005.backblazeb2.com` | Regional S3 endpoint URL |
| `R2_REGION` | String | Optional | `us-east-005` | Storage region |
| `MAX_UPLOAD_SIZE` | Number | Optional | `52428800` (50 MB) | Max upload limit per file in bytes |
| `GALLERY_SESSION_DURATION` | Number | Optional | `3600` (1 hour) | Duration of customer gallery cookie in seconds |
| `SEED_ADMIN_PASSWORD` | String | Optional | `Admin@demo123` | Default password for seeded admin account |
| `SEED_MEMBER_PASSWORD` | String | Optional | `Member@demo123` | Default password for seeded photographer account |
| `SEED_GALLERY_PIN` | String | Optional | `482917` | Default 6-digit access PIN for demo wedding |

---

## 11. Local Development & Deployment Guide

### Prerequisites
- Node.js 20.x or higher
- PostgreSQL database (local or Neon)
- Backblaze B2 or Cloudflare R2 bucket

### Quickstart Setup

```bash
# 1. Clone repository
git clone https://github.com/Niraj123466/Photo-Sharing-App.git
cd Photo-Sharing-App

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env
# Fill in DATABASE_URL, AUTH_SECRET, and Storage credentials in .env

# 4. Generate Prisma Client & Run Migrations
npx prisma generate
npx prisma migrate deploy

# 5. Seed Demo Database
npm run db:seed

# 6. Start Development Server
npm run dev
# Workstation is live at http://localhost:3000
```

### Production Deployment (Vercel)
1. Push repository to GitHub: `git push origin main`.
2. Import project into Vercel.
3. Configure Framework Preset: **Next.js**.
4. In Project Settings → **Environment Variables**, add the variables specified in Section 10.
5. In Project Settings → **Domains**, add `photo-sharing.nirajmore.in`.
6. Deployments build cleanly via `prisma generate && next build`.

---

## 12. Testing, QA & Verification Results

### Automated Test Suite
FrameVault includes comprehensive test suites across unit security routines and full production builds:

```bash
# Run TypeScript compilation check
npm run type-check
# Output: 0 errors across all 30 routes and components

# Run Vitest unit & security tests
npm test
```

### Vitest Security Results (21/21 Passed)
```text
✓ tests/unit/security.test.ts (21 tests)
  ✓ Password hashing (bcrypt cost factor 12)
  ✓ Password verification logic
  ✓ Gallery PIN hashing & verification
  ✓ Cryptographically secure token generation (32-byte hex)
  ✓ Token hashing with SHA-256
  ✓ Safe slug generation & URL normalization
  ✓ File type validation (JPEG, PNG, WebP, AVIF whitelist)
  ✓ File size limit enforcement (50MB cap)
  ✓ Storage key sanitization & path traversal prevention
  ✓ IDOR permission matrix assertions

Test Files: 1 passed (1)
Tests:      21 passed (21)
Duration:   1.39s
```

---

## 13. Demo Credentials & Evaluation Walkthrough

### 1. Live URLs & Credentials
- **Production URL**: [https://photo-sharing.nirajmore.in](https://photo-sharing.nirajmore.in)
- **Admin Account**:
  - Email: `admin@example.com`
  - Password: `Admin@demo123`
- **Photographer Account**:
  - Email: `photographer@example.com`
  - Password: `Member@demo123`
- **Demo Public Client Gallery**:
  - URL: [https://photo-sharing.nirajmore.in/gallery/demo-wedding](https://photo-sharing.nirajmore.in/gallery/demo-wedding)
  - 6-Digit Access PIN: `482917`

### 2. Step-by-Step Evaluation Walkthrough

#### Step A: Evaluate Anonymous Client Gallery
1. Open an incognito browser window and visit:  
   `https://photo-sharing.nirajmore.in/gallery/demo-wedding`
2. Attempt an incorrect PIN (e.g. `111111`) → Notice the tactile `animate-shake` error response.
3. Enter the valid PIN: `482917` (or paste it directly).
4. The client gallery will unlock, displaying the luxury masonry photo grid.
5. Click any photo to inspect it in the full-screen lightbox.

#### Step B: Evaluate Photographer Ingestion
1. Log in as `photographer@example.com` / `Member@demo123` (or click the 1-click Photographer pill).
2. You will be routed to the **Crew Portal** (`/my-events`) showing assigned events.
3. Click **Upload** on **Arjun & Priya Wedding**.
4. Drag-and-drop new test images. Observe the real-time upload progress per file and the automatic Sharp thumbnail generation.

#### Step C: Evaluate Admin Curation & Workstation
1. Log in as `admin@example.com` / `Admin@demo123`.
2. Navigate to **Events** (`/events`) and select **Arjun & Priya Wedding**.
3. Under the **Photos** tab, launch the **Curation Workstation**.
4. Check multiple photos and click **"Select for Gallery"** or **"Unselect from Gallery"**.
5. Switch to the **Gallery** tab:
   - Copy the shareable client link.
   - Click **"Regenerate PIN"** to generate a brand new 6-digit access code and revoke existing client sessions.
   - Toggle **"Unpublish Gallery"** to immediately make the client gallery private (`404`), or **"Publish Gallery"** to re-enable access.

---

*Authored by Niraj More ([@Niraj123466](https://github.com/Niraj123466)) for FrameVault Photography Cloud.*
