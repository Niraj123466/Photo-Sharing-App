import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function TeamPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = (session.user as { role: string }).role;
  if (role !== "ADMIN") redirect("/my-events");

  const userId = (session.user as { id: string }).id;

  const teamMembers = await prisma.user.findMany({
    where: { role: "TEAM_MEMBER" },
    select: { id: true, name: true, email: true, createdAt: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Team Members</h1>
        <p className="text-muted-foreground mt-1">All registered team members you can assign to events</p>
      </div>

      {teamMembers.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-dashed border-border/50">
          <div className="text-5xl mb-4">👥</div>
          <h3 className="text-xl font-medium">No team members yet</h3>
          <p className="text-muted-foreground mt-2 text-sm">
            Share the registration link so photographers can create accounts.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {teamMembers.map((member) => (
            <div
              key={member.id}
              className="p-4 rounded-xl border border-border/50 bg-card/50 hover:border-primary/30 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center font-semibold text-primary">
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-sm">{member.name}</p>
                  <p className="text-xs text-muted-foreground">{member.email}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
