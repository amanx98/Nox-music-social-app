/**
 * ForYouSection — Feed sidebar widget showing NOX's taste-matched recommendations.
 *
 * Shows 6 tracks ranked by cosine similarity to the user's taste vector.
 * Each card shows: album art, name, artist, score badge, and matching tags
 * ("why this?"). 30s Deezer preview plays on hover if available.
 */
import { useEffect, useRef, useState } from "react";
import { Sparkles, Loader2, Play, Pause, Info, Disc } from "lucide-react";
import { getRecommendations } from "../../api/client";

function ScoreBadge({ score }) {
  const pct = Math.round(score * 100);
  const color =
    pct >= 70 ? "text-accent border-accent/40 bg-accent/10" :
    pct >= 45 ? "text-yellow-400 border-yellow-400/40 bg-yellow-400/10" :
    "text-text-dim border-border bg-surface-raised";
  return (
    <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded border ${color} shrink-0`}>
      {pct}%
    </span>
  );
}

function TrackCard({ track, index }) {
  const [playing, setPlaying] = useState(false);
  const [showTags, setShowTags] = useState(false);
  const [imgError, setImgError] = useState(false);
  const audioRef = useRef(null);

  function togglePlay(e) {
    e.stopPropagation();
    if (!track.preview_url) return;
    if (playing) {
      audioRef.current?.pause();
    } else {
      // Pause any other audio elements on the page
      document.querySelectorAll("audio").forEach((a) => a !== audioRef.current && a.pause());
      audioRef.current?.play();
    }
    setPlaying(!playing);
  }

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onEnd = () => setPlaying(false);
    el.addEventListener("ended", onEnd);
    return () => el.removeEventListener("ended", onEnd);
  }, []);

  const image = track.image_url;
  const isValidImage = image && !image.includes("2a96cbd8b46e442fc41c2b86b821562f") && !imgError;
  const delay = `${index * 60}ms`;

  return (
    <div
      className="flex items-center gap-2.5 p-2.5 rounded-md hover:bg-surface-raised transition-colors group cursor-default"
      style={{ animationDelay: delay }}
    >
      {/* Album art + play button */}
      <div className="relative w-9 h-9 rounded bg-surface-raised border border-border shrink-0 overflow-hidden">
        {isValidImage ? (
          <img
            src={image}
            alt=""
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-dim bg-surface-sunken">
            <Disc className="w-4 h-4 text-text-dim/60" />
          </div>
        )}
        {track.preview_url && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          >
            {playing ? (
              <Pause className="w-3.5 h-3.5 text-white" />
            ) : (
              <Play className="w-3.5 h-3.5 text-white fill-white" />
            )}
          </button>
        )}
        {track.preview_url && (
          <audio ref={audioRef} src={track.preview_url} preload="none" />
        )}
      </div>

      {/* Track info */}
      <div className="flex-1 min-w-0">
        <p className="font-heading font-bold text-[11px] text-text truncate leading-tight">
          {track.name}
        </p>
        <p className="font-sans text-[10px] text-text-dim truncate">{track.artist}</p>

        {/* Matching tags (toggled) */}
        {showTags && track.matching_tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {track.matching_tags.map((t) => (
              <span key={t} className="font-mono text-[8px] px-1 rounded bg-accent/10 text-accent border border-accent/20">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Right: score + why button */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        <ScoreBadge score={track.score} />
        {track.matching_tags?.length > 0 && (
          <button
            onClick={() => setShowTags(!showTags)}
            className="font-mono text-[8px] text-text-dim hover:text-accent transition-colors cursor-pointer"
            title="Why this track?"
          >
            {showTags ? "hide" : "why?"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function ForYouSection() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const result = await getRecommendations(6);
        setData(result);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <section className="rounded-md border border-border bg-surface overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-accent" />
          <span className="font-mono text-[9px] uppercase tracking-widest text-accent font-bold">
            TUNED FOR YOU
          </span>
        </div>
        <span className="font-mono text-[9px] text-text-dim">NOX ENGINE</span>
      </div>

      <div className="divide-y divide-border/50">
        {loading ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-accent" />
            <span className="font-mono text-[9px] text-text-dim">Computing taste vector...</span>
          </div>
        ) : error ? (
          <div className="p-4 space-y-2 text-center">
            <p className="font-sans text-xs text-text-dim">
              {error.includes("Last.fm")
                ? "Connect Last.fm to get personalized recommendations."
                : error}
            </p>
            <button
              onClick={() => {
                setLoading(true);
                setError(null);
                getRecommendations(6)
                  .then(setData)
                  .catch((e) => setError(e.message))
                  .finally(() => setLoading(false));
              }}
              className="text-[10px] font-mono text-accent hover:underline cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : !data?.recommendations?.length ? (
          <div className="p-4 text-center">
            <p className="font-sans text-xs text-text-dim">No recommendations yet. Connect Last.fm to get started.</p>
          </div>
        ) : (
          data.recommendations.map((track, i) => (
            <TrackCard key={`${track.name}-${track.artist}`} track={track} index={i} />
          ))
        )}
      </div>

      {/* Footer — taste summary */}
      {data?.taste_summary?.top_genres?.length > 0 && (
        <div className="px-4 py-2 border-t border-border bg-surface-sunken flex flex-wrap gap-1">
          {data.taste_summary.top_genres.slice(0, 3).map((g) => (
            <span key={g} className="font-mono text-[8px] text-text-dim px-1.5 py-0.5 rounded bg-surface-raised border border-border">
              {g}
            </span>
          ))}
          <span className="font-mono text-[8px] text-text-dim">matched</span>
        </div>
      )}
    </section>
  );
}
