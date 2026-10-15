import { useState, useEffect } from "react";
import { getTopAlbums, connectLastfm } from "./api/client";

const PERIODS = [
  { value: "overall", label: "All Time" },
  { value: "7day", label: "7 Days" },
  { value: "1month", label: "1 Month" },
  { value: "3month", label: "3 Months" },
  { value: "6month", label: "6 Months" },
  { value: "12month", label: "1 Year" },
];

export default function TopAlbums({ username = null, limit = 10, compact = false, isSelf = true }) {
  const [albums, setAlbums] = useState([]);
  const [period, setPeriod] = useState("overall");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isNotConnected, setIsNotConnected] = useState(false);

  useEffect(() => {
    loadAlbums(period);
  }, [period, username]);

  async function loadAlbums(p) {
    setLoading(true);
    setError("");
    setIsNotConnected(false);
    try {
      const data = await getTopAlbums(p, username);
      setAlbums(Array.isArray(data) ? data : []);
    } catch (err) {
      setAlbums([]);
      const msg = err.message || "";
      if (msg.toLowerCase().includes("not connected") || msg.includes("404")) {
        setIsNotConnected(true);
      } else {
        setError(msg || "Failed to load albums");
      }
    } finally {
      setLoading(false);
    }
  }

  const rawAlbums = Array.isArray(albums) ? albums : [];
  const safeAlbums = limit ? rawAlbums.slice(0, limit) : rawAlbums;

  return (
    <div className="space-y-4">
      {!compact && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-heading font-bold text-base text-text m-0">Top Albums</h3>
            <p className="font-sans text-xs text-text-muted mt-0.5 m-0">
              {username ? `Most played records from @${username}'s listening history.` : "Most played records from your listening history."}
            </p>
          </div>

          {/* Period Chips */}
          <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Time period">
            {PERIODS.map((p) => {
              const active = period === p.value;
              return (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  style={active ? { backgroundColor: "#C7F43D", color: "#0A0B0A" } : undefined}
                  className={`px-3.5 py-1.5 rounded-md text-xs font-mono transition-all cursor-pointer ${
                    active
                      ? "bg-accent text-black font-bold border border-accent shadow-md"
                      : "bg-[#1E211E] border border-white/10 text-[#F4F5EF] hover:bg-[#282C28] hover:border-white/20 hover:text-white font-medium"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {isNotConnected ? (
        <div className="p-6 rounded-md border border-border bg-surface text-center space-y-3">
          <p className="font-sans text-xs text-text-muted m-0">
            {isSelf
              ? "Connect your Last.fm account to sync and display your top listened records."
              : `@${username || "This user"} hasn't linked a Last.fm scrobbler account yet.`}
          </p>
          {isSelf && (
            <button
              type="button"
              onClick={async () => {
                try {
                  await connectLastfm();
                } catch (err) {
                  setError(err.message || "Failed to initiate Last.fm connection");
                }
              }}
              className="inline-flex items-center justify-center h-8 px-4 rounded-md text-xs font-heading font-bold bg-accent text-black hover:bg-accent-hover transition-colors cursor-pointer"
            >
              Connect Last.fm
            </button>
          )}
        </div>
      ) : error ? (
        <div className="p-4 rounded-md border border-border bg-surface text-center space-y-2">
          <p className="font-sans text-xs text-text-muted m-0">{error}</p>
          {isSelf && (
            <button
              type="button"
              onClick={async () => {
                try {
                  await connectLastfm();
                } catch (err) {
                  setError(err.message || "Failed to initiate Last.fm connection");
                }
              }}
              className="inline-flex items-center justify-center h-8 px-3.5 rounded-md text-xs font-heading font-bold bg-accent text-black hover:bg-accent-hover transition-colors cursor-pointer"
            >
              Connect Last.fm
            </button>
          )}
        </div>
      ) : loading ? (
        <div className="text-center py-8">
          <div className="w-7 h-7 rounded-full border-2 border-accent border-t-transparent animate-spin mx-auto" />
          <p className="font-mono text-xs text-text-muted mt-2">Loading rotation...</p>
        </div>
      ) : safeAlbums.length === 0 ? (
        <div className="p-6 rounded-xl border border-border bg-surface text-center">
          <p className="font-sans text-xs text-text-muted m-0">No records found for this period.</p>
        </div>
      ) : (
        <div className={`grid ${compact ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"} gap-3`}>
          {safeAlbums.map((album, i) => {
            const albumName = typeof album?.name === "string" ? album.name : (album?.name?.["#text"] || "Unknown Record");
            const artistName = typeof album?.artist === "string" ? album.artist : (album?.artist?.name || album?.artist?.["#text"] || "Unknown Artist");
            const playcount = Number(album?.playcount || 0).toLocaleString();

            return (
              <div key={i} className="rounded-xl border border-border bg-surface p-2.5 flex flex-col justify-between group hover:border-white/25 transition-all">
                <div className="aspect-square rounded-lg overflow-hidden bg-surface-sunken mb-2 relative">
                  {album?.image_url ? (
                    <img src={album.image_url} alt={albumName} className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-muted font-mono text-2xs">
                      No Cover
                    </div>
                  )}
                  <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded font-mono text-[10px] font-bold bg-black/70 text-text backdrop-blur-xs">
                    #{i + 1}
                  </span>
                </div>

                <div className="min-w-0">
                  <div className="font-semibold text-xs text-text truncate" title={albumName}>
                    {albumName}
                  </div>
                  <div className="text-2xs text-text-muted truncate mt-0.5">
                    {artistName}
                  </div>
                  <div className="font-mono text-[11px] text-accent font-semibold mt-1">
                    {playcount} plays
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}