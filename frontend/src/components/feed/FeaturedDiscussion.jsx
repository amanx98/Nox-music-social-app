import { MessageSquare, Heart, Flame, ArrowUpRight } from "lucide-react";
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

export default function FeaturedDiscussion({ thread, onSelectThread, onSelectTag }) {
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

  // Fallback image points to repository-owned editorial vinyl desk asset
  const artworkSrc = thread?.image_url || "/assets/editorial/vinyl-desk.svg";

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
          title="Frequency feed active"
          aria-label="Audio equalizer"
        >
          <span className="w-[2.5px] bg-accent rounded-xs animate-eq-1" />
          <span className="w-[2.5px] bg-accent rounded-xs animate-eq-2" />
          <span className="w-[2.5px] bg-accent rounded-xs animate-eq-3" />
          <span className="w-[2.5px] bg-accent rounded-xs animate-eq-4" />
        </div>
      </div>

      {/* Main Grid: Artwork + Editorial Content */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 p-4 sm:p-6 items-center">
        {/* Dominant Square Album Artwork with subtle 2-degree diagonal energy */}
        <div className="md:col-span-5 flex justify-center">
          <div
            onClick={() => onSelectThread?.(thread)}
            className="relative w-full max-w-[280px] aspect-square rounded-md overflow-hidden border border-border bg-surface-sunken cursor-pointer shadow-3 group-hover:border-accent transition-all duration-300 desk-diagonal"
          >
            <img
              src={artworkSrc}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onError={(e) => {
                e.currentTarget.src = "/assets/editorial/vinyl-desk.svg";
              }}
            />
            {/* Fine Analog Scanline Overlay on Artwork */}
            <div className="absolute inset-0 scanlines opacity-40 pointer-events-none" />
            
            {/* Corner Badge */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                onSelectTag?.({ name: tagName, id: thread?.tag_id });
              }}
              className="absolute bottom-2 left-2 px-2 py-1 rounded-[3px] bg-surface-raised/90 backdrop-blur-sm border border-border font-mono text-[9px] text-text-muted hover:text-accent hover:border-accent/40 cursor-pointer transition-colors"
            >
              #{tagName}
            </div>
          </div>
        </div>

        {/* Editorial Discussion Column */}
        <div className="md:col-span-7 flex flex-col justify-between space-y-3">
          {/* Author Line */}
          <div className="flex items-center gap-2">
            <Avatar username={authorName} src={thread?.author_avatar_url || thread?.avatar_url} size={30} />
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="font-heading font-bold text-xs text-text">{authorName}</span>
              <span className="font-mono text-[11px] text-text-dim">@{authorName.toLowerCase()}</span>
              <span className="text-text-dim text-xs">&middot;</span>
              <span className="font-mono text-[11px] text-text-dim">
                {thread ? formatTimeAgo(thread.created_at) : "Tonight // 01:45"}
              </span>
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
          <p className="font-sans text-xs sm:text-sm text-text-muted leading-relaxed line-clamp-3 m-0">
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
