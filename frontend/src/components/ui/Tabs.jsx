import { useRef } from "react";
import { cn } from "../../lib/cn";

/**
 * Tabs — underline-style tab list with roving keyboard focus.
 *
 * <Tabs
 *   value={tab}
 *   onChange={setTab}
 *   items={[{ value: "posts", label: "Posts", count: 4 }, …]}
 * />
 */
export default function Tabs({ items, value, onChange, className, ariaLabel = "Tabs" }) {
  const listRef = useRef(null);

  function handleKeyDown(e) {
    const idx = items.findIndex((i) => i.value === value);
    let next = null;
    if (e.key === "ArrowRight") next = (idx + 1) % items.length;
    if (e.key === "ArrowLeft") next = (idx - 1 + items.length) % items.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = items.length - 1;
    if (next === null) return;
    e.preventDefault();
    onChange(items[next].value);
    listRef.current?.querySelectorAll('[role="tab"]')[next]?.focus();
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className={cn("flex items-center gap-5 border-b border-border overflow-x-auto", className)}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(item.value)}
            className={cn(
              "relative -mb-px h-10 inline-flex items-center gap-1.5 text-sm whitespace-nowrap border-b-2 transition-colors cursor-pointer",
              active
                ? "border-text text-text font-medium"
                : "border-transparent text-text-dim hover:text-text-muted"
            )}
          >
            {item.label}
            {typeof item.count === "number" && item.count > 0 && (
              <span className="text-xs text-text-dim tabular-nums">{item.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
