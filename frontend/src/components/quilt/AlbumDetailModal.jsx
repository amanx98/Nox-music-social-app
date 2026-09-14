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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="album-detail-title"
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-surface-raised p-5 shadow-4 text-left animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="font-mono text-2xs uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-accent/15 text-accent border border-accent/25">
              Rank #{String(rank).padStart(2, "0")}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-text hover:bg-surface transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="my-4 flex gap-4 items-center">
          {/* Cover Art (1:1 square, uncropped) */}
          <div className="w-32 h-32 rounded-lg overflow-hidden border border-border bg-surface-sunken flex-shrink-0">
            {album.image_url ? (
              <img
                src={album.image_url}
                alt={`${album.name} cover`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-text-dim">
                <Disc className="w-8 h-8 stroke-[1.5]" />
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <h2 id="album-detail-title" className="font-heading text-base sm:text-lg font-bold text-text line-clamp-2">
              {album.name}
            </h2>
            <p className="font-sans text-xs text-text-muted mt-0.5 truncate">{album.artist}</p>

            <div className="mt-3 p-2.5 rounded-lg bg-surface-sunken border border-border">
              <span className="font-mono text-[10px] uppercase tracking-wider text-text-dim block">Plays</span>
              <span className="font-mono text-base font-bold text-text tabular-nums">
                {Number(album.playcount || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* External Links */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-border">
          <div className="flex gap-2">
            <a
              href={lastfmUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border hover:border-border-hover bg-surface hover:bg-surface-hover text-xs font-medium text-text transition-colors"
            >
              <span>Last.fm</span>
              <ExternalLink className="w-3 h-3 text-text-dim" />
            </a>
            <a
              href={searchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border hover:border-border-hover bg-surface hover:bg-surface-hover text-xs font-medium text-text transition-colors"
            >
              <span>Spotify</span>
              <ExternalLink className="w-3 h-3 text-text-dim" />
            </a>
          </div>

          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
