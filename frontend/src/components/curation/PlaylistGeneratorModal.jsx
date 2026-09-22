/**
 * PlaylistGeneratorModal — Generate a taste-matched playlist from the NOX engine.
 *
 * User selects an optional mood filter and/or seed artist,
 * then the engine generates a playlist from their taste vector.
 * Tracks can be previewed (30s Deezer) and the playlist can be saved.
 */
import { useState, useRef, useEffect } from "react";
import { X, Sparkles, Loader2, Play, Pause, Save, Music2, Check } from "lucide-react";
import { generatePlaylist, saveGeneratedPlaylist } from "../../api/client";

const MOOD_OPTIONS = [
  { value: null, label: "Any mood", emoji: "✦" },
  { value: "dreamy", label: "Dreamy", emoji: "🌙" },
  { value: "dark", label: "Dark", emoji: "⬛" },
  { value: "melancholic", label: "Melancholic", emoji: "🌧" },
  { value: "energetic", label: "Energetic", emoji: "⚡" },
  { value: "atmospheric", label: "Atmospheric", emoji: "🌫" },
  { value: "nostalgic", label: "Nostalgic", emoji: "📼" },
  { value: "ethereal", label: "Ethereal", emoji: "✨" },
  { value: "hypnotic", label: "Hypnotic", emoji: "🌀" },
];

function TrackRow({ track, index }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);

  function togglePlay(e) {
    e.stopPropagation();
    if (!track.preview_url) return;
    if (playing) {
      audioRef.current?.pause();
    } else {
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

  return (
    <div className="flex items-center gap-3 py-2 px-3 hover:bg-surface-raised rounded-md transition-colors group">
      {/* Index */}
      <span className="font-mono text-[10px] text-text-dim w-5 text-center shrink-0">
        {index + 1}
      </span>

      {/* Art */}
      <div className="relative w-8 h-8 rounded bg-surface-raised shrink-0 overflow-hidden">
        {track.image_url ? (
          <img src={track.image_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music2 className="w-3 h-3 text-text-dim" />
          </div>
        )}
        {track.preview_url && (
          <>
            <button
              onClick={togglePlay}
              className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              {playing ? (
                <Pause className="w-3 h-3 text-white" />
              ) : (
                <Play className="w-3 h-3 text-white fill-white" />
              )}
            </button>
            <audio ref={audioRef} src={track.preview_url} preload="none" />
          </>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-heading font-bold text-xs text-text truncate">{track.name}</p>
        <p className="font-sans text-[10px] text-text-dim truncate">{track.artist}</p>
      </div>

      {/* Score + tags */}
      <div className="flex flex-col items-end gap-0.5 shrink-0">
        {track.score !== undefined && (
          <span className="font-mono text-[9px] text-accent">
            {Math.round(track.score * 100)}%
          </span>
        )}
        {track.matching_tags?.slice(0, 1).map((t) => (
          <span key={t} className="font-mono text-[7px] px-1 rounded bg-accent/10 text-accent border border-accent/20">
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function PlaylistGeneratorModal({ isOpen, onClose }) {
  const [selectedMood, setSelectedMood] = useState(null);
  const [seedArtist, setSeedArtist] = useState("");
  const [playlistName, setPlaylistName] = useState("");
  const [playlist, setPlaylist] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  function reset() {
    setPlaylist(null);
    setSaved(false);
    setError(null);
  }

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    setSaved(false);
    try {
      const result = await generatePlaylist({
        mood: selectedMood,
        seed_artist: seedArtist.trim() || undefined,
        name: playlistName.trim() || undefined,
        length: 25,
      });
      setPlaylist(result.playlist);
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    if (!playlist) return;
    setSaving(true);
    try {
      await saveGeneratedPlaylist({
        mood: selectedMood,
        seed_artist: seedArtist.trim() || undefined,
        name: playlist.name,
        length: 25,
      });
      setSaved(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-lg border border-border bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" />
            <div>
              <h2 className="font-heading font-black text-sm text-text m-0">Generate Playlist</h2>
              <p className="font-mono text-[9px] text-text-dim">NOX Curation Engine</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-text-dim hover:text-text hover:bg-surface-raised transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Options */}
        <div className="px-5 py-4 border-b border-border space-y-4 shrink-0">
          {/* Mood selector */}
          <div>
            <p className="font-mono text-[9px] uppercase tracking-wider text-text-dim mb-2">Mood Filter</p>
            <div className="flex flex-wrap gap-1.5">
              {MOOD_OPTIONS.map((opt) => (
                <button
                  key={String(opt.value)}
                  onClick={() => { setSelectedMood(opt.value); reset(); }}
                  className={`h-7 px-2.5 rounded-md font-mono text-[9px] uppercase tracking-wider border transition-all cursor-pointer ${
                    selectedMood === opt.value
                      ? "bg-accent text-black border-accent font-bold"
                      : "bg-surface-raised border-border text-text-dim hover:border-accent/50 hover:text-text"
                  }`}
                >
                  {opt.emoji} {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Seed artist + name row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-mono text-[9px] uppercase tracking-wider text-text-dim block mb-1.5">
                Seed Artist (optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Cocteau Twins"
                value={seedArtist}
                onChange={(e) => { setSeedArtist(e.target.value); reset(); }}
                className="w-full h-8 px-3 rounded-md bg-surface-sunken border border-border text-xs text-text placeholder:text-text-dim outline-none focus:border-accent font-sans transition-colors"
              />
            </div>
            <div>
              <label className="font-mono text-[9px] uppercase tracking-wider text-text-dim block mb-1.5">
                Custom Name (optional)
              </label>
              <input
                type="text"
                placeholder="Auto-generated if empty"
                value={playlistName}
                onChange={(e) => setPlaylistName(e.target.value)}
                className="w-full h-8 px-3 rounded-md bg-surface-sunken border border-border text-xs text-text placeholder:text-text-dim outline-none focus:border-accent font-sans transition-colors"
              />
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full h-9 rounded-md bg-accent text-black hover:bg-accent-hover font-heading font-bold text-xs tracking-tight transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                {playlist ? "Regenerate" : "Generate Playlist"}
              </>
            )}
          </button>
        </div>

        {/* Playlist result */}
        {error && (
          <div className="px-5 py-3 border-b border-border shrink-0">
            <p className="font-sans text-xs text-red-400">{error}</p>
          </div>
        )}

        {playlist && (
          <>
            {/* Playlist header */}
            <div className="px-5 py-3 border-b border-border shrink-0 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-heading font-black text-xs text-text">{playlist.name}</h3>
                <p className="font-mono text-[9px] text-text-dim">
                  {playlist.track_count} tracks · NOX engine
                  {selectedMood && ` · ${selectedMood}`}
                </p>
              </div>
              <button
                onClick={handleSave}
                disabled={saving || saved}
                className={`h-8 px-3 rounded-md font-heading font-bold text-xs tracking-tight transition-all flex items-center gap-1.5 cursor-pointer ${
                  saved
                    ? "bg-surface-raised text-accent border border-accent/40"
                    : "bg-surface-raised hover:bg-surface text-text border border-border hover:border-accent/40 disabled:opacity-50 disabled:cursor-not-allowed"
                }`}
              >
                {saved ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Saved
                  </>
                ) : saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    Save
                  </>
                )}
              </button>
            </div>

            {/* Track list */}
            <div className="flex-1 overflow-y-auto px-2 py-2">
              {playlist.tracks.map((track, i) => (
                <TrackRow key={`${track.name}-${i}`} track={track} index={i} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
