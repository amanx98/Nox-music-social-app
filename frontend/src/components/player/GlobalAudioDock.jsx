import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { Play, Pause, Volume2, VolumeX, X, Disc3 } from "lucide-react";
import { useAudio } from "../../context/AudioContext";

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export default function GlobalAudioDock() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    progress,
    volume,
    isMuted,
    playbackError,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    closePlayer,
  } = useAudio();

  const progressRef = useRef(null);

  if (!currentTrack) return null;

  const handleProgressClick = (e) => {
    if (!progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newPercent = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
    seek(newPercent);
  };

  return (
    <aside
      aria-label="Persistent Audio Player"
      className="fixed bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-[760px] z-50 bg-surface-raised/95 backdrop-blur-md border border-border-strong/80 rounded-xl shadow-2xl p-2.5 sm:px-4 text-text transition-all duration-300 animate-slide-up"
    >
      <div className="flex items-center justify-between gap-3 sm:gap-4">
        {/* Track Artwork & Info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-surface-sunken border border-border shadow-sm flex items-center justify-center">
            {currentTrack.artwork_url ? (
              <img
                src={currentTrack.artwork_url}
                alt=""
                className={`w-full h-full object-cover ${isPlaying ? "animate-spin-slow" : ""}`}
                style={{ animationDuration: "10s" }}
              />
            ) : (
              <Disc3 className={`w-5 h-5 text-accent ${isPlaying ? "animate-spin" : ""}`} />
            )}
            <div className="absolute inset-0 ring-1 ring-inset ring-black/10 rounded-lg" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-heading font-semibold text-xs sm:text-sm truncate text-text">
                {currentTrack.title || "Transmission Track"}
              </span>
              <span className="shrink-0 text-[9px] font-mono tracking-widest px-1.5 py-0.5 rounded bg-accent/15 text-accent uppercase font-bold">
                PREVIEW
              </span>
            </div>
            <div className="text-[11px] sm:text-xs text-text-dim truncate">
              {currentTrack.artist || "Unknown Artist"}
              {currentTrack.album && (
                <span className="hidden sm:inline"> — {currentTrack.album}</span>
              )}
            </div>
          </div>
        </div>

        {/* Playback Controls & Progress */}
        <div className="flex flex-col items-center gap-1 shrink-0 w-36 sm:w-64">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => togglePlay()}
              aria-label={isPlaying ? "Pause preview" : "Play preview"}
              className="w-8 h-8 rounded-full bg-accent text-accent-text hover:bg-accent-hover flex items-center justify-center transition-transform active:scale-95 shadow-sm cursor-pointer"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current stroke-[2]" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5 stroke-[2]" />
              )}
            </button>
            <span className="text-[10px] sm:text-xs font-mono text-text-muted select-none">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Interactive Scrub Bar */}
          <div
            ref={progressRef}
            onClick={handleProgressClick}
            className="w-full h-1.5 bg-surface-sunken hover:h-2 rounded-full cursor-pointer relative overflow-hidden transition-all group"
            title="Seek playback"
          >
            <div
              className="absolute left-0 top-0 bottom-0 bg-accent rounded-full transition-[width] duration-100 group-hover:bg-accent-hover"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Volume & Close */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleMute}
              aria-label={isMuted ? "Unmute" : "Mute"}
              className="p-1 rounded text-text-muted hover:text-text transition-colors cursor-pointer"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              aria-label="Volume slider"
              className="w-14 h-1 accent-accent bg-surface-sunken rounded-lg cursor-pointer"
            />
          </div>

          <button
            type="button"
            onClick={closePlayer}
            aria-label="Close audio player"
            className="p-1.5 rounded-md text-text-muted hover:text-text hover:bg-surface-hover transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {playbackError && (
        <div className="mt-1 text-[11px] text-amber-500 font-mono text-center">
          {playbackError}
        </div>
      )}
    </aside>
  );
}
