import { useRef } from "react";
import { Sparkles, Mic, Hash, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../lib/cn";

export default function TagBrowser({ tags = [], selectedTag, onSelectTag }) {
  const scrollContainerRef = useRef(null);

  const handleScroll = (direction) => {
    if (!scrollContainerRef.current) return;
    const amount = direction === "left" ? -240 : 240;
    scrollContainerRef.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  return (
    <div className="relative w-full py-2 border-b border-border/60 bg-surface/50 backdrop-blur-sm">
      <div className="max-w-[1240px] mx-auto px-4 flex items-center gap-1.5">
        {/* Scroll Left Button */}
        <button
          type="button"
          onClick={() => handleScroll("left")}
          aria-label="Scroll tags left"
          className="hidden md:flex w-7 h-7 items-center justify-center rounded-full text-text-muted hover:text-text hover:bg-surface-raised transition-colors focus-visible:outline-2 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Scrollable Container */}
        <div
          ref={scrollContainerRef}
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-0.5"
          tabIndex={0}
          role="region"
          aria-label="Filter by artist or genre tags"
        >
          {/* "All" Tag Pill */}
          <button
            type="button"
            onClick={() => onSelectTag(null)}
            className={cn(
              "h-7 px-3 rounded-full font-mono text-2xs uppercase tracking-wider font-semibold whitespace-nowrap transition-all duration-150 select-none cursor-pointer flex items-center gap-1.5 focus-visible:outline-2",
              !selectedTag
                ? "bg-accent text-surface shadow-1"
                : "bg-surface-raised text-text-muted border border-border hover:text-text hover:border-border-hover"
            )}
          >
            <Sparkles className="w-3 h-3 stroke-[2]" />
            <span>All</span>
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
                  "h-7 px-3 rounded-full font-mono text-2xs uppercase tracking-wider font-medium whitespace-nowrap transition-all duration-150 select-none cursor-pointer flex items-center gap-1.5 focus-visible:outline-2",
                  isSelected
                    ? "bg-accent text-surface font-semibold shadow-1"
                    : "bg-surface-raised text-text-muted border border-border hover:border-border-hover hover:text-text"
                )}
              >
                {isArtist ? (
                  <Mic className="w-2.5 h-2.5 stroke-[2] text-accent" />
                ) : (
                  <Hash className="w-2.5 h-2.5 stroke-[2] text-secondary" />
                )}
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
          className="hidden md:flex w-7 h-7 items-center justify-center rounded-full text-text-muted hover:text-text hover:bg-surface-raised transition-colors focus-visible:outline-2 cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
