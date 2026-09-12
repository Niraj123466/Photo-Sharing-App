"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Camera,
  LogOut,
  Menu,
  X,
  Sparkles,
  Shield,
  Layers,
  ExternalLink,
} from "lucide-react";

type NavUser = { name: string; email: string; role: string };

const adminNavItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    badge: undefined,
  },
  {
    label: "Events",
    href: "/events",
    icon: Calendar,
    badge: undefined,
  },
  {
    label: "Team",
    href: "/team",
    icon: Users,
    badge: undefined,
  },
];

const memberNavItems = [
  {
    label: "My Events",
    href: "/my-events",
    icon: Calendar,
    badge: undefined,
  },
];

export function DashboardNav({ user }: { user: NavUser }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = user.role === "ADMIN" ? adminNavItems : memberNavItems;

  const NavContent = () => (
    <div className="flex flex-col h-full bg-[#0D0E15] text-slate-200">
      {/* Brand & Workspace Bar */}
      <div className="p-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[7px] bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
            <Camera className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm tracking-tight text-slate-100">FrameVault</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate">Event Photography Operations</p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        <div>
          <p className="px-2 pb-2 text-[10px] font-mono uppercase tracking-wider text-slate-400">
            Workspace
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "group relative flex items-center gap-2.5 px-2.5 py-2 rounded-[6px] text-xs font-medium transition-all duration-150",
                    isActive
                      ? "bg-indigo-500/[0.12] text-indigo-300 border border-indigo-500/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                      : "text-slate-300 hover:bg-white/[0.04] hover:text-slate-100"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-4 h-4 transition-colors",
                      isActive ? "text-indigo-400" : "text-slate-400 group-hover:text-slate-200"
                    )}
                  />
                  <span className="flex-1 truncate">{item.label}</span>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Quick Links / Client Portal Helper */}
        <div>
          <p className="px-2 pb-2 text-[10px] font-mono uppercase tracking-wider text-slate-400">
            Quick Actions
          </p>
          <div className="space-y-1">
            <Link
              href="/gallery/demo-wedding"
              target="_blank"
              className="flex items-center justify-between px-2.5 py-2 rounded-[6px] text-xs text-slate-300 hover:bg-white/[0.04] hover:text-slate-100 transition-colors group"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Demo Client Gallery</span>
              </span>
              <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-slate-200" />
            </Link>
          </div>
        </div>
      </div>

      {/* User Section & Account Drawer */}
      <div className="p-3 border-t border-white/[0.08] bg-[#090A0F]/60">
        <div className="p-2.5 rounded-[7px] border border-white/[0.06] bg-[#141622]/60 mb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500/20 to-cyan-500/20 border border-white/[0.12] flex items-center justify-center font-mono text-xs font-semibold text-indigo-300 flex-shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-200 truncate">{user.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 font-mono text-[9px] uppercase px-1.5 py-0.2 rounded font-medium",
                    user.role === "ADMIN"
                      ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
                      : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                  )}
                >
                  <Shield className="w-2.5 h-2.5" />
                  {user.role === "ADMIN" ? "Admin Lead" : "Photographer"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-[6px] text-xs font-medium text-slate-300 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all duration-150"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:w-60 lg:flex-col border-r border-white/[0.08] z-40">
        <NavContent />
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-13 border-b border-white/[0.08] bg-[#090A0F]/90 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Camera className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-slate-100">FrameVault</span>
          <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
            PRO
          </span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 rounded-[6px] border border-white/[0.08] bg-white/[0.03] text-slate-300 hover:text-white transition-colors"
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-[#0D0E15] border-r border-white/[0.08] flex flex-col animate-slide-in">
            <NavContent />
          </aside>
        </div>
      )}

      {/* Mobile content padding */}
      <div className="lg:hidden h-13" />
    </>
  );
}
