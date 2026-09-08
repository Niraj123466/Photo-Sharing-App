import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { MyEventsClient } from "@/components/team/my-events-client";

export default async function MyEventsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id: string }).id;

  const events = await prisma.event.findMany({
    where: { members: { some: { userId } } },
    include: {
      creator: { select: { name: true, email: true } },
      _count: { select: { photos: true } },
    },
    orderBy: { eventDate: "desc" },
  });

  const myPhotoCounts = await prisma.photo.groupBy({
    by: ["eventId"],
    where: { uploadedById: userId, status: { not: "DELETED" } },
    _count: { id: true },
  });

  const photoCountMap = Object.fromEntries(
    myPhotoCounts.map((c) => [c.eventId, c._count.id])
  );

  return (
    <MyEventsClient
      events={events.map((e) => ({
        ...e,
        eventDate: e.eventDate.toISOString(),
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
        myPhotoCount: photoCountMap[e.id] ?? 0,
      }))}
    />
  );
}
