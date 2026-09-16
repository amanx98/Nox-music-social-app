import { useState, useEffect } from "react";
import { Radio, Disc, Flame, Sparkles, Volume2 } from "lucide-react";

const DEFAULT_SIGNALS = [
  {
    id: 1,
    type: "on_air",
    icon: Volume2,
    badge: "ON-AIR",
    text: "NOW PLAYING: Boards of Canada — Music Is Math [Transmission 02:44]",
  },
  {
    id: 2,
    type: "discussion",
    icon: Flame,
    badge: "ACTIVE DEBATE",
    text: "DISCUSSING: Is the 90s shoegaze revival peaking or mutating? (48 takes)",
  },
  {
    id: 3,
    type: "topster",
    icon: Sparkles,
    badge: "FRESH TOPSTER",
    text: "@vinyl_junkie compiled 'Downtempo Essentials 1994–2002' [9 Albums]",
  },
  {
    id: 4,
    type: "session",
    icon: Radio,
    badge: "LIVE SESSION",
    text: "Sub-Station London pirate radio broadcast live on 104.4 MHz",
  },
  {
    id: 5,
    type: "rotation",
    icon: Disc,
    badge: "HEAVY ROTATION",
    text: "Burial — Untrue 20th Anniversary Retrospective running in #ambient",
  },
];

export default function BroadcastTicker({ signals = DEFAULT_SIGNALS }) {
  const [items, setItems] = useState(signals);

  useEffect(() => {
    if (signals && signals.length > 0) {
      setItems(signals);
    }
  }, [signals]);

  return (
    <div
      role="region"
      aria-label="Live Broadcast Community Ticker"
      className="w-full bg-surface-sunken border-b border-border text-text overflow-hidden select-none relative z-30"
    >
      <div className="max-w-[1440px] mx-auto flex items-center h-8 px-3">
        {/* Left Fixed Broadcast Indicator */}
        <div className="flex items-center gap-1.5 pr-3 mr-3 border-r border-border shrink-0">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" aria-hidden="true" />
          <span className="font-mono text-[10px] font-bold tracking-widest text-accent uppercase">
            LIVE WIRE
          </span>
        </div>

        {/* Continuous Marquee Stream with Hover-Pause & Reduced-Motion Floor */}
        <div className="overflow-hidden whitespace-nowrap flex-1 relative mask-ticker">
          <div className="inline-flex items-center gap-8 animate-ticker hover:[animation-play-state:paused] focus-within:[animation-play-state:paused]">
            {/* Duplicated list ensures smooth continuous loop */}
            {[...items, ...items].map((signal, idx) => {
              const Icon = signal.icon || Radio;
              return (
                <div
                  key={`${signal.id}-${idx}`}
                  className="inline-flex items-center gap-2 font-mono text-[11px] text-text-muted hover:text-text transition-colors cursor-default"
                >
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[3px] bg-surface-raised border border-border text-[9px] font-bold text-accent tracking-wider">
                    <Icon className="w-2.5 h-2.5 stroke-[2]" />
                    <span>{signal.badge}</span>
                  </span>
                  <span className="tracking-tight text-text/90 font-sans text-xs">
                    {signal.text}
                  </span>
                  <span className="text-text-dim px-2" aria-hidden="true">
                    //
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
