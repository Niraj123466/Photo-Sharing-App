import type { Metadata } from "next";
import Link from "next/link";
import { Camera, ShieldCheck, Zap, Cloud, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "Authentication | FrameVault",
  description: "Sign in or register for your FrameVault professional photography workstation",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#090A0F] text-zinc-100 flex flex-col lg:flex-row selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Left decorative workstation hero panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#0D0E15] border-r border-white/[0.08] flex-col justify-between p-12 lg:p-16">
        {/* Ambient radial glows */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none" />

        {/* Geometric dot-grid background */}
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.7) 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />

        {/* Top brand header */}
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform duration-200">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-xl tracking-tight text-white block">FrameVault</span>
              <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-400">
                PRO WORKSTATION
              </span>
            </div>
          </Link>
        </div>

        {/* Middle hero copy & feature showcase */}
        <div className="relative z-10 my-auto py-12 space-y-8 max-w-lg">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-mono">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Next-Generation Photography Suite</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white leading-tight">
              Capture moments. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-400 to-teal-300">
                Curate with precision.
              </span>
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              The collaborative studio operating system built for multi-photographer teams, real-time cloud curation, and instant PIN-secured client deliveries.
            </p>
          </div>

          <div className="space-y-4 pt-2">
            {[
              {
                icon: Zap,
                title: "Real-time Multi-Crew Ingestion",
                desc: "High-throughput parallel uploads with client-side chunking and instant thumbnail generation.",
              },
              {
                icon: ShieldCheck,
                title: "Zero-Knowledge PIN Galleries",
                desc: "Direct-to-client delivery protected by rate-limited 6-digit access tokens — no client accounts needed.",
              },
              {
                icon: Cloud,
                title: "Backblaze B2 S3 Cloud Fabric",
                desc: "Enterprise-grade object storage with presigned URLs and sub-100ms regional asset distribution.",
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3.5 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-white/10 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                  <feature.icon className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-zinc-200">{feature.title}</p>
                  <p className="text-[11px] text-zinc-400 leading-normal">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom footer quote */}
        <div className="relative z-10 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-zinc-400 font-mono">
          <span>Enterprise SLA · 99.9% Uptime</span>
          <span>v2.4.0 Obsidian Engine</span>
        </div>
      </div>

      {/* Right form viewport */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-16 relative">
        {/* Subtle background glow on mobile */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none lg:hidden" />

        <div className="w-full max-w-md relative z-10">
          {/* Mobile brand header */}
          <div className="lg:hidden text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                <Camera className="w-4 h-4" />
              </div>
              <span className="font-bold text-lg tracking-tight text-white">FrameVault</span>
            </Link>
            <p className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
              Professional Photography Workstation
            </p>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
