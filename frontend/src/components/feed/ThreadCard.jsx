import { Mic, Hash } from "lucide-react";
import Avatar from "../Avatar";
import SocialActions from "../SocialActions";
import { cn } from "../../lib/cn";

function formatTimeAgo(dateString) {
  if (!dateString) return "Recently";
  const date = new Date(dateString);
  const now = new Date();
  const diffInSecs = Math.floor((now - date) / 1000);

  if (diffInSecs < 60) return "just now";
  if (diffInSecs < 3600) return `${Math.floor(diffInSecs / 60)}m`;
  if (diffInSecs < 86400) return `${Math.floor(diffInSecs / 3600)}h`;
  if (diffInSecs < 604800) return `${Math.floor(diffInSecs / 86400)}d`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function ThreadCard({
  thread,
  tag,
  onSelect,
  onSelectTag,
  className,
}) {
  const authorName = thread.author_name || thread.username || `audiphile_${thread.user_id || 1}`;
  const authorHandle = authorName.toLowerCase().replace(/\s+/g, "_");
  const tagInfo = tag || (thread.tag_name ? { id: thread.tag_id, name: thread.tag_name, type: thread.tag_type } : null);

  // Extract flair if present in [Flair] format
  const flairMatch = thread.body?.match(/^\[(.*?)\]\s*(.*)/s);
  const flair = flairMatch ? flairMatch[1] : null;
  const cleanBody = flairMatch ? flairMatch[2] : thread.body;

  // Get artwork thumbnail based on tag or thread
  const thumbnailSrc = thread.image_url || (
    tagInfo?.name?.toLowerCase().includes("ambient")
      ? "/assets/editorial/ambient.svg"
      : tagInfo?.name?.toLowerCase().includes("industrial")
      ? "/assets/editorial/industrial.svg"
      : tagInfo?.name?.toLowerCase().includes("techno") || tagInfo?.name?.toLowerCase().includes("acid")
      ? "/assets/editorial/acid-house.svg"
      : (thread.id % 2 === 0 ? "/assets/editorial/vinyl-desk.svg" : "/assets/editorial/lofi-tape.svg")
  );

  return (
    <article
      onClick={onSelect}
      className={cn(
        "group relative p-4 border-b border-border bg-surface hover:bg-surface-raised/60 transition-colors duration-150 cursor-pointer flex gap-3.5 text-left",
        className
      )}
    >
      {/* Left Column: Visual Artwork Thumbnail & Author Avatar */}
      <div className="flex flex-col items-center gap-2 shrink-0">
        <div className="w-12 h-12 rounded overflow-hidden border border-border bg-surface-sunken shadow-1 group-hover:border-accent transition-colors">
          <img
            src={thumbnailSrc}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.currentTarget.src = "/assets/editorial/vinyl-desk.svg";
            }}
          />
        </div>
        <Avatar username={authorName} size={22} />
      </div>

      {/* Right Column: Content & Controls */}
      <div className="min-w-0 flex-1 flex flex-col">
        {/* Header: Name, Handle, Timestamp, Tag Badge */}
        <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
          <div className="flex items-baseline gap-1.5 min-w-0">
            <span className="font-sans font-semibold text-sm text-text truncate group-hover:underline">
              {authorName}
            </span>
            <span className="font-mono text-xs text-text-dim truncate">
              @{authorHandle}
            </span>
            <span className="text-text-dim text-xs" aria-hidden="true">&middot;</span>
            <span className="font-mono text-xs text-text-dim flex-shrink-0">
              {formatTimeAgo(thread.created_at)}
            </span>
          </div>

          {/* Tag Badge */}
          {tagInfo && (
            <button
              type="button"
              onClick={(e) => {
                if (onSelectTag) {
                  e.stopPropagation();
                  onSelectTag(tagInfo);
                }
              }}
              className="inline-flex items-center gap-1 font-mono text-2xs uppercase tracking-wider px-2 py-0.5 rounded-full border border-border bg-surface-sunken hover:border-accent hover:text-accent text-text-muted transition-colors cursor-pointer"
            >
              {tagInfo.type === "artist" ? (
                <Mic className="w-2.5 h-2.5 stroke-[2] text-accent" />
              ) : (
                <Hash className="w-2.5 h-2.5 stroke-[2] text-secondary" />
              )}
              <span>{tagInfo.name}</span>
            </button>
          )}
        </div>

        {/* Title and Body */}
        <div className="space-y-1">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            {flair && (
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.2 rounded bg-accent/15 text-accent border border-accent/25">
                {flair}
              </span>
            )}
            <h2 className="font-heading font-bold text-base text-text leading-snug tracking-tight group-hover:text-accent transition-colors m-0">
              {thread.title}
            </h2>
          </div>

          {cleanBody && (
            <p className="font-sans text-sm text-text-muted leading-relaxed line-clamp-3 m-0">
              {cleanBody}
            </p>
          )}
        </div>

        {/* Bottom Social Action Bar */}
        <div className="mt-2.5 pt-1.5 flex items-center justify-between">
          <SocialActions
            id={thread.id}
            type="thread"
            replyCount={thread.post_count || 0}
          />
        </div>
      </div>
    </article>
  );
}
