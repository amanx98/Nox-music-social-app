import { useState, useEffect } from "react";
import { getTopArtists } from "./api/client";

const PERIODS = [
  { value: "overall", label: "All Time" },
  { value: "7day", label: "7 Days" },
  { value: "1month", label: "1 Month" },
  { value: "3month", label: "3 Months" },
  { value: "6month", label: "6 Months" },
  { value: "12month", label: "1 Year" },
];

export default function TopArtists() {
  const [artists, setArtists] = useState([]);
  const [period, setPeriod] = useState("overall");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadArtists(period);
  }, [period]);

  async function loadArtists(p) {
    setLoading(true);
    setError("");
    try {
      const data = await getTopArtists(p);
      setArtists(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const maxPlays = artists.length > 0 ? Math.max(...artists.map((a) => parseInt(a.playcount || 0, 10))) : 1;

  return (
    <div style={{ marginBottom: "40px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
        <div>
          <h2>Top Artists Leaderboard</h2>
          <p className="meta" style={{ margin: 0 }}>Your most frequently scrobbled musicians.</p>
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
          <p className="meta" style={{ marginTop: "8px" }}>Fetching artist stats...</p>
        </div>
      ) : artists.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "30px" }}>
          <p className="meta" style={{ margin: 0 }}>No artists recorded for this period.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: "8px 16px" }}>
          {artists.map((artist, i) => {
            const plays = parseInt(artist.playcount || 0, 10);
            const percentage = Math.max(8, Math.round((plays / (maxPlays || 1)) * 100));

            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 6px",
                  borderBottom: i < artists.length - 1 ? "1px solid var(--border)" : "none",
                  gap: "16px",
                }}
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

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--cream-text)", marginBottom: "4px" }}>
                      {artist.name}
                    </div>

                    {/* Visual playcount bar */}
                    <div style={{ height: "4px", background: "rgba(244, 239, 226, 0.06)", borderRadius: "2px", overflow: "hidden", width: "100%", maxWidth: "320px" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${percentage}%`,
                          background: i === 0 ? "var(--mustard)" : "var(--teal)",
                          borderRadius: "2px",
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <span className="badge badge-teal" style={{ fontSize: "11px" }}>
                    {artist.playcount} scrobbles
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}