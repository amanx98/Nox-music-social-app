import { useState, useEffect, useRef } from "react";
import { X, Play, Pause, MessageSquare, Disc, Users } from "lucide-react";
import { getArtistDetails } from "../api/client";
import { useToast } from "./Toast";
import Button from "./ui/Button";

export default function ArtistModal({ artist, onClose, onSelectTag }) {
  const { addToast } = useToast();
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [playingTrackId, setPlayingTrackId] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!artist?.name) return;

    let isMounted = true;
    setLoading(true);

    getArtistDetails(artist.name)
      .then((data) => {
        if (isMounted) {
          setDetails(data);
          setActivePhotoIndex(0);
        }
      })
      .catch(() => {
        if (isMounted) {
          setDetails(null);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [artist]);

  function handlePlayPreview(track) {
    if (!track.preview) {
      addToast("No audio preview available for this track", "error");
      return;
    }

    if (playingTrackId === track.id) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingTrackId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(track.preview);
    audioRef.current = audio;
    audio.play();
    setPlayingTrackId(track.id);

    audio.onended = () => {
      setPlayingTrackId(null);
    };

    audio.onerror = () => {
      addToast("Failed to stream audio preview", "error");
      setPlayingTrackId(null);
    };
  }

  if (!artist) return null;

  const photos = details?.images && details.images.length > 0
    ? details.images
    : details?.image
    ? [details.image]
    : [];

  const currentPhoto = photos[activePhotoIndex];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="artist-modal-title"
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-surface-raised shadow-5 text-left flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ====================================================================
            Hero Header: Ambient Blurred Layer + Properly Framed Artist Photo
            (Fixes harsh cropping and decapitation!)
           ==================================================================== */}
        <div className="relative h-64 sm:h-72 overflow-hidden border-b border-border bg-surface-sunken flex items-end p-5 sm:p-6">
          {/* Layer 1: Ambient Blurred Backdrop for rich color mood */}
          {currentPhoto && (
            <div
              className="absolute inset-0 bg-cover bg-center scale-110 blur-xl opacity-35"
              style={{ backgroundImage: `url(${currentPhoto})` }}
              aria-hidden="true"
            />
          )}

          {/* Layer 2: Main Focused Artist Photo with Top-Center Alignment */}
          {currentPhoto ? (
            <img
              src={currentPhoto}
              alt={artist.name}
              className="absolute inset-0 w-full h-full object-cover object-[center_25%]"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-text-dim">
              <Disc className="w-16 h-16 stroke-[1]" />
            </div>
          )}

          {/* Layer 3: Smooth bottom dark gradient vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-surface-raised via-surface-raised/60 to-black/40" />

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3.5 right-3.5 z-20 w-8 h-8 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Artist Headline Info */}
          <div className="relative z-10 w-full">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="font-mono text-2xs uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-accent/20 text-accent border border-accent/30">
                Artist Spotlight
              </span>
              {artist.playcount && (
                <span className="font-mono text-2xs uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-secondary/20 text-secondary border border-secondary/30">
                  {Number(artist.playcount).toLocaleString()} plays
                </span>
              )}
            </div>

            <h1
              id="artist-modal-title"
              className="font-heading font-black text-2xl sm:text-3xl text-white tracking-tight"
            >
              {artist.name}
            </h1>

            {details?.fans && (
              <div className="font-mono text-xs text-white/70 mt-1 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                <span>{details.fans.toLocaleString()} fans</span>
              </div>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {loading ? (
            <div className="py-12 text-center flex flex-col items-center">
              <Disc className="w-8 h-8 text-accent animate-spin" />
              <p className="font-mono text-xs text-text-muted mt-3">Loading artist profile...</p>
            </div>
          ) : (
            <>
              {/* Photo Gallery Thumbnails */}
              {photos.length > 1 && (
                <div className="space-y-2">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-text-dim block">
                    Gallery ({photos.length})
                  </span>
                  <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {photos.map((imgUrl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActivePhotoIndex(idx)}
                        className={`w-16 h-16 rounded-lg overflow-hidden border flex-shrink-0 transition-all cursor-pointer ${
                          activePhotoIndex === idx
                            ? "border-accent ring-2 ring-accent/30 scale-102"
                            : "border-border opacity-60 hover:opacity-100"
                        }`}
                      >
                        <img
                          src={imgUrl}
                          alt={`${artist.name} ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Top Tracks */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading font-bold text-sm sm:text-base text-text">
                    Top Tracks
                  </h3>
                  <span className="font-mono text-2xs text-text-dim">
                    {details?.top_tracks?.length || 0} tracks
                  </span>
                </div>

                {!details?.top_tracks || details.top_tracks.length === 0 ? (
                  <div className="rounded-xl border border-border bg-surface-sunken p-5 text-center text-text-muted text-xs">
                    No preview tracks available for this artist.
                  </div>
                ) : (
                  <div className="rounded-xl border border-border bg-surface overflow-hidden divide-y divide-border/60">
                    {details.top_tracks.map((track, i) => {
                      const isPlaying = playingTrackId === track.id;

                      return (
                        <div
                          key={track.id || i}
                          className="p-2.5 sm:px-3.5 flex items-center justify-between gap-3 hover:bg-surface-raised/40 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {/* Play button */}
                            {track.preview ? (
                              <button
                                type="button"
                                onClick={() => handlePlayPreview(track)}
                                aria-label={isPlaying ? "Pause preview" : "Play preview"}
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                                  isPlaying
                                    ? "bg-accent text-surface"
                                    : "bg-surface-raised text-text hover:bg-accent hover:text-surface border border-border"
                                }`}
                              >
                                {isPlaying ? (
                                  <Pause className="w-3.5 h-3.5 fill-current" />
                                ) : (
                                  <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />
                                )}
                              </button>
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-surface-sunken border border-border flex items-center justify-center text-text-dim font-mono text-xs">
                                {i + 1}
                              </div>
                            )}

                            {/* Album art & info */}
                            {track.album?.cover_medium && (
                              <img
                                src={track.album.cover_medium}
                                alt={track.title}
                                className="w-9 h-9 rounded object-cover border border-border flex-shrink-0"
                              />
                            )}

                            <div className="min-w-0 flex-1">
                              <div className="font-sans font-semibold text-xs sm:text-sm text-text truncate">
                                {track.title}
                              </div>
                              <div className="font-mono text-2xs text-text-dim truncate">
                                {track.album?.title || artist.name}
                              </div>
                            </div>
                          </div>

                          <div className="font-mono text-2xs text-text-dim flex-shrink-0">
                            {track.duration ? `${Math.floor(track.duration / 60)}:${String(track.duration % 60).padStart(2, "0")}` : ""}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between gap-2">
                {onSelectTag && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onSelectTag({ name: artist.name, type: "artist" });
                      onClose();
                    }}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>View #{artist.name} Discussions</span>
                  </Button>
                )}

                <Button variant="ghost" size="sm" onClick={onClose} className="ml-auto">
                  Close
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
