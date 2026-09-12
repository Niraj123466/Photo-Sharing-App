"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogIn, KeyRound, Mail, Sparkles, Shield, UserCheck, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Invalid email or password. Please try again.");
      } else {
        toast.success("Welcome back! Redirecting to workstation...");
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function fillDemoCredentials(type: "admin" | "photographer") {
    if (type === "admin") {
      setForm({ email: "admin@example.com", password: "Admin@demo123" });
      toast.info("Admin credentials applied", { duration: 1500 });
    } else {
      setForm({ email: "photographer@example.com", password: "Member@demo123" });
      toast.info("Photographer credentials applied", { duration: 1500 });
    }
  }

  return (
    <Card className="bg-[#0D0E15]/90 border border-white/10 shadow-2xl backdrop-blur-xl relative overflow-hidden">
      {/* Top rim highlight */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

      <CardHeader className="space-y-1.5 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-bold tracking-tight text-white">Sign In</CardTitle>
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <LogIn className="w-4 h-4" />
          </div>
        </div>
        <CardDescription className="text-xs text-zinc-400 font-mono">
          AUTHENTICATE TO ACCESS WORKSTATION & GALLERIES
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-mono uppercase tracking-wider text-zinc-300">
              Email Address
            </Label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
                autoComplete="email"
                className="pl-9 h-10 font-mono text-sm bg-[#141622] border-white/10 text-white placeholder:text-zinc-600 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-xs font-mono uppercase tracking-wider text-zinc-300">
                Password
              </Label>
            </div>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••••••"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                required
                autoComplete="current-password"
                className="pl-9 h-10 font-mono text-sm bg-[#141622] border-white/10 text-white placeholder:text-zinc-600 focus:border-indigo-500"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-10 text-sm font-semibold tracking-wide"
            loading={loading}
          >
            {loading ? "Authenticating..." : "Sign In to Workstation"}
          </Button>
        </form>

        {/* Quick 1-Click Demo Credentials */}
        <div className="pt-2 border-t border-white/[0.08] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-indigo-400" /> One-Click Demo Access
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fillDemoCredentials("admin")}
              className="group text-left p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-indigo-500/40 hover:bg-indigo-500/[0.06] transition-all"
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200 group-hover:text-white">
                <Shield className="w-3.5 h-3.5 text-indigo-400" /> Admin
              </div>
              <p className="text-[10px] text-zinc-400 font-mono truncate mt-0.5">admin@example.com</p>
            </button>

            <button
              type="button"
              onClick={() => fillDemoCredentials("photographer")}
              className="group text-left p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-cyan-500/40 hover:bg-cyan-500/[0.06] transition-all"
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200 group-hover:text-white">
                <UserCheck className="w-3.5 h-3.5 text-cyan-400" /> Photographer
              </div>
              <p className="text-[10px] text-zinc-400 font-mono truncate mt-0.5">photographer@...</p>
            </button>
          </div>
        </div>

        <div className="text-center text-xs text-zinc-400 font-mono pt-1">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-indigo-400 hover:text-indigo-300 font-semibold hover:underline">
            Register Admin Account →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
