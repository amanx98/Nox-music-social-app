/**
 * EngineCompareView — The learning panel.
 *
 * Runs both our NOX engine (content-based, cosine similarity) and
 * Last.fm's engine (collaborative filtering, track.getSimilar) and
 * shows results side by side with overlap highlighting.
 *
 * This is where you actually see the difference between:
 *   - Content-based: "these tracks share tags with your taste vector"
 *   - Collaborative: "people who like what you like also like these"
 */
import { useState } from "react";
import { Cpu, GitBranch, Loader2, Zap, Radio, RefreshCw, Info } from "lucide-react";
import { getEngineComparison } from "../../api/client";

function TrackPill({ track, isOverlap, showScore = false }) {
  return (
    <div
      className={`flex items-center gap-2 p-2 rounded-md border transition-colors ${
        isOverlap
          ? "border-accent/50 bg-accent/5 ring-1 ring-accent/20"
          : "border-border bg-surface-raised"
      }`}
    >
      {track.image_url && !track.image_url.includes("2a96cbd8b46e442fc41c2b86b821562f") ? (
        <img src={track.image_url} alt="" className="w-7 h-7 rounded shrink-0 object-cover" />
      ) : (
        <div className="w-7 h-7 rounded shrink-0 bg-surface-sunken border border-border" />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-heading font-bold text-[10px] text-text truncate leading-tight">
          {track.name}
        </p>
        <p className="font-sans text-[9px] text-text-dim truncate">{track.artist}</p>
        {showScore && track.matching_tags?.length > 0 && (
          <div className="flex flex-wrap gap-0.5 mt-0.5">
            {track.matching_tags.slice(0, 2).map((t) => (
              <span key={t} className="font-mono text-[7px] px-1 rounded bg-accent/10 text-accent">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
      {showScore && track.score !== undefined && (
        <span className="font-mono text-[9px] text-accent shrink-0">
          {Math.round(track.score * 100)}%
        </span>
      )}
      {isOverlap && (
        <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0 animate-pulse" />
      )}
    </div>
  );
}

function OverlapBar({ pct }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="font-mono text-2xl font-bold text-accent">{pct}%</div>
      <div className="w-full h-1.5 bg-surface-sunken rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-[9px] text-text-dim uppercase tracking-wider">Agreement</span>
    </div>
  );
}

export default function EngineCompareView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ran, setRan] = useState(false);

  async function runComparison() {
    setLoading(true);
    setError(null);
    setRan(true);
    try {
      const result = await getEngineComparison();
      setData(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const overlapSet = new Set(
    (data?.overlap || []).map((t) => `${t.name.toLowerCase()}::${t.artist.toLowerCase()}`)
  );

  const isOverlap = (track) =>
    overlapSet.has(`${track.name.toLowerCase()}::${track.artist.toLowerCase()}`);

  return (
    <div className="rounded-md border border-border bg-surface overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border bg-surface-raised flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GitBranch className="w-3.5 h-3.5 text-accent" />
            <span className="font-mono text-[9px] uppercase tracking-widest text-accent font-bold">
              ENGINE LAB
            </span>
          </div>
          <h3 className="font-heading font-black text-sm text-text m-0">
            NOX vs Last.fm
          </h3>
          <p className="font-sans text-xs text-text-dim mt-0.5">
            Content-based (us) vs collaborative filtering (them)
          </p>
        </div>

        <button
          onClick={runComparison}
          disabled={loading}
          className="h-9 px-4 rounded-md bg-accent text-black hover:bg-accent-hover font-heading font-bold text-xs tracking-tight transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2 shrink-0"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Zap className="w-3.5 h-3.5" />
          )}
          {ran ? "Re-run" : "Run Comparison"}
        </button>
      </div>

      {/* Algorithm explainer */}
      <div className="grid grid-cols-1 sm:grid-cols-2 border-b border-border">
        <div className="px-4 py-3 border-r border-border/50">
          <div className="flex items-center gap-1.5 mb-1">
            <Cpu className="w-3 h-3 text-accent" />
            <span className="font-mono text-[9px] text-accent uppercase tracking-wider font-bold">NOX Engine</span>
          </div>
          <p className="font-sans text-[10px] text-text-dim leading-relaxed">
            <strong className="text-text">Content-based.</strong> Builds your taste vector from artist tag data, then scores candidates by cosine similarity.
          </p>
        </div>
        <div className="px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Radio className="w-3 h-3 text-text-dim" />
            <span className="font-mono text-[9px] text-text-dim uppercase tracking-wider font-bold">Last.fm Engine</span>
          </div>
          <p className="font-sans text-[10px] text-text-dim leading-relaxed">
            <strong className="text-text">Collaborative filtering.</strong> "People who listened to X also listened to Y." No tags — just listening behaviour.
          </p>
        </div>
      </div>

      {/* Body */}
      {!ran ? (
        <div className="py-12 text-center px-6">
          <Zap className="w-8 h-8 text-accent/40 mx-auto mb-3" />
          <p className="font-heading font-bold text-sm text-text mb-1">Run the comparison</p>
          <p className="font-sans text-xs text-text-dim max-w-xs mx-auto">
            Hit the button to see where our cosine-sim engine agrees with Last.fm's black box — and where it diverges.
          </p>
        </div>
      ) : loading ? (
        <div className="py-12 flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
          <div className="text-center">
            <p className="font-mono text-xs text-text-dim">Building taste vector...</p>
            <p className="font-mono text-[9px] text-text-dim mt-0.5">Fetching candidates from Last.fm...</p>
            <p className="font-mono text-[9px] text-text-dim mt-0.5">Computing cosine similarities...</p>
          </div>
        </div>
      ) : error ? (
        <div className="p-6 text-center">
          <p className="font-sans text-xs text-red-400">{error}</p>
        </div>
      ) : data ? (
        <div className="p-5 space-y-5">
          {/* Overlap summary */}
          <div className="rounded-md border border-border bg-surface-raised p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="font-mono text-xl font-bold text-accent">
                  {data.nox_recs?.length || 0}
                </div>
                <div className="font-mono text-[9px] text-text-dim mt-0.5">NOX picks</div>
              </div>
              <div>
                <OverlapBar pct={data.overlap_pct || 0} />
              </div>
              <div>
                <div className="font-mono text-xl font-bold text-text-dim">
                  {data.lastfm_recs?.length || 0}
                </div>
                <div className="font-mono text-[9px] text-text-dim mt-0.5">Last.fm picks</div>
              </div>
            </div>

            {data.overlap?.length > 0 && (
              <p className="font-sans text-[10px] text-text-dim text-center mt-3">
                <span className="text-accent font-bold">{data.overlap.length} tracks</span> both engines agree on — shown with a{" "}
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent align-middle" /> pulse
              </p>
            )}
          </div>

          {/* Top influential tags */}
          {data.top_tags?.length > 0 && (
            <div>
              <p className="font-mono text-[9px] uppercase tracking-widest text-text-dim mb-2">
                Your Top Taste Dimensions
              </p>
              <div className="flex flex-wrap gap-1.5">
                {data.top_tags.map(({ tag, score }) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded font-mono text-[9px] bg-accent/10 border border-accent/25 text-accent"
                    title={`Score: ${score.toFixed(3)}`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Side-by-side columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* NOX column */}
            <div>
              <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-border">
                <Cpu className="w-3 h-3 text-accent" />
                <span className="font-mono text-[9px] uppercase tracking-wider text-accent font-bold">NOX</span>
                <span className="font-mono text-[8px] text-text-dim ml-auto">cosine sim score →</span>
              </div>
              <div className="space-y-1.5">
                {(data.nox_recs || []).map((track) => (
                  <TrackPill
                    key={`${track.name}-${track.artist}`}
                    track={track}
                    isOverlap={isOverlap(track)}
                    showScore
                  />
                ))}
              </div>
            </div>

            {/* Last.fm column */}
            <div>
              <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-border">
                <Radio className="w-3 h-3 text-text-dim" />
                <span className="font-mono text-[9px] uppercase tracking-wider text-text-dim font-bold">Last.fm</span>
                <span className="font-mono text-[8px] text-text-dim ml-auto">collaborative filter</span>
              </div>
              <div className="space-y-1.5">
                {(data.lastfm_recs || []).map((track) => (
                  <TrackPill
                    key={`${track.name}-${track.artist}`}
                    track={track}
                    isOverlap={isOverlap(track)}
                    showScore={false}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Key insight */}
          <div className="rounded-md border border-border bg-surface-sunken p-3">
            <p className="font-mono text-[9px] uppercase tracking-wider text-text-dim mb-1">Interpretation</p>
            <p className="font-sans text-xs text-text-dim leading-relaxed">
              {data.overlap_pct >= 50
                ? `Strong agreement (${data.overlap_pct}%). Your listening taste aligns well with what tag signatures would predict. Both approaches converge on similar recommendations.`
                : data.overlap_pct >= 20
                ? `Moderate divergence (${data.overlap_pct}% agreement). Our content-based engine is surfacing different tracks than Last.fm's listener-behaviour model — typical when your taste is niche or cross-genre.`
                : `High divergence (only ${data.overlap_pct}% agreement). Our engine sees very different tag signatures than Last.fm's collaborative model. This usually means your taste is eclectic or in an underrepresented genre.`}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
