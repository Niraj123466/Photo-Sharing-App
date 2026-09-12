import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, UserPlus, Shield, Mail, Calendar, Camera } from "lucide-react";

export default async function TeamPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = (session.user as { role: string }).role;
  if (role !== "ADMIN") redirect("/my-events");

  const teamMembers = await prisma.user.findMany({
    where: { role: "TEAM_MEMBER" },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      _count: { select: { photos: true, eventMembers: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6 animate-fade-in text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-[4px]">
              CREW MANAGEMENT
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-100">Team Photographers</h1>
          <p className="text-xs lg:text-sm text-slate-400 mt-0.5">
            Registered team members who can be assigned to shoot productions.
          </p>
        </div>
      </div>

      {/* Roster Grid */}
      {teamMembers.length === 0 ? (
        <div className="text-center py-16 rounded-[8px] border border-dashed border-white/[0.08] bg-[#0D0E15]/50">
          <div className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-3 text-slate-400">
            <Users className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-sm text-slate-200">No team members registered</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Share the registration portal with your photographers to onboard them to FrameVault.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {teamMembers.map((member) => (
            <Card
              key={member.id}
              className="border-white/[0.08] bg-[#0D0E15] hover:border-white/[0.18] transition-all group"
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center font-mono text-xs font-semibold text-indigo-300 flex-shrink-0">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-xs text-slate-100 group-hover:text-indigo-300 transition-colors">
                        {member.name}
                      </p>
                      <p className="text-[11px] font-mono text-slate-400">{member.email}</p>
                    </div>
                  </div>

                  <Badge variant="secondary">Crew</Badge>
                </div>

                <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400 font-mono text-[11px]">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    {member._count.eventMembers} events
                  </span>
                  <span className="flex items-center gap-1">
                    <Camera className="w-3 h-3 text-slate-400" />
                    {member._count.photos} uploads
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
