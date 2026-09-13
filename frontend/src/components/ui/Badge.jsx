import { forwardRef } from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/cn";

export const badgeVariants = cva(
  "inline-flex items-center gap-1.5 font-mono text-2xs uppercase tracking-wide px-2 py-0.5 rounded-sm border transition-colors select-none",
  {
    variants: {
      variant: {
        default: "bg-surface-sunken text-text-muted border-border",
        accent: "bg-accent/15 text-accent border-accent/30",
        secondary: "bg-secondary/15 text-secondary border-secondary/30",
        danger: "bg-danger/15 text-danger border-danger/30",
        outline: "bg-transparent text-text border-border",
        graffiti: "font-graffiti lowercase text-xs tracking-normal bg-accent/10 text-accent border-accent/25",
      },
      size: {
        sm: "text-2xs px-1.5 py-0.5",
        md: "text-xs px-2.5 py-1",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "sm",
    },
  }
);

export const Badge = forwardRef(function Badge(
  { className, variant, size, children, ...props },
  ref
) {
  return (
    <span
      ref={ref}
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    >
      {children}
    </span>
  );
});

Badge.displayName = "Badge";
