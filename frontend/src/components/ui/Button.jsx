import { forwardRef } from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/cn";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium transition-[transform,background-color,border-color,box-shadow,color] duration-150 ease-out active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-45 disabled:pointer-events-none cursor-pointer select-none",
  {
    variants: {
      variant: {
        primary: "bg-accent text-black font-heading font-bold hover:bg-accent-hover hover:text-black shadow-1",
        secondary: "bg-black text-text border border-border-strong hover:bg-surface-hover hover:text-text hover:border-accent",
        outline: "bg-black/50 text-text border border-border-strong hover:bg-accent hover:text-black hover:border-accent",
        ghost: "bg-transparent text-text-muted hover:text-text hover:bg-surface-hover",
        accent: "bg-accent text-black font-heading font-bold hover:bg-accent-hover hover:text-black shadow-1",
        danger: "bg-danger text-danger-text font-heading font-bold hover:bg-danger-hover",
      },
      size: {
        sm: "h-8 px-3 text-xs rounded-md",
        md: "h-9 px-4 text-xs sm:text-sm rounded-md",
        lg: "h-10 px-5 text-sm sm:text-base rounded-md",
        icon: "h-8 w-8 p-0 rounded-md",
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
