import { forwardRef } from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/cn";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium transition-[transform,background-color,border-color,box-shadow] duration-150 ease-out active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-45 disabled:pointer-events-none cursor-pointer select-none",
  {
    variants: {
      variant: {
        primary: "bg-white text-zinc-950 font-semibold hover:bg-zinc-200 shadow-1",
        secondary: "bg-surface-raised text-white border border-border hover:bg-surface-hover hover:border-white/30",
        outline: "bg-transparent text-white border border-border hover:bg-white/10 hover:border-white/30",
        ghost: "bg-transparent text-text-muted hover:text-white hover:bg-surface-hover",
        accent: "bg-accent text-zinc-950 font-semibold hover:bg-accent-hover shadow-1",
        danger: "bg-danger text-white hover:bg-danger-hover",
      },
      size: {
        sm: "h-8 px-3 text-xs rounded-lg",
        md: "h-9.5 px-4 text-sm rounded-lg",
        lg: "h-11 px-6 text-base rounded-xl",
        icon: "h-9 w-9 p-0 rounded-lg",
      },
      full: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export const Button = forwardRef(function Button(
  { className, variant, size, full, children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, full }), className)}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = "Button";
export default Button;
