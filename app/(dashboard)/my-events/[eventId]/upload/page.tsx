import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { UploadClient } from "@/components/photos/upload-client";

type Props = { params: Promise<{ eventId: string }> };

export default async function UploadPage({ params }: Props) {
  const { eventId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id: string }).id;

  // Verify membership
  const membership = await prisma.eventMember.findUnique({
    where: { eventId_userId: { eventId, userId } },
    include: { event: { select: { id: true, name: true, status: true } } },
  });

  if (!membership) notFound();

  const myPhotos = await prisma.photo.findMany({
    where: { eventId, uploadedById: userId, status: { not: "DELETED" } },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      originalFilename: true,
      fileSize: true,
      status: true,
      thumbnailKey: true,
      createdAt: true,
    },
  });

  return (
    <UploadClient
      event={membership.event}
      myPhotos={myPhotos.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() }))}
    />
  );
}
