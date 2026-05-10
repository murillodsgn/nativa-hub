"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 min-h-[44px] lg:min-h-0",
  {
    variants: {
      variant: {
        default:
          "bg-[#F1DAE7] text-[#101010] hover:bg-[#e8c8d8] focus-visible:ring-[#F1DAE7] focus-visible:ring-offset-[#101010]",
        ghost:
          "text-white hover:bg-white/10 focus-visible:ring-white focus-visible:ring-offset-[#101010]",
        outline:
          "border border-white/20 text-white hover:bg-white/10 focus-visible:ring-white focus-visible:ring-offset-[#101010]",
        destructive:
          "bg-red-900 text-white hover:bg-red-800 focus-visible:ring-red-500 focus-visible:ring-offset-[#101010]",
      },
      size: {
        default: "h-10 pl-4 pr-4 pt-2 pb-2",
        sm: "h-8 pl-3 pr-3 text-xs",
        lg: "h-12 pl-6 pr-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
