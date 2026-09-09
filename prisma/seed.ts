import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcryptjs from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Admin@demo123";
  const memberPassword = process.env.SEED_MEMBER_PASSWORD ?? "Member@demo123";
  const galleryPin = process.env.SEED_GALLERY_PIN ?? "482917";

  // ─── Create demo Admin ────────────────────────────────────────────────────
  const adminHash = await bcryptjs.hash(adminPassword, 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      name: "Demo Admin",
      email: "admin@example.com",
      passwordHash: adminHash,
      role: "ADMIN",
    },
  });
  console.log(`✅ Admin: ${admin.email}`);

  // ─── Create demo Team Member ──────────────────────────────────────────────
  const memberHash = await bcryptjs.hash(memberPassword, 12);
  const photographer = await prisma.user.upsert({
    where: { email: "photographer@example.com" },
    update: {},
    create: {
      name: "Demo Photographer",
      email: "photographer@example.com",
      passwordHash: memberHash,
      role: "TEAM_MEMBER",
    },
  });
  console.log(`✅ Photographer: ${photographer.email}`);

  // ─── Create demo Event ────────────────────────────────────────────────────
  const event = await prisma.event.upsert({
    where: { id: "demo-wedding-event-id-000000" },
    update: {},
    create: {
      id: "demo-wedding-event-id-000000",
      name: "Arjun & Priya Wedding",
      description:
        "A beautiful destination wedding in Mumbai. The team will capture every special moment of this special day.",
      eventDate: new Date("2024-12-15T10:00:00.000Z"),
      location: "The Grand Ballroom, Mumbai",
      status: "ACTIVE",
      createdById: admin.id,
    },
  });
  console.log(`✅ Event: ${event.name}`);

  // ─── Assign photographer to event ─────────────────────────────────────────
  await prisma.eventMember.upsert({
    where: { eventId_userId: { eventId: event.id, userId: photographer.id } },
    update: {},
    create: { eventId: event.id, userId: photographer.id },
  });
  console.log(`✅ Assigned ${photographer.name} to ${event.name}`);

  // ─── Create demo gallery ──────────────────────────────────────────────────
  const pinHash = await bcryptjs.hash(galleryPin, 12);
  const gallery = await prisma.gallery.upsert({
    where: { publicSlug: "demo-wedding" },
    update: {},
    create: {
      eventId: event.id,
      name: "Arjun & Priya Wedding Gallery",
      publicSlug: "demo-wedding",
      pinHash,
      status: "DRAFT", // Not published — requires photos to be uploaded first
    },
  });
  console.log(`✅ Gallery created: /gallery/demo-wedding`);

  console.log("\n─────────────────────────────────────────────────────────");
  console.log("🎉 Seed complete!");
  console.log("\nDemo Credentials:");
  console.log(`  Admin:        admin@example.com / ${adminPassword}`);
  console.log(`  Photographer: photographer@example.com / ${memberPassword}`);
  console.log("\nDemo Gallery:");
  console.log(`  URL: /gallery/demo-wedding`);
  console.log(`  PIN: ${galleryPin}`);
  console.log("─────────────────────────────────────────────────────────\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
