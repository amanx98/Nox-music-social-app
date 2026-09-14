import { useState, useEffect, useRef } from "react";
import { X, Play, Pause, MessageSquare, Disc, Users, Maximize2 } from "lucide-react";
import { getArtistDetails } from "../api/client";
import { useToast } from "./Toast";
import Button from "./ui/Button";

export default function ArtistModal({ artist, onClose, onSelectTag }) {
  const { addToast } = useToast();
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [showPhotoLightbox, setShowPhotoLightbox] = useState(false);
  const [playingTrackId, setPlayingTrackId] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        if (showPhotoLightbox) {
          setShowPhotoLightbox(false);
        } else {
          onClose();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showPhotoLightbox, onClose]);

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
    <>
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
              Hero Header: Interactive, Clean Framing & Touch to View Full Photo
             ==================================================================== */}
          <div
            onClick={() => currentPhoto && setShowPhotoLightbox(true)}
            className="relative h-64 sm:h-80 overflow-hidden border-b border-border bg-surface-sunken flex items-end p-5 sm:p-6 cursor-pointer group"
            title="Tap to view full uncropped photo"
          >
            {/* Ambient Blurred Layer for color depth */}
            {currentPhoto && (
              <div
                className="absolute inset-0 bg-cover bg-center scale-110 blur-xl opacity-30"
                style={{ backgroundImage: `url(${currentPhoto})` }}
                aria-hidden="true"
              />
            )}

            {/* Main Focused Artist Photo */}
            {currentPhoto ? (
              <img
                src={currentPhoto}
                alt={artist.name}
                className="absolute inset-0 w-full h-full object-cover object-[center_20%] transition-transform duration-500 group-hover:scale-102"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-text-dim">
                <Disc className="w-16 h-16 stroke-[1]" />
              </div>
            )}

            {/* Clear, subtle gradient (does not darken faces harshly) */}
            <div className="absolute inset-0 bg-gradient-to-t from-surface-raised via-black/35 to-black/25 pointer-events-none" />

            {/* Top Toolbar: Sleek Icon Buttons with High Contrast */}
            <div className="absolute top-3.5 inset-x-3.5 z-20 flex items-center justify-between">
              {currentPhoto ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPhotoLightbox(true);
                  }}
                  title="Expand uncropped photo"
                  aria-label="Expand uncropped photo"
                  className="w-8 h-8 rounded-full bg-black/75 hover:bg-white text-white hover:text-black border border-white/25 transition-all cursor-pointer flex items-center justify-center shadow-2 backdrop-blur-sm"
                >
                  <Maximize2 className="w-4 h-4 stroke-[2]" />
                </button>
              ) : <div />}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                aria-label="Close"
                className="w-8 h-8 rounded-full bg-black/75 hover:bg-white text-white hover:text-black border border-white/25 transition-all cursor-pointer flex items-center justify-center shadow-2 backdrop-blur-sm"
              >
                <X className="w-4 h-4 stroke-[2]" />
              </button>
            </div>

            {/* Artist Headline Info */}
            <div className="relative z-10 w-full">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="font-mono text-2xs uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-accent text-surface shadow-1">
                  Artist Spotlight
                </span>
                {artist.playcount && (
                  <span className="font-mono text-2xs uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-black/60 text-white border border-white/20 backdrop-blur-xs">
                    {Number(artist.playcount).toLocaleString()} plays
                  </span>
                )}
              </div>

              <h1
                id="artist-modal-title"
                className="font-heading font-black text-2xl sm:text-3xl text-white tracking-tight drop-shadow-sm"
              >
                {artist.name}
              </h1>

              {details?.fans && (
                <div className="font-mono text-xs text-white/80 mt-1 flex items-center gap-1.5 drop-shadow-sm">
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
                    <span className="font-mono text-2xs uppercase tracking-wider text-text-dim block">
                      Photos ({photos.length})
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

                {/* Top Tracks (Scrollable container to save space!) */}
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
                    <div className="rounded-xl border border-border bg-surface overflow-hidden">
                      <div className="max-h-52 sm:max-h-60 overflow-y-auto divide-y divide-border/60 overscroll-contain pr-0.5">
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

      {/* ====================================================================
          Full-Screen Uncropped Photo Lightbox
         ==================================================================== */}
      {showPhotoLightbox && currentPhoto && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-fade-in"
          onClick={() => setShowPhotoLightbox(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Full resolution artist photo"
        >
          <div className="relative max-w-4xl max-h-[92vh] w-full flex flex-col items-center justify-center">
            {/* Lightbox Header Bar */}
            <div className="w-full flex items-center justify-between pb-3 text-white">
              <div className="font-heading font-bold text-base text-white truncate">
                {artist.name}
              </div>
              <button
                type="button"
                onClick={() => setShowPhotoLightbox(false)}
                className="w-8 h-8 rounded-full bg-white text-black hover:bg-zinc-200 flex items-center justify-center transition-colors cursor-pointer shadow-2"
                aria-label="Close"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Uncropped Full-Frame Photo */}
            <div
              className="relative max-h-[82vh] overflow-hidden rounded-xl border border-white/10 shadow-5 flex items-center justify-center bg-black/60"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={currentPhoto}
                alt={artist.name}
                className="max-h-[82vh] max-w-full object-contain rounded-lg select-none"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
