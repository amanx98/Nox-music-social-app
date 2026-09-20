import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { LayoutGrid, ArrowRight, ExternalLink, Sparkles, Clock } from "lucide-react";
import { getQuilts, getTopAlbums } from "../../api/client";
import { cn } from "../../lib/cn";

const PERIOD_NAMES = {
  overall: "ALL TIME",
  "7day": "LAST 7 DAYS",
  "1month": "LAST MONTH",
  "3month": "LAST 3 MONTHS",
  "6month": "LAST 6 MONTHS",
  "12month": "PAST YEAR",
};

export default function TopsterSpotlight({ user }) {
  const [mode, setMode] = useState(() => {
    try {
      return localStorage.getItem("nox_topster_spotlight_mode") || "all_time";
    } catch {
      return "all_time";
    }
  });

  const [quilts, setQuilts] = useState([]);
  const [fallbackAlbums, setFallbackAlbums] = useState([]);
  const [loading, setLoading] = useState(true);

  // Sync mode changes across tabs or from Profile Settings
  useEffect(() => {
    function handleModeSync(e) {
      const nextMode = e.detail || (e.key === "nox_topster_spotlight_mode" ? e.newValue : null);
      if (nextMode && (nextMode === "all_time" || nextMode === "latest")) {
        setMode(nextMode);
      }
    }
    window.addEventListener("nox-spotlight-mode-change", handleModeSync);
    window.addEventListener("storage", handleModeSync);
    return () => {
      window.removeEventListener("nox-spotlight-mode-change", handleModeSync);
      window.removeEventListener("storage", handleModeSync);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    getQuilts()
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          setQuilts(data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // If no generated quilts exist, fetch top albums for the active mode
  useEffect(() => {
    if (quilts.length > 0) return;
    let isMounted = true;
    const albumPeriod = mode === "latest" ? "7day" : "overall";
    getTopAlbums(albumPeriod)
      .then((data) => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setFallbackAlbums(data);
        }
      })
      .catch(() => {
        if (isMounted) setFallbackAlbums([]);
      });

    return () => {
      isMounted = false;
    };
  }, [quilts.length, mode]);

  function handleModeChange(newMode) {
    if (newMode === mode) return;
    setMode(newMode);
    try {
      localStorage.setItem("nox_topster_spotlight_mode", newMode);
    } catch {}
    window.dispatchEvent(new CustomEvent("nox-spotlight-mode-change", { detail: newMode }));
  }

  // Sort quilts newest first
  const sortedQuilts = [...quilts].sort((a, b) => {
    const dateDiff = new Date(b.created_at || 0) - new Date(a.created_at || 0);
    if (dateDiff !== 0) return dateDiff;
    return (b.id || 0) - (a.id || 0);
  });

  // Pick topster based on selected mode
  let displayedQuilt = null;
  if (mode === "latest") {
    // The most recently created quilt
    displayedQuilt = sortedQuilts[0] || null;
  } else {
    // The default all-time quilt ('overall' period), or oldest/first fallback
    displayedQuilt =
      sortedQuilts.find((q) => q.period === "overall") ||
      sortedQuilts[sortedQuilts.length - 1] ||
      null;
  }

  const fallbackAlbum = fallbackAlbums[0];
  const imageSrc =
    displayedQuilt?.image_url ||
    fallbackAlbum?.image_url ||
    "/assets/editorial/topster-nine.svg";

  const periodLabel = displayedQuilt
    ? PERIOD_NAMES[displayedQuilt.period] || displayedQuilt.period.toUpperCase()
    : mode === "latest"
    ? "LAST 7 DAYS"
    : "ALL TIME";

  const title = displayedQuilt
    ? `${displayedQuilt.quilt_type.toUpperCase()} QUILT // ${periodLabel}`
    : fallbackAlbum
    ? `${fallbackAlbum.name} // ${fallbackAlbum.artist}`
    : mode === "latest"
    ? "Latest Transmission // Analog Tape Rot"
    : "Late Night Industrial & Analog Tape Rot";

  const curator = user?.username ? `@${user.username}` : "@resonator";

  return (
    <div
      aria-label="Topster of the Hour"
      className="rounded-md border border-border bg-surface-raised p-4 space-y-3 shadow-1 text-left"
    >
      {/* Header & Mode Switcher */}
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="font-mono text-[9px] uppercase tracking-widest text-accent font-bold">
            TOPSTER OF THE HOUR
          </span>
        </div>
        <LayoutGrid className="w-3.5 h-3.5 text-text-dim" />
      </div>

      {/* Pill Switcher: All Time vs Latest */}
      <div
        role="tablist"
        aria-label="Topster display mode"
        className="inline-flex items-center w-full p-1 rounded-lg bg-[#121412] border border-white/10"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "all_time"}
          onClick={() => handleModeChange("all_time")}
          style={mode === "all_time" ? { backgroundColor: "#C7F43D", color: "#0A0B0A" } : undefined}
          className={cn(
            "flex-1 py-1.5 px-2 rounded-md text-xs font-heading font-semibold transition-all cursor-pointer text-center flex items-center justify-center gap-1.5",
            mode === "all_time"
              ? "bg-accent text-black font-bold shadow-md border border-accent"
              : "bg-[#1E211E] text-[#F4F5EF] border border-white/10 hover:bg-[#282C28] hover:text-white"
          )}
        >
          <Sparkles className="w-3 h-3" style={mode === "all_time" ? { color: "#0A0B0A", stroke: "#0A0B0A" } : undefined} />
          <span>All Time</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "latest"}
          onClick={() => handleModeChange("latest")}
          style={mode === "latest" ? { backgroundColor: "#C7F43D", color: "#0A0B0A" } : undefined}
          className={cn(
            "flex-1 py-1.5 px-2 rounded-md text-xs font-heading font-semibold transition-all cursor-pointer text-center flex items-center justify-center gap-1.5",
            mode === "latest"
              ? "bg-accent text-black font-bold shadow-md border border-accent"
              : "bg-[#1E211E] text-[#F4F5EF] border border-white/10 hover:bg-[#282C28] hover:text-white"
          )}
        >
          <Clock className="w-3 h-3" style={mode === "latest" ? { color: "#0A0B0A", stroke: "#0A0B0A" } : undefined} />
          <span>Latest</span>
        </button>
      </div>

      {/* Quilt Image Box with Subtle Desk Energy */}
      <Link
        to="/topsters"
        className="block relative aspect-square rounded overflow-hidden border border-border bg-surface-sunken group shadow-2 focus-visible:outline-2 focus-visible:outline-accent"
      >
        {loading ? (
          <div className="w-full h-full bg-surface-raised animate-pulse" />
        ) : (
          <img
            src={imageSrc}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              e.currentTarget.src = "/assets/editorial/topster-nine.svg";
            }}
          />
        )}
        {/* Analog Scanline Overlay */}
        <div className="absolute inset-0 scanlines opacity-35 pointer-events-none" />

        {/* Mode Tag on top of image */}
        <div className="absolute top-2 left-2 pointer-events-none">
          <span
            style={mode === "latest" ? { backgroundColor: "#C7F43D", color: "#0A0B0A" } : undefined}
            className={cn(
              "font-mono text-[9px] uppercase font-bold px-2 py-0.5 rounded shadow-sm",
              mode === "latest"
                ? "bg-accent text-black border border-accent"
                : "bg-surface-sunken/90 backdrop-blur-sm text-text border border-border"
            )}
          >
            {mode === "latest" ? "LATEST" : "ALL TIME"}
          </span>
        </div>

        {/* Hover View Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 font-heading text-xs font-bold text-text">
          <span>Open Full Topster</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </Link>

      {/* Title & Curator Info */}
      <div className="space-y-1">
        <h4 className="font-heading font-bold text-xs text-text truncate m-0">
          {title}
        </h4>
        <div className="flex items-center justify-between font-mono text-[10px] text-text-dim">
          <span>Curator: <span className="text-text font-semibold">{curator}</span></span>
          <span className="text-accent">{periodLabel}</span>
        </div>
      </div>

      {/* Action to Open Topster */}
      <Link
        to="/topsters"
        className="inline-flex items-center justify-between w-full h-8 px-3 rounded-md bg-surface hover:bg-surface-hover border border-border font-heading font-semibold text-xs text-text hover:text-accent transition-colors"
      >
        <span>Explore Canvas Archive</span>
        <ExternalLink className="w-3 h-3 text-text-dim" />
      </Link>
    </div>
  );
}
