import { useEffect } from "react";
import Button from "../ui/Button";
import Badge from "../ui/Badge";

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-950/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="album-detail-title"
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-border bg-surface-raised p-6 shadow-5 text-left animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Badge variant={rank === 1 ? "accent" : "secondary"}>
              Rank #{String(rank).padStart(2, "0")}
            </Badge>
            <span className="font-mono text-2xs uppercase text-muted tracking-wider">
              Topster Curation
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:text-text hover:bg-surface-sunken transition-colors"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="my-6 flex flex-col sm:flex-row gap-5 items-center sm:items-start">
          {/* Cover Art */}
          <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-xl overflow-hidden border border-border shadow-3 flex-shrink-0 bg-surface-sunken">
            {album.image_url ? (
              <img
                src={album.image_url}
                alt={`${album.name} cover`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-muted">
                <span className="text-4xl">💿</span>
                <span className="text-2xs font-mono mt-2">No Artwork</span>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0 text-center sm:text-left">
            <h2 id="album-detail-title" className="font-heading text-xl font-black text-text line-clamp-2">
              {album.name}
            </h2>
            <p className="text-base text-accent font-medium mt-1">{album.artist}</p>

            <dl className="mt-4 p-3 rounded-lg bg-surface-sunken border border-border inline-block sm:block text-left">
              <dt className="text-2xs font-mono uppercase text-muted tracking-wider">
                Scrobbled Plays
              </dt>
              <dd className="font-mono text-xl font-bold text-text tabular-nums mt-0.5">
                {Number(album.playcount || 0).toLocaleString()}
              </dd>
            </dl>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-4 border-t border-border justify-end">
          <a
            href={lastfmUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border hover:border-border-hover bg-surface hover:bg-surface-hover text-xs font-semibold text-text transition-colors"
          >
            <span>🔴</span> Last.fm Profile
          </a>
          <a
            href={searchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border hover:border-border-hover bg-surface hover:bg-surface-hover text-xs font-semibold text-text transition-colors"
          >
            <span>🟢</span> Spotify Search
          </a>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
