import { forwardRef } from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/cn";

/** Small inline label. Neutral by default, sentence case, no mono. */
export const badgeVariants = cva(
  "inline-flex items-center gap-1 font-sans font-medium rounded-full border transition-colors select-none whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "bg-surface-hover text-text-muted border-border",
        accent: "bg-accent-muted text-accent border-transparent",
        secondary: "bg-secondary-muted text-text-muted border-transparent",
        danger: "bg-danger-muted text-danger border-transparent",
        outline: "bg-transparent text-text-muted border-border",
        graffiti: "bg-transparent text-text-muted border-border",
      },
      size: {
        sm: "text-[11px] px-2 py-0.5",
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
export default Badge;
