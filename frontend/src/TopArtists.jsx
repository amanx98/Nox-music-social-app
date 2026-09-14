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
      const list = Array.isArray(data) ? data : [];
      setArtists(list);

      // Fetch artist photos in background for the top artists
      list.slice(0, 18).forEach(async (artist) => {
        if (!artist?.name || typeof artist.name !== "string") return;
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
      setArtists([]);
      setError(err.message || "Failed to load artists");
    } finally {
      setLoading(false);
    }
  }

  const safeArtists = Array.isArray(artists) ? artists : [];
  const maxPlays = safeArtists.length > 0 ? Math.max(...safeArtists.map((a) => parseInt(a?.playcount || 0, 10))) : 1;

  return (
    <div className="space-y-4">
      {/* Header with Title, Period Chips, and View Mode Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-heading font-bold text-base text-white m-0">Top Artists</h3>
          <p className="font-sans text-xs text-text-muted mt-0.5 m-0">
            Top listened artists from your Last.fm history.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* View Mode Switcher */}
          <div className="inline-flex p-0.5 rounded-full bg-surface border border-border">
            <button
              type="button"
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "grid"
                  ? "bg-white text-zinc-950 shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
              onClick={() => setViewMode("grid")}
            >
              Grid
            </button>
            <button
              type="button"
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "list"
                  ? "bg-white text-zinc-950 shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
              onClick={() => setViewMode("list")}
            >
              List
            </button>
          </div>

          {/* Period Chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {PERIODS.map((p) => {
              const active = period === p.value;
              return (
                <button
                  key={p.value}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                    active
                      ? "bg-white text-zinc-950 font-semibold shadow-sm"
                      : "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent"
                  }`}
                  onClick={() => setPeriod(p.value)}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {error ? (
        <div className="p-4 rounded-xl border border-border bg-surface text-center space-y-2">
          <p className="font-sans text-xs text-text-muted m-0">{error}</p>
          <a
            href="http://localhost:8000/lastfm/login"
            className="inline-flex items-center justify-center h-8 px-3.5 rounded-lg text-xs font-semibold bg-white text-zinc-950 hover:bg-zinc-200 transition-colors"
          >
            Connect Last.fm
          </a>
        </div>
      ) : loading ? (
        <div className="text-center py-8">
          <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin mx-auto" />
          <p className="font-mono text-xs text-text-muted mt-2">Loading artists...</p>
        </div>
      ) : safeArtists.length === 0 ? (
        <div className="p-6 rounded-xl border border-border bg-surface text-center">
          <p className="font-sans text-xs text-text-muted m-0">No artists recorded for this period.</p>
        </div>
      ) : viewMode === "grid" ? (
        /* GRID VIEW WITH PHOTOS */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {safeArtists.map((artist, i) => {
            const artistName = typeof artist?.name === "string" ? artist.name : (artist?.name?.["#text"] || "Unknown Artist");
            const photoUrl = artistPhotos[artistName];
            const playcount = Number(artist?.playcount || 0).toLocaleString();

            return (
              <div
                key={artistName + i}
                className="rounded-xl border border-border bg-surface p-2.5 flex flex-col justify-between group hover:border-white/25 transition-all cursor-pointer text-left"
                onClick={() => setSelectedArtist(artist)}
                title={`Explore ${artistName}`}
              >
                <div className="aspect-square rounded-lg overflow-hidden bg-surface-sunken mb-2 relative">
                  <span className="absolute top-1.5 left-1.5 z-10 px-1.5 py-0.5 rounded font-mono text-[10px] font-bold bg-black/70 text-white backdrop-blur-xs">
                    #{i + 1}
                  </span>

                  {photoUrl ? (
                    <img src={photoUrl} alt={artistName} className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-surface-sunken text-text-muted font-mono text-xs">
                      No Photo
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="font-semibold text-xs text-white truncate group-hover:text-accent transition-colors" title={artistName}>
                    {artistName}
                  </div>
                  <div className="flex items-center justify-between text-2xs text-text-muted mt-1">
                    <span className="font-mono text-accent font-semibold">{playcount} scrobbles</span>
                    <span className="text-[11px] opacity-70 group-hover:translate-x-0.5 transition-transform">→</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW WITH THUMBNAILS */
        <div className="rounded-xl border border-border bg-surface divide-y divide-border/60 overflow-hidden">
          {safeArtists.map((artist, i) => {
            const artistName = typeof artist?.name === "string" ? artist.name : (artist?.name?.["#text"] || "Unknown Artist");
            const plays = parseInt(artist?.playcount || 0, 10);
            const percentage = Math.max(8, Math.round((plays / (maxPlays || 1)) * 100));
            const photoUrl = artistPhotos[artistName];

            return (
              <div
                key={artistName + i}
                onClick={() => setSelectedArtist(artist)}
                className="flex items-center justify-between p-3 gap-3 cursor-pointer hover:bg-surface-raised/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="font-mono text-xs font-bold w-6 text-text-muted flex-shrink-0">
                    #{String(i + 1).padStart(2, "0")}
                  </span>

                  {/* Thumbnail */}
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt={artistName}
                      className="w-9 h-9 rounded-full object-cover flex-shrink-0 border border-border"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-surface-sunken flex items-center justify-center text-xs font-bold text-text-muted flex-shrink-0">
                      {artistName[0] || "A"}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-xs text-white truncate">
                      {artistName}
                    </div>
                    <div className="h-1 bg-surface-sunken rounded-full overflow-hidden w-full max-w-[240px] mt-1.5">
                      <div
                        className="h-full bg-accent rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="text-right flex-shrink-0 flex items-center gap-2">
                  <span className="font-mono text-2xs text-accent font-semibold">
                    {plays.toLocaleString()} plays
                  </span>
                  <span className="text-text-muted text-xs">→</span>
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