import { useState, useEffect } from "react";
import { getTopArtists, getArtistDetails } from "./api/client";
import ArtistModal from "./components/ArtistModal";

const PERIODS = [
  { value: "overall", label: "All Time" },
  { value: "7day", label: "7 Days" },
  { value: "1month", label: "1 Month" },
  { value: "3month", label: "3 Months" },
  { value: "6month", label: "6 Months" },
  { value: "12month", label: "1 Year" },
];

export default function TopArtists({ onSelectTag }) {
  const [artists, setArtists] = useState([]);
  const [period, setPeriod] = useState("overall");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [artistPhotos, setArtistPhotos] = useState({});

  useEffect(() => {
    loadArtists(period);
  }, [period]);

  async function loadArtists(p) {
    setLoading(true);
    setError("");
    try {
      const data = await getTopArtists(p);
      const list = data || [];
      setArtists(list);

      // Fetch artist photos in background for the top artists
      list.slice(0, 18).forEach(async (artist) => {
        try {
          const details = await getArtistDetails(artist.name);
          if (details?.image) {
            setArtistPhotos((prev) => ({
              ...prev,
              [artist.name]: details.image,
            }));
          }
        } catch {
          // ignore background image failures
        }
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const maxPlays = artists.length > 0 ? Math.max(...artists.map((a) => parseInt(a.playcount || 0, 10))) : 1;

  return (
    <div style={{ marginBottom: "40px" }}>
      {/* Header with Title, Period Chips, and View Mode Toggle */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px", marginBottom: "18px" }}>
        <div>
          <h2>Top Artists</h2>
          <p className="meta" style={{ margin: 0 }}>
            Top listened artists from your Last.fm history.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* View Mode Switcher */}
          <div style={{ display: "flex", background: "var(--bg-card)", padding: "3px", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
            <button
              type="button"
              className={`btn-ghost ${viewMode === "grid" ? "badge-mustard" : ""}`}
              onClick={() => setViewMode("grid")}
              style={{ padding: "4px 10px", fontSize: "12px", borderRadius: "4px" }}
              title="Grid View"
            >
              Grid
            </button>
            <button
              type="button"
              className={`btn-ghost ${viewMode === "list" ? "badge-mustard" : ""}`}
              onClick={() => setViewMode("list")}
              style={{ padding: "4px 10px", fontSize: "12px", borderRadius: "4px" }}
              title="List View"
            >
              List
            </button>
          </div>

          {/* Period Chips */}
          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
            {PERIODS.map((p) => (
              <button
                key={p.value}
                className={`btn-ghost ${period === p.value ? "badge-mustard" : ""}`}
                style={{
                  fontSize: "11.5px",
                  padding: "4px 9px",
                  borderRadius: "var(--radius-full)",
                  border: period === p.value ? "1px solid var(--mustard)" : "1px solid var(--border)",
                }}
                onClick={() => setPeriod(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error ? (
        <div className="card" style={{ color: "var(--coral)", padding: "20px" }}>
          {error}
        </div>
      ) : loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--color-text-muted)" }}>
          <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin mx-auto" />
          <p className="font-mono text-xs text-text-dim" style={{ marginTop: "10px" }}>Loading artists...</p>
        </div>
      ) : artists.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "30px" }}>
          <p className="meta" style={{ margin: 0 }}>No artists recorded for this period.</p>
        </div>
      ) : viewMode === "grid" ? (
        /* GRID VIEW WITH PHOTOS */
        <div className="artist-grid">
          {artists.map((artist, i) => {
            const photoUrl = artistPhotos[artist.name];

            return (
              <div
                key={artist.name}
                className="artist-card-grid"
                onClick={() => setSelectedArtist(artist)}
                title={`Explore ${artist.name}`}
              >
                <div className="artist-portrait-box">
                  {/* Rank Badge */}
                  <span className="artist-rank-badge">
                    #{String(i + 1).padStart(2, "0")}
                  </span>

                  {photoUrl ? (
                    <img src={photoUrl} alt={artist.name} />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "var(--color-surface-sunken)",
                        color: "var(--color-text-dim)",
                      }}
                    >
                      <span className="font-mono text-xs">No Photo</span>
                    </div>
                  )}
                </div>

                <div className="artist-card-info">
                  <div style={{ fontWeight: 700, fontSize: "15px", color: "var(--cream-text)", marginBottom: "4px", lineHeight: "1.25" }}>
                    {artist.name}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className="meta" style={{ color: "var(--teal)", fontSize: "11.5px", fontWeight: 600 }}>
                      {artist.playcount} scrobbles
                    </span>
                    <span style={{ fontSize: "11px", color: "var(--cream-text-muted)" }}>
                      Discography →
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW WITH THUMBNAILS */
        <div className="card" style={{ padding: "8px 16px" }}>
          {artists.map((artist, i) => {
            const plays = parseInt(artist.playcount || 0, 10);
            const percentage = Math.max(8, Math.round((plays / (maxPlays || 1)) * 100));
            const photoUrl = artistPhotos[artist.name];

            return (
              <div
                key={i}
                onClick={() => setSelectedArtist(artist)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 6px",
                  borderBottom: i < artists.length - 1 ? "1px solid var(--border)" : "none",
                  gap: "16px",
                  cursor: "pointer",
                  borderRadius: "var(--radius)",
                  transition: "background 0.15s ease",
                }}
                className="track-row"
              >
                <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: 1, minWidth: 0 }}>
                  <span
                    className="track-number"
                    style={{
                      fontWeight: 700,
                      color: i === 0 ? "var(--mustard)" : i === 1 ? "#e8c374" : i === 2 ? "#b8af9c" : "var(--cream-text-muted)",
                    }}
                  >
                    #{String(i + 1).padStart(2, "0")}
                  </span>

                  {/* Thumbnail portrait */}
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt={artist.name}
                      style={{ width: "38px", height: "38px", borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1px solid var(--border-strong)" }}
                    />
                  ) : (
                    <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: "var(--color-surface-sunken)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 700, color: "var(--color-text-dim)", flexShrink: 0 }}>
                      {artist.name[0] || "A"}
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: "14.5px", color: "var(--cream-text)", marginBottom: "4px" }}>
                      {artist.name}
                    </div>

                    {/* Visual playcount bar */}
                    <div style={{ height: "4px", background: "rgba(244, 239, 226, 0.06)", borderRadius: "2px", overflow: "hidden", width: "100%", maxWidth: "320px" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${percentage}%`,
                          background: i === 0 ? "var(--mustard)" : "var(--color-secondary)",
                          borderRadius: "2px",
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: "right", flexShrink: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className="badge badge-teal" style={{ fontSize: "11px" }}>
                    {artist.playcount} scrobbles
                  </span>
                  <span style={{ color: "var(--cream-text-muted)", fontSize: "13px" }}>
                    →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Clickable Artist Details & Discography Modal */}
      {selectedArtist && (
        <ArtistModal
          artist={selectedArtist}
          onClose={() => setSelectedArtist(null)}
          onSelectTag={onSelectTag}
        />
      )}
    </div>
  );
}