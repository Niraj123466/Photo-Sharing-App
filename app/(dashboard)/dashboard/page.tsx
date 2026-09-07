import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id: string }).id;
  const role = (session.user as { role: string }).role;

  let stats;
  if (role === "ADMIN") {
    const [totalEvents, activeEvents, totalPhotos, publishedGalleries] = await Promise.all([
      prisma.event.count({ where: { createdById: userId } }),
      prisma.event.count({ where: { createdById: userId, status: "ACTIVE" } }),
      prisma.photo.count({ where: { event: { createdById: userId }, status: { not: "DELETED" } } }),
      prisma.gallery.count({ where: { event: { createdById: userId }, status: "PUBLISHED" } }),
    ]);
    stats = { totalEvents, activeEvents, totalPhotos, publishedGalleries };
  } else {
    const [assignedEvents, myPhotos] = await Promise.all([
      prisma.eventMember.count({ where: { userId } }),
      prisma.photo.count({ where: { uploadedById: userId, status: { not: "DELETED" } } }),
    ]);
    stats = { assignedEvents, myPhotos };
  }

  const recentEvents =
    role === "ADMIN"
      ? await prisma.event.findMany({
          where: { createdById: userId },
          include: { _count: { select: { photos: true, members: true } } },
          orderBy: { createdAt: "desc" },
          take: 5,
        })
      : await prisma.event.findMany({
          where: { members: { some: { userId } } },
          include: { _count: { select: { photos: true, members: true } } },
          orderBy: { createdAt: "desc" },
          take: 5,
        });

  const adminStats = stats as typeof stats & {
    totalEvents?: number;
    activeEvents?: number;
    totalPhotos?: number;
    publishedGalleries?: number;
  };
  const memberStats = stats as typeof stats & {
    assignedEvents?: number;
    myPhotos?: number;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">
          Welcome back,{" "}
          <span className="gradient-text">{session.user.name?.split(" ")[0]}</span>
        </h1>
        <p className="text-muted-foreground mt-1">
          {role === "ADMIN"
            ? "Here's an overview of your photography platform."
            : "Here's your work overview."}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {role === "ADMIN" ? (
          <>
            <StatCard
              title="Total Events"
              value={adminStats.totalEvents ?? 0}
              icon="📅"
              color="primary"
            />
            <StatCard
              title="Active Events"
              value={adminStats.activeEvents ?? 0}
              icon="🟢"
              color="success"
            />
            <StatCard
              title="Total Photos"
              value={adminStats.totalPhotos ?? 0}
              icon="📷"
              color="info"
            />
            <StatCard
              title="Published Galleries"
              value={adminStats.publishedGalleries ?? 0}
              icon="🎨"
              color="warning"
            />
          </>
        ) : (
          <>
            <StatCard
              title="Assigned Events"
              value={memberStats.assignedEvents ?? 0}
              icon="📅"
              color="primary"
            />
            <StatCard
              title="My Photos"
              value={memberStats.myPhotos ?? 0}
              icon="📷"
              color="info"
            />
          </>
        )}
      </div>

      {/* Recent events */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Recent Events</h2>
          <Link
            href={role === "ADMIN" ? "/events" : "/my-events"}
            className="text-sm text-primary hover:underline"
          >
            View all →
          </Link>
        </div>

        {recentEvents.length === 0 ? (
          <EmptyState
            title="No events yet"
            description={
              role === "ADMIN"
                ? "Create your first event to get started."
                : "You haven't been assigned to any events yet."
            }
            action={
              role === "ADMIN" ? (
                <Link
                  href="/events/new"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  + Create Event
                </Link>
              ) : null
            }
          />
        ) : (
          <div className="grid gap-3">
            {recentEvents.map((event) => (
              <EventRow key={event.id} event={event} role={role} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: string;
  color: "primary" | "success" | "info" | "warning";
}) {
  const colorMap = {
    primary: "bg-violet-500/10 border-violet-500/20",
    success: "bg-green-500/10 border-green-500/20",
    info: "bg-blue-500/10 border-blue-500/20",
    warning: "bg-yellow-500/10 border-yellow-500/20",
  };

  return (
    <Card className={`${colorMap[color]} border`}>
      <CardContent className="p-5">
        <div className="text-2xl mb-2">{icon}</div>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{title}</div>
      </CardContent>
    </Card>
  );
}

function EventRow({
  event,
  role,
}: {
  event: {
    id: string;
    name: string;
    status: string;
    eventDate: Date;
    _count: { photos: number; members: number };
  };
  role: string;
}) {
  const statusColors = {
    DRAFT: "bg-yellow-500/15 text-yellow-400",
    ACTIVE: "bg-green-500/15 text-green-400",
    COMPLETED: "bg-blue-500/15 text-blue-400",
    ARCHIVED: "bg-gray-500/15 text-gray-400",
  };

  const href = role === "ADMIN" ? `/events/${event.id}` : `/my-events/${event.id}`;

  return (
    <Link href={href}>
      <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card/50 hover:bg-card/80 hover:border-primary/30 transition-all duration-200 group">
        <div>
          <p className="font-medium group-hover:text-primary transition-colors">{event.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date(event.eventDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}{" "}
            · {event._count.photos} photos · {event._count.members} members
          </p>
        </div>
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            statusColors[event.status as keyof typeof statusColors] ?? "bg-gray-500/15 text-gray-400"
          }`}
        >
          {event.status}
        </span>
      </div>
    </Link>
  );
}

function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="text-center py-12 rounded-xl border border-dashed border-border/50">
      <div className="text-4xl mb-3">📸</div>
      <h3 className="font-medium text-lg">{title}</h3>
      <p className="text-muted-foreground text-sm mt-1 mb-4">{description}</p>
      {action}
    </div>
  );
}
