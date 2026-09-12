import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "cyan";
  dot?: boolean;
}

const variantClasses = {
  default: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  secondary: "bg-white/[0.04] text-slate-300 border-white/[0.08]",
  destructive: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  outline: "border-white/[0.12] text-slate-300 bg-transparent",
  success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  cyan: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
};

const dotColors = {
  default: "bg-indigo-400",
  secondary: "bg-slate-400",
  destructive: "bg-rose-400",
  outline: "bg-slate-400",
  success: "bg-emerald-400 animate-pulse",
  warning: "bg-amber-400",
  cyan: "bg-cyan-400 animate-pulse",
};

export function Badge({ className, variant = "default", dot = false, children, ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[5px] border px-2 py-0.5 font-mono text-[11px] font-medium tracking-tight transition-colors",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {dot && (
        <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", dotColors[variant])} />
      )}
      <span>{children}</span>
    </div>
  );
}
