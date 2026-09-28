import { useState, useEffect, useRef } from "react";
import { MessageSquare, Heart, Flame, ArrowUpRight, Play, Pause, Disc3, Pencil } from "lucide-react";
import { resolveMusicArt } from "../../api/client";
import Avatar from "../Avatar";

function formatTimeAgo(dateString) {
  if (!dateString) return "Recently";
  const date = new Date(dateString);
  const now = new Date();
  const diffInSecs = Math.floor((now - date) / 1000);

  if (diffInSecs < 60) return "just now";
  if (diffInSecs < 3600) return `${Math.floor(diffInSecs / 60)}m`;
  if (diffInSecs < 86400) return `${Math.floor(diffInSecs / 3600)}h`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function FeaturedDiscussion({ thread, onSelectThread, onSelectTag, onEdit, currentUser }) {
  // If no thread exists yet in database, provide an authentic broadcast editorial showcase
  const title = thread?.title || "Untrue at 20: How South London's Night Bus Sound Built Modern Dubstep";
  const rawBody = thread?.body || "Burial's vinyl hiss, pitched vocal fragments, and rain recordings weren't aesthetic quirks—they were forensic evidence of late-night club migration across London.";
  
  // Clean flair if present
  const flairMatch = rawBody?.match(/^\[(.*?)\]\s*(.*)/s);
  const flair = flairMatch ? flairMatch[1] : "ESSAY // DISSECTION";
  const cleanBody = flairMatch ? flairMatch[2] : rawBody;

  const authorName = thread?.author_name || thread?.username || "freq_archivist";
  const tagName = thread?.tag_name || "ambient";
  const replyCount = thread?.post_count ?? 24;
  const reactions = 86;

  // Auto-resolve artwork and preview if thread does not have explicit user media
  const [resolvedArt, setResolvedArt] = useState(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    if (thread?.image_url) {
      setResolvedArt(null);
      return;
    }

    let isMounted = true;
    const sampleText = `${title} ${cleanBody}`.slice(0, 140);

    resolveMusicArt(sampleText, tagName)
      .then((data) => {
        if (isMounted && data && data.artwork_url) {
          setResolvedArt(data);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [thread?.id, thread?.image_url, title, cleanBody, tagName]);

  function togglePreviewAudio(e) {
    e.stopPropagation();
    if (!audioRef.current || !resolvedArt?.preview_url) return;
    if (isPlayingPreview) {
      audioRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlayingPreview(true);
      }).catch(() => {
        setIsPlayingPreview(false);
      });
    }
  }

  // Active artwork: user-attached image, or auto-resolved album/artist art, or vinyl desk
  const artworkSrc = thread?.image_url || resolvedArt?.artwork_url || "/assets/editorial/vinyl-desk.svg";

  return (
    <article
      className="relative rounded-md border border-border bg-surface-raised overflow-hidden shadow-2 transition-all hover:border-border-strong group"
      aria-label="Featured Discussion"
    >
      {/* Subtle Angle Accent Header Tab */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface-sunken/80">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-[3px] bg-accent text-black">
            <Flame className="w-2.5 h-2.5 fill-black" />
            FEATURED
          </span>
          <span className="font-mono text-[10px] text-accent uppercase tracking-wider font-semibold">
            {flair}
          </span>
        </div>

        {/* Restrained Equalizer Animation Detail */}
        <div
          className="flex items-end gap-[3px] h-3.5 px-1.5 py-0.5 rounded bg-surface border border-border"
          title={isPlayingPreview ? "Audio preview playing" : "Frequency feed active"}
          aria-label="Audio equalizer"
        >
          <span className={`w-[2.5px] bg-accent rounded-xs ${isPlayingPreview ? "animate-eq-2" : "animate-eq-1"}`} />
          <span className={`w-[2.5px] bg-accent rounded-xs ${isPlayingPreview ? "animate-eq-3" : "animate-eq-2"}`} />
          <span className={`w-[2.5px] bg-accent rounded-xs ${isPlayingPreview ? "animate-eq-1" : "animate-eq-3"}`} />
          <span className={`w-[2.5px] bg-accent rounded-xs ${isPlayingPreview ? "animate-eq-4" : "animate-eq-4"}`} />
        </div>
      </div>

      {/* Main Grid: Artwork + Editorial Content */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 p-4 sm:p-6 items-center">
        {/* Dominant Visual Composition: Resolved Album Cover Art + Tilted Turntable Player */}
        <div className="md:col-span-5 flex justify-center py-2 sm:py-0">
          <div className="relative flex items-center justify-center select-none">
            {/* 1. Tilted Music Player Photo (Turntable vinyl desk) positioned next to / emerging behind album */}
            <div
              className="w-36 sm:w-44 aspect-square rounded-md overflow-hidden border border-border/80 bg-surface-sunken shadow-2 transform rotate-[5.5deg] translate-x-5 sm:translate-x-7 translate-y-2 opacity-85 group-hover:rotate-[3deg] group-hover:opacity-100 transition-all duration-500 shrink-0 pointer-events-none"
              title="Analogue Turntable Player"
            >
              <img
                src="/assets/editorial/vinyl-desk.svg"
                alt="Turntable Music Player"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 scanlines opacity-30" />
            </div>

            {/* 2. Headline Album Cover Sleeve / Artist Photo (Front & Sharp) */}
            <div
              onClick={() => onSelectThread?.(thread)}
              className="relative w-40 sm:w-48 aspect-square rounded-md overflow-hidden border border-border bg-surface-sunken cursor-pointer shadow-4 group-hover:border-accent group-hover:scale-105 transition-all duration-300 desk-diagonal z-10 -ml-16 sm:-ml-20 flex items-center justify-center"
            >
              {(thread?.media_type === "gif" || thread?.image_url) && (
                <div
                  className="absolute inset-0 bg-cover bg-center filter blur-md opacity-30 scale-110 pointer-events-none"
                  style={{ backgroundImage: `url(${artworkSrc})` }}
                />
              )}
              <img
                src={artworkSrc}
                alt={resolvedArt?.title || title}
                className={`relative z-10 ${
                  thread?.media_type === "gif"
                    ? "w-full h-full object-contain"
                    : "w-full h-full object-cover"
                } transition-transform duration-500`}
                onError={(e) => {
                  e.currentTarget.src = "/assets/editorial/vinyl-desk.svg";
                }}
              />

              {/* Fine Analog Scanline Overlay and Vinyl Sleeve Sheen */}
              <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-white/10 pointer-events-none" />
              <div className="absolute inset-0 scanlines opacity-30 pointer-events-none" />

              {/* 30s Preview Audio Play Toggle Overlay */}
              {resolvedArt?.preview_url && (
                <button
                  type="button"
                  onClick={togglePreviewAudio}
                  title={isPlayingPreview ? "Pause track preview" : "Play 30s track preview"}
                  className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-accent text-black flex items-center justify-center shadow-3 hover:scale-110 active:scale-95 transition-all cursor-pointer z-20"
                >
                  {isPlayingPreview ? (
                    <Pause className="w-4 h-4 fill-black" />
                  ) : (
                    <Play className="w-4 h-4 fill-black ml-0.5" />
                  )}
                </button>
              )}

              {/* Corner Badge */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectTag?.({ name: tagName, id: thread?.tag_id });
                }}
                className="absolute bottom-2 left-2 px-2 py-1 rounded-[3px] bg-surface-raised/90 backdrop-blur-sm border border-border font-mono text-[9px] text-text-muted hover:text-accent hover:border-accent/40 cursor-pointer transition-colors z-20"
              >
                #{tagName}
              </div>
            </div>

            {/* Hidden audio element for preview */}
            {resolvedArt?.preview_url && (
              <audio
                ref={audioRef}
                src={resolvedArt.preview_url}
                onEnded={() => setIsPlayingPreview(false)}
                preload="none"
              />
            )}
          </div>
        </div>

        {/* Editorial Discussion Column */}
        <div className="md:col-span-7 flex flex-col justify-between space-y-3">
          {/* Top Line: Author & Resolved Music Entity Badge */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Avatar username={authorName} src={thread?.author_avatar_url || thread?.avatar_url} size={30} />
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="font-heading font-bold text-xs text-text">{authorName}</span>
                <span className="font-mono text-[11px] text-text-dim">@{authorName.toLowerCase()}</span>
                <span className="text-text-dim text-xs">&middot;</span>
                <span className="font-mono text-[11px] text-text-dim">
                  {thread ? formatTimeAgo(thread.created_at) : "Tonight // 01:45"}
                </span>
                {thread?.updated_at && (
                  <span className="font-mono text-[10px] text-text-dim/60 italic">
                    (edited)
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Author Edit Button */}
              {thread && currentUser && (currentUser.id === thread.user_id || currentUser.username === thread.author_username) && onEdit && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(thread);
                  }}
                  title="Edit featured post"
                  className="inline-flex items-center gap-1 font-mono text-[10px] text-text-dim hover:text-accent hover:bg-surface px-2 py-0.5 rounded border border-border/80 hover:border-accent/40 transition-colors cursor-pointer"
                >
                  <Pencil className="w-2.5 h-2.5" />
                  <span>Edit</span>
                </button>
              )}

              {/* Resolved Music Badge */}
              {resolvedArt?.artist && (
                <div className="inline-flex items-center gap-1.5 font-mono text-[10px] text-accent font-semibold px-2 py-0.5 rounded bg-accent/10 border border-accent/20">
                  <Disc3 className={`w-3 h-3 ${isPlayingPreview ? "animate-spin" : ""}`} />
                  <span className="truncate max-w-[180px]">
                    {resolvedArt.artist} {resolvedArt.album ? `— ${resolvedArt.album}` : (resolvedArt.title ? `— ${resolvedArt.title}` : "")}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Bold Editorial Headline */}
          <h2
            onClick={() => onSelectThread?.(thread)}
            className="font-heading font-bold text-lg sm:text-xl lg:text-2xl text-text leading-snug tracking-tight group-hover:text-accent transition-colors cursor-pointer m-0"
          >
            {title}
          </h2>

          {/* Short Discussion Summary */}
          <p className="font-sans text-xs sm:text-sm text-text-muted leading-relaxed line-clamp-4 whitespace-pre-line m-0">
            {cleanBody}
          </p>

          {/* Bottom Action Row: Join Discussion Button & Counts */}
          <div className="pt-3 border-t border-border flex items-center justify-between gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => onSelectThread?.(thread)}
              className="h-8 px-3.5 rounded-md bg-accent text-black hover:bg-accent-hover hover:text-black font-heading font-bold text-xs tracking-tight transition-all active:translate-y-px cursor-pointer flex items-center gap-1.5 shadow-1"
            >
              <span>Join discussion</span>
              <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>

            {/* Reaction & Reply Counts */}
            <div className="flex items-center gap-3 font-mono text-2xs text-text-dim">
              <span className="inline-flex items-center gap-1 hover:text-accent transition-colors cursor-pointer">
                <Heart className="w-3 h-3" />
                <span>{reactions}</span>
              </span>
              <span className="inline-flex items-center gap-1 hover:text-text transition-colors cursor-pointer">
                <MessageSquare className="w-3 h-3" />
                <span>{replyCount} replies</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
