import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  loading?: boolean;
}

const variantClasses = {
  default:
    "bg-primary text-primary-foreground font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_1px_3px_rgba(0,0,0,0.4)] hover:bg-primary/95 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_0_16px_rgba(99,102,241,0.35)] transition-all",
  destructive:
    "bg-destructive/90 text-destructive-foreground hover:bg-destructive shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]",
  outline:
    "border border-white/[0.1] bg-card/60 text-slate-200 hover:bg-white/[0.05] hover:text-white hover:border-white/[0.18] shadow-sm",
  secondary:
    "bg-[#141622] text-slate-200 border border-white/[0.08] hover:bg-[#1D2032] hover:text-white hover:border-white/[0.14] shadow-sm",
  ghost:
    "text-slate-400 hover:text-slate-100 hover:bg-white/[0.06]",
  link:
    "text-primary underline-offset-4 hover:underline",
};

const sizeClasses = {
  default: "h-9 px-4 py-2 text-sm",
  sm: "h-8 px-3 text-xs font-medium rounded-[6px]",
  lg: "h-10 px-6 text-sm font-medium",
  icon: "h-8 w-8 p-0 flex items-center justify-center",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
