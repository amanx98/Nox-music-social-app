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
      setAlbums(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginBottom: "40px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
        <div>
          <h2>Top Albums</h2>
          <p className="meta" style={{ margin: 0 }}>Most played records pulled from your Last.fm scrobbles.</p>
        </div>

        {/* Period Chips */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {PERIODS.map((p) => (
            <button
              key={p.value}
              className={`btn-ghost ${period === p.value ? "badge-mustard" : ""}`}
              style={{
                fontSize: "12px",
                padding: "4px 10px",
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

      {error ? (
        <div className="card" style={{ color: "var(--coral)", padding: "20px" }}>
          {error}
        </div>
      ) : loading ? (
        <div style={{ textAlign: "center", padding: "30px", color: "var(--cream-text-muted)" }}>
          <span className="spin" style={{ display: "inline-block", fontSize: "24px" }}>💿</span>
          <p className="meta" style={{ marginTop: "8px" }}>Fetching album scrobbles...</p>
        </div>
      ) : albums.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "30px" }}>
          <p className="meta" style={{ margin: 0 }}>No albums recorded for this period.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "16px" }}>
          {albums.map((album, i) => (
            <div key={i} className="quilt-frame" style={{ display: "flex", flexDirection: "column" }}>
              {album.image_url ? (
                <img src={album.image_url} alt={album.name} />
              ) : (
                <div style={{ aspectRatio: "1/1", background: "#25221c", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px" }}>
                  🎵
                </div>
              )}
              <div style={{ paddingTop: "10px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ color: "var(--ink)", fontWeight: 700, fontSize: "13px", lineHeight: 1.25, marginBottom: "2px" }} title={album.name}>
                    {album.name}
                  </div>
                  <div className="meta" style={{ fontSize: "11px", color: "var(--ink-soft)" }}>
                    {album.artist}
                  </div>
                </div>
                <div className="meta" style={{ color: "var(--teal)", marginTop: "6px", fontWeight: 600 }}>
                  {album.playcount} plays
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}