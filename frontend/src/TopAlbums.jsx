import { useState, useEffect } from "react";
import { getTopAlbums } from "./api/client";

const PERIODS = [
  { value: "overall", label: "All Time" },
  { value: "7day", label: "7 Days" },
  { value: "1month", label: "1 Month" },
  { value: "3month", label: "3 Months" },
  { value: "6month", label: "6 Months" },
  { value: "12month", label: "1 Year" },
];

export default function TopAlbums() {
  const [albums, setAlbums] = useState([]);
  const [period, setPeriod] = useState("overall");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadAlbums(period);
  }, [period]);

  async function loadAlbums(p) {
    setLoading(true);
    setError("");
    try {
      const data = await getTopAlbums(p);
      setAlbums(Array.isArray(data) ? data : []);
    } catch (err) {
      setAlbums([]);
      setError(err.message || "Failed to load albums");
    } finally {
      setLoading(false);
    }
  }

  const safeAlbums = Array.isArray(albums) ? albums : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-heading font-bold text-base text-white m-0">Top Albums</h3>
          <p className="font-sans text-xs text-text-muted mt-0.5 m-0">Most played records from your listening history.</p>
        </div>

        {/* Period Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {PERIODS.map((p) => {
            const active = period === p.value;
            return (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  active
                    ? "bg-white text-zinc-950 font-semibold shadow-sm"
                    : "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent"
                }`}
              >
                {p.label}
              </button>
            );
          })}
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
          <div className="w-7 h-7 rounded-full border-2 border-accent border-t-transparent animate-spin mx-auto" />
          <p className="font-mono text-xs text-text-muted mt-2">Loading rotation...</p>
        </div>
      ) : safeAlbums.length === 0 ? (
        <div className="p-6 rounded-xl border border-border bg-surface text-center">
          <p className="font-sans text-xs text-text-muted m-0">No records found for this period.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
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
                  <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded font-mono text-[10px] font-bold bg-black/70 text-white backdrop-blur-xs">
                    #{i + 1}
                  </span>
                </div>

                <div className="min-w-0">
                  <div className="font-semibold text-xs text-white truncate" title={albumName}>
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