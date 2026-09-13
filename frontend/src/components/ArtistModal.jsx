import { useState, useEffect, useRef } from "react";
import { getArtistDetails } from "../api/client";
import { useToast } from "./Toast";

export default function ArtistModal({ artist, onClose, onSelectTag }) {
  const { addToast } = useToast();
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [playingTrackId, setPlayingTrackId] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    async function loadDetails() {
      setLoading(true);
      try {
        const data = await getArtistDetails(artist.name);
        if (isMounted) setDetails(data);
      } catch {
        if (isMounted) {
          setDetails({
            name: artist.name,
            image: null,
            images: [],
            top_tracks: [],
          });
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadDetails();

    return () => {
      isMounted = false;
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [artist.name]);

  function handlePlayPreview(track) {
    if (!track.preview) {
      addToast(`Preview not available for "${track.title}"`);
      return;
    }

    if (playingTrackId === track.id) {
      audioRef.current?.pause();
      setPlayingTrackId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(track.preview);
      audioRef.current.play().catch(() => {
        addToast("Unable to play audio stream in this browser");
      });
      audioRef.current.onended = () => setPlayingTrackId(null);
      setPlayingTrackId(track.id);
      addToast(`Playing preview: ${track.title}`);
    }
  }

  const photos = details?.images && details.images.length > 0
    ? details.images
    : details?.image
    ? [details.image]
    : [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        style={{
          maxWidth: "740px",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "0",
          background: "var(--bg-card)",
          border: "1px solid var(--border-strong)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Banner with Artist Photo */}
        <div
          style={{
            position: "relative",
            height: "220px",
            background: photos.length > 0 ? `url(${photos[activePhotoIndex]}) center/cover no-repeat` : "var(--bg-subtle)",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "flex-end",
            padding: "20px 24px",
          }}
        >
          {/* Ambient Dark Gradient Overlay */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to top, var(--bg-card) 0%, rgba(6, 6, 7, 0.5) 60%, rgba(6, 6, 7, 0.85) 100%)",
            }}
          />

          {/* Close button */}
          <button
            className="btn-ghost"
            onClick={onClose}
            style={{
              position: "absolute",
              top: "14px",
              right: "14px",
              fontSize: "16px",
              padding: "5px 10px",
              borderRadius: "50%",
              background: "rgba(0,0,0,0.6)",
              color: "#fff",
              zIndex: 10,
            }}
          >
            ✕
          </button>

          {/* Artist Headline Info */}
          <div style={{ position: "relative", zIndex: 2, width: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
              <span className="badge badge-mustard" style={{ fontSize: "10.5px" }}>
                ARTIST SPOTLIGHT
              </span>
              {artist.playcount && (
                <span className="badge badge-teal" style={{ fontSize: "10.5px" }}>
                  {artist.playcount} Plays in your history
                </span>
              )}
            </div>

            <h1 style={{ margin: "4px 0", fontSize: "24px", color: "#fff", textShadow: "0 2px 10px rgba(0,0,0,0.8)" }}>
              {artist.name}
            </h1>

            {details?.fans && (
              <div className="meta" style={{ color: "var(--cream-text-dim)", fontSize: "12px" }}>
                {details.fans.toLocaleString()} global fans &middot; Verified Artist
              </div>
            )}
          </div>
        </div>

        {/* Modal Body Content */}
        <div style={{ padding: "24px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px" }}>
              <span className="spin" style={{ display: "inline-block", fontSize: "32px" }}>💿</span>
              <p className="meta" style={{ marginTop: "12px" }}>Gathering discography &amp; portraits...</p>
            </div>
          ) : (
            <div>
              {/* Photo Gallery Carousel Thumbnails */}
              {photos.length > 1 && (
                <div style={{ marginBottom: "24px" }}>
                  <div className="meta" style={{ marginBottom: "10px", fontSize: "11.5px", color: "var(--cream-text)" }}>
                    ARTIST GALLERY ({photos.length} PHOTOS)
                  </div>
                  <div style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "6px" }}>
                    {photos.map((imgUrl, idx) => (
                      <img
                        key={idx}
                        src={imgUrl}
                        alt={`${artist.name} photo ${idx + 1}`}
                        onClick={() => setActivePhotoIndex(idx)}
                        style={{
                          width: "80px",
                          height: "80px",
                          borderRadius: "var(--radius)",
                          objectFit: "cover",
                          cursor: "pointer",
                          border: activePhotoIndex === idx ? "2px solid var(--mustard)" : "1px solid var(--border)",
                          opacity: activePhotoIndex === idx ? 1 : 0.65,
                          transition: "all 0.15s ease",
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Top Songs by this Artist */}
              <div style={{ marginBottom: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <h3 style={{ margin: 0, fontSize: "18px" }}>
                    Top Songs by {artist.name}
                  </h3>
                  <span className="meta" style={{ fontSize: "11px" }}>
                    {details?.top_tracks?.length || 0} Tracks Available
                  </span>
                </div>

                {!details?.top_tracks || details.top_tracks.length === 0 ? (
                  <div className="card" style={{ padding: "20px", textAlign: "center" }}>
                    <p className="meta" style={{ margin: 0 }}>No song previews found for this artist.</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {details.top_tracks.map((track, i) => {
                      const isPlaying = playingTrackId === track.id;

                      return (
                        <div key={track.id || i} className="track-preview-row">
                          <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0, flex: 1 }}>
                            {/* Play / Pause button */}
                            {track.preview ? (
                              <button
                                type="button"
                                className="play-audio-btn"
                                onClick={() => handlePlayPreview(track)}
                                title={isPlaying ? "Pause Preview" : "Play 30s Preview"}
                              >
                                {isPlaying ? "⏸" : "▶"}
                              </button>
                            ) : (
                              <span className="track-number" style={{ width: "32px", textAlign: "center" }}>
                                {String(i + 1).padStart(2, "0")}
                              </span>
                            )}

                            {/* Album Artwork if available */}
                            {track.album_cover && (
                              <img
                                src={track.album_cover}
                                alt={track.title}
                                style={{ width: "36px", height: "36px", borderRadius: "4px", objectFit: "cover" }}
                              />
                            )}

                            {/* Track Details */}
                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  fontWeight: 600,
                                  fontSize: "14px",
                                  color: isPlaying ? "var(--mustard)" : "var(--cream-text)",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {track.title}
                              </div>
                              {track.album_title && (
                                <div className="meta" style={{ fontSize: "11px", color: "var(--cream-text-muted)" }}>
                                  {track.album_title}
                                </div>
                              )}
                            </div>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                            {isPlaying && (
                              <span className="badge badge-mustard" style={{ fontSize: "10px" }}>
                                🎵 Playing Preview
                              </span>
                            )}
                            {track.duration && (
                              <span className="meta" style={{ fontSize: "11.5px" }}>
                                {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, "0")}
                              </span>
                            )}
                            {track.playcount && (
                              <span className="badge badge-teal" style={{ fontSize: "11px" }}>
                                {track.playcount} plays
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Bottom Quick Community Link */}
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="meta" style={{ fontSize: "12px" }}>
                  Want to discuss {artist.name} with other fans?
                </span>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    onClose();
                    if (onSelectTag) {
                      onSelectTag({ id: 999, name: artist.name, type: "artist" });
                    }
                  }}
                  style={{ padding: "8px 16px", fontSize: "12px" }}
                >
                  💬 Open #{artist.name} Community
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
