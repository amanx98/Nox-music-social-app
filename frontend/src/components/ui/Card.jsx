import { forwardRef } from "react";
import { cn } from "../../lib/cn";

export const Card = forwardRef(function Card(
  { className, hover = true, children, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(
        "bg-surface-raised border border-border rounded-md p-5 text-text transition-[border-color,box-shadow,transform] duration-200 ease-out",
        hover && "hover:border-border-strong hover:shadow-2",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
Card.displayName = "Card";

export const CardHeader = forwardRef(function CardHeader(
  { className, children, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn("flex flex-col gap-1 mb-4 pb-3 border-b border-border", className)}
      {...props}
    >
      {children}
    </div>
  );
});
CardHeader.displayName = "CardHeader";

export const CardTitle = forwardRef(function CardTitle(
  { className, children, ...props },
  ref
) {
  return (
    <h3
      ref={ref}
      className={cn("text-lg font-semibold text-text m-0 tracking-tight", className)}
      {...props}
    >
      {children}
    </h3>
  );
});
CardTitle.displayName = "CardTitle";

export const CardDescription = forwardRef(function CardDescription(
  { className, children, ...props },
  ref
) {
  return (
    <p
      ref={ref}
      className={cn("text-xs text-text-muted m-0 font-mono", className)}
      {...props}
    >
      {children}
    </p>
  );
});
CardDescription.displayName = "CardDescription";

export const CardBody = forwardRef(function CardBody(
  { className, children, ...props },
  ref
) {
  return (
    <div ref={ref} className={cn("text-sm text-text", className)} {...props}>
      {children}
    </div>
  );
});
CardBody.displayName = "CardBody";

export const CardFooter = forwardRef(function CardFooter(
  { className, children, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn("flex items-center justify-between gap-3 mt-4 pt-3 border-t border-border", className)}
      {...props}
    >
      {children}
    </div>
  );
});
CardFooter.displayName = "CardFooter";

Card.Header = CardHeader;
Card.Title = CardTitle;
Card.Description = CardDescription;
Card.Body = CardBody;
Card.Footer = CardFooter;
