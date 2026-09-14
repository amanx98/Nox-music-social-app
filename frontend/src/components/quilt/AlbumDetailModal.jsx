import { useEffect } from "react";
import { X, ExternalLink, Disc } from "lucide-react";
import Button from "../ui/Button";

export default function AlbumDetailModal({ album, rank, onClose }) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!album) return null;

  const lastfmUrl = `https://www.last.fm/music/${encodeURIComponent(album.artist)}/${encodeURIComponent(album.name)}`;
  const searchUrl = `https://open.spotify.com/search/${encodeURIComponent(album.name + " " + album.artist)}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="album-detail-title"
    >
      <div
        className="w-full max-w-xl sm:max-w-2xl rounded-2xl border border-border bg-surface-raised p-6 sm:p-7 shadow-5 text-left animate-slide-up flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="font-mono text-2xs uppercase tracking-wider font-bold px-2.5 py-1 rounded bg-accent/15 text-accent border border-accent/25">
              Rank #{String(rank).padStart(2, "0")}
            </span>
            <span className="font-mono text-2xs text-text-dim">
              Album Showcase
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text hover:bg-surface transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body: Large Cover Art + Rich Stats */}
        <div className="flex flex-col sm:flex-row gap-5 sm:gap-6 items-start">
          {/* Cover Art (1:1 square, uncropped, enlarged) */}
          <div className="w-full sm:w-52 sm:h-52 aspect-square rounded-xl overflow-hidden border border-border bg-surface-sunken flex-shrink-0 shadow-2 relative group">
            {album.image_url ? (
              <img
                src={album.image_url}
                alt={`${album.name} cover`}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-text-dim bg-surface-sunken">
                <Disc className="w-12 h-12 stroke-[1.5]" />
                <span className="mt-2 font-mono text-2xs">No Artwork</span>
              </div>
            )}
          </div>

          {/* Details & Information */}
          <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch">
            <div>
              <h2
                id="album-detail-title"
                className="font-heading text-xl sm:text-2xl font-black text-text tracking-tight leading-tight"
              >
                {album.name}
              </h2>
              <p className="font-sans text-sm sm:text-base font-semibold text-text-muted mt-1 truncate">
                {album.artist}
              </p>
            </div>

            {/* Scrobbles & Play Stats Card */}
            <div className="my-4 p-4 rounded-xl bg-surface-sunken border border-border flex items-center justify-between">
              <div>
                <span className="font-mono text-2xs uppercase tracking-wider text-text-dim block">
                  Total Scrobbles
                </span>
                <span className="font-mono text-2xl sm:text-3xl font-black text-accent tabular-nums">
                  {Number(album.playcount || 0).toLocaleString()}
                </span>
              </div>
              <div className="text-right font-mono text-2xs text-text-dim">
                <span>Top Rotation</span>
              </div>
            </div>

            {/* Streaming & Catalog Links */}
            <div className="flex flex-wrap gap-2 pt-1">
              <a
                href={searchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border hover:border-border-hover bg-surface hover:bg-surface-hover text-xs font-semibold text-text transition-colors"
              >
                <span>Spotify</span>
                <ExternalLink className="w-3.5 h-3.5 text-text-dim" />
              </a>
              <a
                href={lastfmUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border hover:border-border-hover bg-surface hover:bg-surface-hover text-xs font-semibold text-text transition-colors"
              >
                <span>Last.fm</span>
                <ExternalLink className="w-3.5 h-3.5 text-text-dim" />
              </a>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end pt-3 border-t border-border">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
