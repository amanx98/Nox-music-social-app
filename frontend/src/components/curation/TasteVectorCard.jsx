/**
 * TasteVectorCard — Visual display of the user's taste fingerprint.
 *
 * Shows the tag dimensions of the taste vector as a ranked bar chart,
 * top genres as chips, and a mood tag cluster.
 * Used in ProfilePage and as a sidebar widget.
 */
import { useEffect, useState } from "react";
import { Cpu, RefreshCw, Loader2, ChevronDown } from "lucide-react";
import { getTasteVector } from "../../api/client";

function TagBar({ tag, score, maxScore, index }) {
  const pct = Math.round((score / maxScore) * 100);
  // Stagger the bar fill animation based on index
  const delay = `${index * 40}ms`;

  return (
    <div className="flex items-center gap-2.5 group">
      <span
        className="font-mono text-[10px] text-text-dim group-hover:text-text transition-colors truncate shrink-0"
        style={{ width: "90px" }}
      >
        {tag}
      </span>
      <div className="flex-1 h-1.5 bg-surface-sunken rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full origin-left transition-all duration-500 ease-out"
          style={{
            width: `${pct}%`,
            animationDelay: delay,
            opacity: 0.4 + score * 0.6,
          }}
        />
      </div>
      <span className="font-mono text-[9px] text-text-dim shrink-0 w-7 text-right">
        {pct}%
      </span>
    </div>
  );
}

export default function TasteVectorCard({ compact = false }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function load(refresh = false) {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const result = await getTasteVector(refresh);
      setData(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="rounded-md border border-border bg-surface p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Cpu className="w-3.5 h-3.5 text-accent" />
          <span className="font-mono text-[9px] uppercase tracking-widest text-accent">TASTE ID</span>
        </div>
        <div className="space-y-2 animate-pulse">
          {[80, 65, 50, 40, 30].map((w, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <div className="h-2 bg-surface-raised rounded w-[90px]" />
              <div className="flex-1 h-1.5 bg-surface-raised rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-border bg-surface p-4">
        <div className="flex items-center gap-2 mb-2">
          <Cpu className="w-3.5 h-3.5 text-accent" />
          <span className="font-mono text-[9px] uppercase tracking-widest text-accent">TASTE ID</span>
        </div>
        <p className="font-sans text-xs text-text-dim">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const topTags = data.top_tags || [];
  const topGenres = data.top_genres || [];
  const maxScore = topTags.length > 0 ? topTags[0].score : 1;
  const displayTags = expanded ? topTags : topTags.slice(0, compact ? 5 : 8);

  return (
    <div className="rounded-md border border-border bg-surface overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Cpu className="w-3.5 h-3.5 text-accent" />
          <span className="font-mono text-[9px] uppercase tracking-widest text-accent font-bold">
            TASTE ID
          </span>
          <span className="font-mono text-[9px] text-text-dim">
            {data.dimension_count} dimensions
          </span>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="p-1 rounded text-text-dim hover:text-accent transition-colors cursor-pointer disabled:opacity-40"
          title="Rebuild taste vector"
        >
          <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Genre chips */}
        {topGenres.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {topGenres.map((g) => (
              <span
                key={g}
                className="px-2 py-0.5 rounded bg-accent/10 border border-accent/25 font-mono text-[9px] text-accent uppercase tracking-wider"
              >
                {g}
              </span>
            ))}
          </div>
        )}

        {/* Tag dimension bars */}
        <div className="space-y-1.5">
          {displayTags.map((item, i) => (
            <TagBar
              key={item.tag}
              tag={item.tag}
              score={item.score}
              maxScore={maxScore}
              index={i}
            />
          ))}
        </div>

        {/* Show more / less */}
        {topTags.length > (compact ? 5 : 8) && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 font-mono text-[9px] text-text-dim hover:text-accent transition-colors cursor-pointer uppercase tracking-wider"
          >
            <ChevronDown
              className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`}
            />
            {expanded ? "Show less" : `Show all ${topTags.length} tags`}
          </button>
        )}

        {/* Footer meta */}
        {data.updated_at && (
          <p className="font-mono text-[9px] text-text-dim pt-1 border-t border-border">
            Built from @{data.lastfm_username} · Updated{" "}
            {new Date(data.updated_at).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
}
