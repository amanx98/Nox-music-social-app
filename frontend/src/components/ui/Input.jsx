import { forwardRef } from "react";
import { cn } from "../../lib/cn";

export const Input = forwardRef(function Input(
  { className, type = "text", ...props },
  ref
) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-9 w-full rounded-md border border-border bg-surface-sunken px-3 py-1.5 text-sm text-text placeholder:text-text-dim transition-[border-color,box-shadow] duration-150 outline-none focus-visible:border-border-hover focus-visible:ring-3 focus-visible:ring-accent-muted disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
});

Input.displayName = "Input";
export default Input;
