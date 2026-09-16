import { useState, useEffect } from "react";
import { Radio, ArrowRight, Loader2 } from "lucide-react";
import { getTags } from "../../api/client";

const EDITORIAL_GENRES = [
  {
    name: "ambient",
    title: "Ambient & Drone",
    artwork: "/assets/editorial/ambient.svg",
    signal: "1.4k listening",
    members: 1420,
  },
  {
    name: "industrial",
    title: "Industrial Synth",
    artwork: "/assets/editorial/industrial.svg",
    signal: "890 crates",
    members: 890,
  },
  {
    name: "acid-house",
    title: "Acid House & 303",
    artwork: "/assets/editorial/acid-house.svg",
    signal: "640 live",
    members: 640,
  },
  {
    name: "lofi-tape",
    title: "Lo-Fi Tape & Dub",
    artwork: "/assets/editorial/lofi-tape.svg",
    signal: "510 cassettes",
    members: 510,
  },
];

export default function DiscoveryRail({ onSelectTag, selectedTag }) {
  const [dbTags, setDbTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    getTags()
      .then((data) => {
        if (isMounted) {
          setDbTags(data || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || "Failed to load tags");
          setLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  function handleTagClick(genre) {
    // Find matching tag from database or construct tag object
    const matched = dbTags.find(
      (t) => t.name.toLowerCase() === genre.name.toLowerCase()
    );
    if (matched) {
      onSelectTag?.(matched);
    } else {
      onSelectTag?.({ id: genre.name, name: genre.name, type: "genre" });
    }
  }

  return (
    <aside
      aria-label="Discovery Rail"
      className="rounded-md border border-border bg-surface-raised p-4 space-y-3.5 shadow-1 text-left"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-widest text-accent font-bold">
            SCENE RADAR
          </div>
          <h3 className="font-heading font-extrabold text-sm uppercase tracking-tight text-text m-0">
            Discover
          </h3>
        </div>
        <Radio className="w-4 h-4 text-text-dim" />
      </div>

      {/* Loading State */}
      {loading && (
        <div className="py-6 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-accent" />
          <span className="font-mono text-2xs text-text-dim">Scanning frequencies...</span>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="p-2.5 rounded bg-danger-muted/30 border border-danger/40 text-2xs text-rose-200">
          Frequency scan limited: using local editorial index.
        </div>
      )}

      {/* Four Active Editorial Genres / Communities */}
      <div className="space-y-2">
        {EDITORIAL_GENRES.map((genre) => {
          const isSelected =
            selectedTag?.name?.toLowerCase() === genre.name.toLowerCase();

          return (
            <div
              key={genre.name}
              onClick={() => handleTagClick(genre)}
              className={`p-2 rounded-md border transition-all cursor-pointer flex items-center gap-3 group ${
                isSelected
                  ? "bg-surface border-accent ring-1 ring-accent"
                  : "bg-surface-sunken border-border hover:border-border-strong hover:bg-surface"
              }`}
            >
              {/* Square Artwork Thumbnail */}
              <div className="w-12 h-12 rounded overflow-hidden border border-border shrink-0 bg-surface">
                <img
                  src={genre.artwork}
                  alt={genre.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              {/* Information */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="font-heading font-bold text-xs text-text group-hover:text-accent transition-colors truncate m-0">
                    {genre.title}
                  </h4>
                  <ArrowRight className="w-3 h-3 text-text-dim group-hover:text-accent group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
                <div className="flex items-center gap-2 font-mono text-[10px] text-text-dim mt-0.5">
                  <span className="text-accent font-semibold">#{genre.name}</span>
                  <span>&middot;</span>
                  <span>{genre.signal}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Clear Active Filter Trigger */}
      {selectedTag && (
        <button
          type="button"
          onClick={() => onSelectTag?.(null)}
          className="w-full py-1.5 px-2 rounded font-mono text-[10px] text-text-dim hover:text-text border border-dashed border-border hover:border-text-dim text-center transition-colors cursor-pointer"
        >
          Viewing #{selectedTag.name} &middot; Click to show all
        </button>
      )}
    </aside>
  );
}
