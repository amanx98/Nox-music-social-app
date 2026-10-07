import { cn } from "../../lib/cn";

/**
 * SectionHeader — a quiet section title with an optional single action.
 * Replaces the old "EYEBROW // LABEL" + UPPERCASE TITLE + subtitle stack.
 *
 * <SectionHeader title="From your circles" action={<Button size="sm">…</Button>} />
 */
export default function SectionHeader({
  title,
  description,
  action,
  as: Heading = "h2",
  id,
  size = "md",
  className,
}) {
  return (
    <div className={cn("flex items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        <Heading
          id={id}
          className={cn(
            "font-heading font-semibold tracking-tight text-text m-0",
            size === "lg" && "text-2xl",
            size === "md" && "text-base",
            size === "sm" && "text-sm"
          )}
        >
          {title}
        </Heading>
        {description && (
          <p className="text-sm text-text-dim m-0 mt-0.5 truncate">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
    </div>
  );
}
