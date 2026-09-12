import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/dashboard/nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-[#090A0F] text-slate-100 flex relative selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Subtle background ambient glow */}
      <div className="fixed top-0 right-1/4 w-[600px] h-[300px] bg-indigo-600/[0.03] blur-[120px] pointer-events-none -z-0" />
      <div className="fixed bottom-10 left-1/3 w-[500px] h-[250px] bg-cyan-600/[0.02] blur-[100px] pointer-events-none -z-0" />

      <DashboardNav user={session.user as { name: string; email: string; role: string }} />
      <main className="flex-1 lg:pl-60 min-h-screen flex flex-col z-10">
        <div className="flex-1 p-5 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
