import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 min-h-[44px] lg:min-h-0 w-full rounded-md border border-white/15 bg-white/5 pl-3 pr-3 pt-2 pb-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#F1DAE7]/50 focus:border-[#F1DAE7]/50 disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
