import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-[6px] border border-white/[0.1] bg-[#0D0E15] px-3 py-1.5 text-sm text-slate-100 shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)] transition-all placeholder:text-slate-500 hover:border-white/[0.16] focus-visible:outline-none focus-visible:border-indigo-500 focus-visible:bg-[#141622] focus-visible:ring-2 focus-visible:ring-indigo-500/25 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
