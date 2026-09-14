import { useRef } from "react";
import { cn } from "../../lib/cn";

export default function TagBrowser({ tags = [], selectedTag, onSelectTag }) {
  const scrollContainerRef = useRef(null);

  const handleScroll = (direction) => {
    if (!scrollContainerRef.current) return;
    const amount = direction === "left" ? -240 : 240;
    scrollContainerRef.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  return (
    <div className="relative w-full py-2.5 border-b border-border/60 bg-surface/40 backdrop-blur-sm">
      <div className="max-w-[1240px] mx-auto px-4 flex items-center gap-2">
        {/* Scroll Left Button */}
        <button
          type="button"
          onClick={() => handleScroll("left")}
          aria-label="Scroll tags left"
          className="hidden md:flex min-h-[36px] min-w-[36px] items-center justify-center rounded-full text-text-muted hover:text-text hover:bg-surface-raised transition-colors focus-visible:outline-2"
        >
          ‹
        </button>

        {/* Scrollable Container with Hidden Scrollbar */}
        <div
          ref={scrollContainerRef}
          className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1"
          tabIndex={0}
          role="region"
          aria-label="Filter by artist or genre tags"
        >
          {/* "All" Tag Pill */}
          <button
            type="button"
            onClick={() => onSelectTag(null)}
            className={cn(
              "min-h-[36px] px-3.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 select-none cursor-pointer flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-offset-2",
              !selectedTag
                ? "bg-accent text-accent-text font-semibold shadow-1"
                : "bg-surface-raised text-text-muted border border-border hover:text-text hover:border-border-strong"
            )}
          >
            <span>🌐</span>
            <span>All Frequencies</span>
          </button>

          {/* Dynamic Tags */}
          {tags.map((tag) => {
            const isSelected = selectedTag?.id === tag.id;
            const isArtist = tag.type === "artist";

            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => onSelectTag(isSelected ? null : tag)}
                className={cn(
                  "min-h-[36px] px-3.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 select-none cursor-pointer flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-offset-2",
                  isSelected
                    ? "bg-accent text-accent-text font-semibold shadow-1"
                    : isArtist
                    ? "bg-surface-raised text-text border border-border hover:border-accent hover:text-accent"
                    : "bg-surface-raised text-text-muted border border-border hover:border-border-strong hover:text-text"
                )}
              >
                <span>{isArtist ? "🎙️" : "🏷️"}</span>
                <span>#{tag.name}</span>
              </button>
            );
          })}
        </div>

        {/* Scroll Right Button */}
        <button
          type="button"
          onClick={() => handleScroll("right")}
          aria-label="Scroll tags right"
          className="hidden md:flex min-h-[36px] min-w-[36px] items-center justify-center rounded-full text-text-muted hover:text-text hover:bg-surface-raised transition-colors focus-visible:outline-2"
        >
          ›
        </button>
      </div>
    </div>
  );
}
