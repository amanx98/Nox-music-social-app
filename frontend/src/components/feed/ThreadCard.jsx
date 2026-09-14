import Avatar from "../Avatar";
import { Badge } from "../ui/Badge";
import SocialActions from "../SocialActions";
import { cn } from "../../lib/cn";

function formatTimeAgo(dateString) {
  if (!dateString) return "Recently";
  const date = new Date(dateString);
  const now = new Date();
  const diffInSecs = Math.floor((now - date) / 1000);

  if (diffInSecs < 60) return "Just now";
  if (diffInSecs < 3600) return `${Math.floor(diffInSecs / 60)}m ago`;
  if (diffInSecs < 86400) return `${Math.floor(diffInSecs / 3600)}h ago`;
  if (diffInSecs < 604800) return `${Math.floor(diffInSecs / 86400)}d ago`;
  return date.toLocaleDateString();
}

export default function ThreadCard({
  thread,
  tag,
  onSelect,
  onSelectTag,
  className,
}) {
  const authorName = thread.author_name || thread.username || `audiphile_${thread.user_id || 1}`;
  const tagInfo = tag || (thread.tag_name ? { id: thread.tag_id, name: thread.tag_name, type: thread.tag_type } : null);

  // Extract flair if present in [Flair] format
  const flairMatch = thread.body?.match(/^\[(.*?)\]\s*(.*)/s);
  const flair = flairMatch ? flairMatch[1] : null;
  const cleanBody = flairMatch ? flairMatch[2] : thread.body;

  return (
    <article
      onClick={onSelect}
      className={cn(
        "group relative bg-surface-raised border border-border rounded-md p-5 transition-all duration-200 ease-out hover:border-border-strong hover:shadow-2 cursor-pointer flex flex-col gap-3.5",
        className
      )}
    >
      {/* Header: Author + Timestamp + Tag Pills */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar username={authorName} size={34} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-text truncate">
                {authorName}
              </span>
              <span className="text-2xs font-mono text-text-dim">
                &middot; {formatTimeAgo(thread.created_at)}
              </span>
            </div>
            <div className="text-2xs font-mono text-text-muted">
              @{authorName.toLowerCase().replace(/\s+/g, "_")}
            </div>
          </div>
        </div>

        {/* Tag Pill */}
        {tagInfo && (
          <div
            onClick={(e) => {
              if (onSelectTag) {
                e.stopPropagation();
                onSelectTag(tagInfo);
              }
            }}
          >
            <Badge
              variant={tagInfo.type === "artist" ? "accent" : "secondary"}
              className="hover:brightness-110 cursor-pointer"
            >
              <span>{tagInfo.type === "artist" ? "🎙️" : "🏷️"}</span>
              <span>#{tagInfo.name}</span>
            </Badge>
          </div>
        )}
      </div>

      {/* Content: Title + Body */}
      <div className="flex flex-col gap-1.5 max-w-[68ch]">
        <div className="flex items-baseline gap-2 flex-wrap">
          {flair && (
            <span className="inline-block px-2 py-0.5 rounded-xs text-2xs font-mono font-medium uppercase tracking-wider bg-surface-sunken text-accent border border-border">
              {flair}
            </span>
          )}
          <h2 className="text-base font-semibold text-text group-hover:text-accent transition-colors m-0 leading-snug">
            {thread.title}
          </h2>
        </div>

        {cleanBody && (
          <p className="text-sm text-text-muted line-clamp-3 m-0 leading-relaxed">
            {cleanBody}
          </p>
        )}
      </div>

      {/* Social Action Bar */}
      <div
        className="pt-2.5 border-t border-border/60 mt-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <SocialActions threadId={thread.id} replyCount={thread.post_count || 0} />
      </div>
    </article>
  );
}
