import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { LayoutGrid, ArrowRight, ExternalLink } from "lucide-react";
import { getQuilts } from "../../api/client";

export default function TopsterSpotlight({ user }) {
  const [latestQuilt, setLatestQuilt] = useState(null);

  useEffect(() => {
    let isMounted = true;
    getQuilts()
      .then((data) => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          // Take the newest quilt
          setLatestQuilt(data[0]);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const imageSrc = latestQuilt?.image_url || "/assets/editorial/topster-nine.svg";
  const title = latestQuilt
    ? `${latestQuilt.quilt_type.toUpperCase()} QUILT // ${latestQuilt.period.toUpperCase()}`
    : "Late Night Industrial & Analog Tape Rot";
  const curator = user?.username ? `@${user.username}` : "@resonator";

  return (
    <div
      aria-label="Topster of the Hour"
      className="rounded-md border border-border bg-surface-raised p-4 space-y-3 shadow-1 text-left"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="font-mono text-[9px] uppercase tracking-widest text-accent font-bold">
            TOPSTER OF THE HOUR
          </span>
        </div>
        <LayoutGrid className="w-3.5 h-3.5 text-text-dim" />
      </div>

      {/* Quilt Image Box with Subtle Desk Energy */}
      <Link
        to="/topsters"
        className="block relative aspect-square rounded overflow-hidden border border-border bg-surface-sunken group shadow-2 focus-visible:outline-2 focus-visible:outline-accent"
      >
        <img
          src={imageSrc}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            e.currentTarget.src = "/assets/editorial/topster-nine.svg";
          }}
        />
        {/* Analog Scanline Overlay */}
        <div className="absolute inset-0 scanlines opacity-35 pointer-events-none" />

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
          <span className="text-accent">9 Records</span>
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
