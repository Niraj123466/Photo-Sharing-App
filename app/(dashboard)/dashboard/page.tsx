import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  CalendarDays,
  Activity,
  Camera,
  Globe2,
  Users,
  ArrowUpRight,
  Plus,
  Sparkles,
  ChevronRight,
  Clock,
  Layers,
} from "lucide-react";

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
          include: {
            _count: { select: { photos: true, members: true } },
            galleries: { select: { id: true, status: true, publicSlug: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 6,
        })
      : await prisma.event.findMany({
          where: { members: { some: { userId } } },
          include: {
            _count: { select: { photos: true, members: true } },
            galleries: { select: { id: true, status: true, publicSlug: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 6,
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
      {/* Top Header & Workstation Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-[4px]">
              WORKSPACE OVERVIEW
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-100">
            Welcome, {session.user.name?.split(" ")[0]}
          </h1>
          <p className="text-xs lg:text-sm text-slate-400 mt-0.5">
            {role === "ADMIN"
              ? "Monitor live operations, manage photographer teams, and curate client galleries."
              : "Review your assigned events and synchronize camera uploads."}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {role === "ADMIN" ? (
            <>
              <Link href="/events">
                <Button size="sm">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Event</span>
                </Button>
              </Link>
            </>
          ) : (
            <Link href="/my-events">
              <Button size="sm">
                <Camera className="w-3.5 h-3.5" />
                <span>Upload Photos</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* KPI Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {role === "ADMIN" ? (
          <>
            <StatCard
              title="Total Events"
              value={adminStats.totalEvents ?? 0}
              subtitle="Registered productions"
              icon={CalendarDays}
              variant="indigo"
            />
            <StatCard
              title="Active Events"
              value={adminStats.activeEvents ?? 0}
              subtitle="In progress & live"
              icon={Activity}
              variant="emerald"
            />
            <StatCard
              title="Total Photos"
              value={adminStats.totalPhotos ?? 0}
              subtitle="Synced to cloud storage"
              icon={Camera}
              variant="cyan"
            />
            <StatCard
              title="Client Galleries"
              value={adminStats.publishedGalleries ?? 0}
              subtitle="PIN-protected live"
              icon={Globe2}
              variant="amber"
            />
          </>
        ) : (
          <>
            <StatCard
              title="Assigned Events"
              value={memberStats.assignedEvents ?? 0}
              subtitle="Current crew assignments"
              icon={CalendarDays}
              variant="indigo"
            />
            <StatCard
              title="Photos Uploaded"
              value={memberStats.myPhotos ?? 0}
              subtitle="Processed assets"
              icon={Camera}
              variant="cyan"
            />
          </>
        )}
      </div>

      {/* Recent Events Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base lg:text-lg font-semibold tracking-tight text-slate-100">
              {role === "ADMIN" ? "Recent Events" : "My Assigned Events"}
            </h2>
            <p className="text-xs text-slate-400">
              {role === "ADMIN"
                ? "Active and recently finalized photography productions."
                : "Events ready for asset ingestion."}
            </p>
          </div>
          <Link
            href={role === "ADMIN" ? "/events" : "/my-events"}
            className="group inline-flex items-center gap-1 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <span>View all</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {recentEvents.length === 0 ? (
          <div className="p-10 text-center rounded-[8px] border border-dashed border-white/[0.08] bg-[#0D0E15]/50">
            <div className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-3 text-slate-400">
              <CalendarDays className="w-5 h-5" />
            </div>
            <h3 className="font-medium text-sm text-slate-200">No events found</h3>
            <p className="text-xs text-slate-400 mt-1 mb-4 max-w-sm mx-auto">
              {role === "ADMIN"
                ? "Get started by creating your first photography event."
                : "You have not been assigned to any events yet."}
            </p>
            {role === "ADMIN" && (
              <Link href="/events">
                <Button size="sm">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create First Event</span>
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recentEvents.map((event) => {
              const gallery = event.galleries[0];
              const isPublished = gallery?.status === "PUBLISHED";
              const href = role === "ADMIN" ? `/events/${event.id}` : `/my-events/${event.id}/upload`;

              return (
                <Link key={event.id} href={href} className="block group">
                  <Card className="h-full border-white/[0.08] bg-[#0D0E15] hover:border-white/[0.18] hover:bg-[#141622]/60 transition-all duration-200">
                    <CardContent className="p-4 flex flex-col justify-between h-full space-y-4">
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-semibold text-sm text-slate-100 group-hover:text-indigo-300 transition-colors line-clamp-1">
                            {event.name}
                          </h3>
                          <Badge
                            variant={
                              event.status === "ACTIVE"
                                ? "success"
                                : event.status === "DRAFT"
                                ? "warning"
                                : "secondary"
                            }
                            dot={event.status === "ACTIVE"}
                          >
                            {event.status}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <Clock className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <span className="font-mono text-[11px]">
                            {new Date(event.eventDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1 font-mono text-[11px]">
                            <Camera className="w-3 h-3 text-slate-400" />
                            {event._count.photos}
                          </span>
                          <span className="flex items-center gap-1 font-mono text-[11px]">
                            <Users className="w-3 h-3 text-slate-400" />
                            {event._count.members}
                          </span>
                        </div>

                        {isPublished ? (
                          <span className="font-mono text-[10px] text-emerald-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Gallery Live
                          </span>
                        ) : (
                          <span className="font-mono text-[10px] text-slate-400 group-hover:text-slate-200 transition-colors flex items-center gap-0.5">
                            Open <ArrowUpRight className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  variant: "indigo" | "emerald" | "cyan" | "amber";
}) {
  const variantStyles = {
    indigo: {
      border: "hover:border-indigo-500/30",
      iconBg: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
      accent: "text-indigo-400",
    },
    emerald: {
      border: "hover:border-emerald-500/30",
      iconBg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
      accent: "text-emerald-400",
    },
    cyan: {
      border: "hover:border-cyan-500/30",
      iconBg: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400",
      accent: "text-cyan-400",
    },
    amber: {
      border: "hover:border-amber-500/30",
      iconBg: "bg-amber-500/10 border-amber-500/20 text-amber-400",
      accent: "text-amber-400",
    },
  };

  const style = variantStyles[variant];

  return (
    <Card className={`border-white/[0.08] bg-[#0D0E15] ${style.border} transition-all duration-200 group`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-slate-400">{title}</span>
          <div className={`w-7 h-7 rounded-[6px] border flex items-center justify-center ${style.iconBg}`}>
            <Icon className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="font-mono text-2xl font-bold tracking-tight text-slate-100 tnum">
          {value.toLocaleString()}
        </div>
        <p className="text-[11px] text-slate-400 mt-1 truncate">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
