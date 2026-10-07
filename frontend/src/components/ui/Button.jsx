import { forwardRef } from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/cn";

/**
 * Button
 * - primary:   the ONE main action on a screen (accent). Use sparingly.
 * - secondary: neutral filled, for most actions.
 * - ghost:     text-only, for toolbars and low-priority actions.
 * - danger:    destructive actions.
 * `outline` and `accent` are kept as aliases for backwards compatibility.
 */
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 font-sans font-medium whitespace-nowrap transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-45 disabled:pointer-events-none cursor-pointer select-none",
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-text hover:bg-accent-hover",
        accent: "bg-accent text-accent-text hover:bg-accent-hover",
        secondary: "bg-surface-hover text-text border border-border hover:border-border-strong hover:bg-surface-raised",
        outline: "bg-transparent text-text border border-border-strong hover:bg-surface-hover",
        ghost: "bg-transparent text-text-muted hover:text-text hover:bg-surface-hover",
        danger: "bg-transparent text-danger border border-danger/40 hover:bg-danger-muted",
      },
      size: {
        sm: "h-8 px-3 text-xs rounded-md",
        md: "h-9 px-4 text-sm rounded-md",
        lg: "h-10 px-5 text-sm rounded-md",
        icon: "h-8 w-8 p-0 rounded-md",
      },
      full: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "md",
    },
  }
);

export const Button = forwardRef(function Button(
  { className, variant, size, full, type = "button", children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size, full }), className)}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = "Button";
export default Button;
