"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, User, Mail, Shield, Lock, ArrowRight } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "ADMIN" as "ADMIN" | "TEAM_MEMBER",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error?.message ?? "Registration failed.");
      } else {
        toast.success("Account created successfully! Please sign in.");
        router.push("/login");
      }
    } catch {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="bg-[#0D0E15]/90 border border-white/10 shadow-2xl backdrop-blur-xl relative overflow-hidden">
      {/* Top rim highlight */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

      <CardHeader className="space-y-1.5 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-bold tracking-tight text-white">Create Account</CardTitle>
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <UserPlus className="w-4 h-4" />
          </div>
        </div>
        <CardDescription className="text-xs text-zinc-400 font-mono">
          JOIN AS LEAD PHOTOGRAPHER OR CREW MEMBER
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-mono uppercase tracking-wider text-zinc-300">
              Full Name
            </Label>
            <div className="relative">
              <User className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                id="name"
                placeholder="Jane Smith"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                className="pl-9 h-10 font-mono text-sm bg-[#141622] border-white/10 text-white placeholder:text-zinc-600 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-mono uppercase tracking-wider text-zinc-300">
              Email Address
            </Label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                id="email"
                type="email"
                placeholder="jane@studio.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
                autoComplete="email"
                className="pl-9 h-10 font-mono text-sm bg-[#141622] border-white/10 text-white placeholder:text-zinc-600 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="role" className="text-xs font-mono uppercase tracking-wider text-zinc-300">
              Workstation Role
            </Label>
            <div className="relative">
              <Shield className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                id="role"
                value={form.role}
                onChange={(e) =>
                  setForm((f) => ({ ...f, role: e.target.value as "ADMIN" | "TEAM_MEMBER" }))
                }
                className="w-full pl-9 pr-3 h-10 rounded-lg border border-white/10 bg-[#141622] text-sm text-zinc-100 font-mono focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="ADMIN" className="bg-[#141622] text-white">
                  Admin / Lead Photographer (Full Access)
                </option>
                <option value="TEAM_MEMBER" className="bg-[#141622] text-white">
                  Team Member / Photographer (Upload & Assigned Events)
                </option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-mono uppercase tracking-wider text-zinc-300">
              Password
            </Label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••••••"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                required
                minLength={8}
                className="pl-9 h-10 font-mono text-sm bg-[#141622] border-white/10 text-white placeholder:text-zinc-600 focus:border-indigo-500"
              />
            </div>
            <p className="text-[10px] text-zinc-400 font-mono">
              Min 8 characters with at least 1 uppercase and 1 number
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-xs font-mono uppercase tracking-wider text-zinc-300">
              Confirm Password
            </Label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••••••"
                value={form.confirmPassword}
                onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                required
                className="pl-9 h-10 font-mono text-sm bg-[#141622] border-white/10 text-white placeholder:text-zinc-600 focus:border-indigo-500"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-10 text-sm font-semibold tracking-wide mt-2"
            loading={loading}
          >
            {loading ? "Creating Account..." : "Create Workstation Account"}
          </Button>
        </form>

        <div className="text-center text-xs text-zinc-400 font-mono pt-2 border-t border-white/[0.08]">
          Already have an account?{" "}
          <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold hover:underline">
            Sign In Here →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
