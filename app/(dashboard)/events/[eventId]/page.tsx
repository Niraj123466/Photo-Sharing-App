import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { EventDetailClient } from "@/components/events/event-detail-client";

type Props = { params: Promise<{ eventId: string }> };

export default async function EventDetailPage({ params }: Props) {
  const { eventId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id: string }).id;
  const role = (session.user as { role: string }).role;

  let event;
  if (role === "ADMIN") {
    event = await prisma.event.findFirst({
      where: { id: eventId, createdById: userId },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
        },
        galleries: {
          include: { _count: { select: { photos: true } } },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        _count: { select: { photos: true } },
      },
    });
  }

  if (!event) return notFound();

  // Get all available team members (not already assigned)
  const assignedIds = event.members.map((m) => m.userId);
  const availableUsers = await prisma.user.findMany({
    where: {
      id: { notIn: [userId, ...assignedIds] },
    },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });

  // Get photo counts
  const [readyPhotos, selectedPhotos] = await Promise.all([
    prisma.photo.count({ where: { eventId, status: "READY" } }),
    event.galleries[0]
      ? prisma.galleryPhoto.count({ where: { galleryId: event.galleries[0].id } })
      : Promise.resolve(0),
  ]);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <EventDetailClient
      event={{
        id: event.id,
        name: event.name,
        description: event.description,
        eventDate: event.eventDate.toISOString(),
        location: event.location,
        status: event.status,
        galleries: event.galleries.map((g) => ({
          ...g,
          publishedAt: g.publishedAt?.toISOString() ?? null,
          createdAt: g.createdAt.toISOString(),
          updatedAt: g.updatedAt.toISOString(),
        })),
      }}
      members={event.members}
      availableUsers={availableUsers}
      readyPhotos={readyPhotos}
      selectedPhotos={selectedPhotos}
      appUrl={appUrl}
    />
  );
}
