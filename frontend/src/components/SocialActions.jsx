import { useState } from "react";
import { MessageSquare, Repeat2, Heart, Bookmark, Share2 } from "lucide-react";
import { useToast } from "./Toast";
import { cn } from "../lib/cn";

export default function SocialActions({
  id,
  type = "thread",
  replyCount = 0,
  onReplyClick,
  initialLikes = 0,
  initialReposts = 0,
  className,
}) {
  const { addToast } = useToast();
  const storagePrefix = `nox_${type}_${id}`;

  const [liked, setLiked] = useState(() => {
    return localStorage.getItem(`${storagePrefix}_liked`) === "true";
  });
  const [likes, setLikes] = useState(() => {
    const saved = localStorage.getItem(`${storagePrefix}_likes_count`);
    return saved !== null ? parseInt(saved, 10) : initialLikes;
  });

  const [reposted, setReposted] = useState(() => {
    return localStorage.getItem(`${storagePrefix}_reposted`) === "true";
  });
  const [reposts, setReposts] = useState(() => {
    const saved = localStorage.getItem(`${storagePrefix}_reposts_count`);
    return saved !== null ? parseInt(saved, 10) : initialReposts;
  });

  const [bookmarked, setBookmarked] = useState(() => {
    return localStorage.getItem(`${storagePrefix}_bookmarked`) === "true";
  });

  function handleLike(e) {
    e.stopPropagation();
    const newLiked = !liked;
    const newCount = newLiked ? likes + 1 : Math.max(0, likes - 1);
    setLiked(newLiked);
    setLikes(newCount);
    localStorage.setItem(`${storagePrefix}_liked`, String(newLiked));
    localStorage.setItem(`${storagePrefix}_likes_count`, String(newCount));
  }

  function handleRepost(e) {
    e.stopPropagation();
    const newReposted = !reposted;
    const newCount = newReposted ? reposts + 1 : Math.max(0, reposts - 1);
    setReposted(newReposted);
    setReposts(newCount);
    localStorage.setItem(`${storagePrefix}_reposted`, String(newReposted));
    localStorage.setItem(`${storagePrefix}_reposts_count`, String(newCount));
    if (newReposted) {
      addToast("Reposted to your profile");
    }
  }

  function handleBookmark(e) {
    e.stopPropagation();
    const newBookmarked = !bookmarked;
    setBookmarked(newBookmarked);
    localStorage.setItem(`${storagePrefix}_bookmarked`, String(newBookmarked));
    addToast(newBookmarked ? "Saved to bookmarks" : "Removed from bookmarks");
  }

  function handleShare(e) {
    e.stopPropagation();
    const shareUrl = window.location.origin + (window.location.pathname.includes("profile") ? "/" : window.location.pathname);
    navigator.clipboard?.writeText(shareUrl).then(
      () => addToast("Link copied to clipboard"),
      () => addToast("Link: " + shareUrl)
    );
  }

  return (
    <div
      className={cn("flex items-center justify-between max-w-sm w-full text-text-muted select-none", className)}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Reply Button */}
      <button
        type="button"
        className="group flex items-center gap-1.5 text-xs transition-colors hover:text-text cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 rounded"
        onClick={onReplyClick}
        aria-label={`Reply (${replyCount} replies)`}
      >
        <div className="w-7 h-7 rounded-full flex items-center justify-center transition-colors group-hover:bg-surface-raised">
          <MessageSquare className="w-4 h-4 stroke-[1.75]" />
        </div>
        <span className="font-mono text-2xs tabular-nums text-text-dim group-hover:text-text">
          {replyCount > 0 ? replyCount : ""}
        </span>
      </button>

      {/* Repost Button */}
      <button
        type="button"
        className={cn(
          "group flex items-center gap-1.5 text-xs transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 rounded",
          reposted ? "text-emerald-400" : "hover:text-emerald-400"
        )}
        onClick={handleRepost}
        aria-label={`Repost (${reposts} reposts)`}
      >
        <div className="w-7 h-7 rounded-full flex items-center justify-center transition-colors group-hover:bg-emerald-500/10">
          <Repeat2 className="w-4 h-4 stroke-[1.75]" />
        </div>
        <span className={cn("font-mono text-2xs tabular-nums", reposted ? "text-emerald-400" : "text-text-dim group-hover:text-emerald-400")}>
          {reposts > 0 ? reposts : ""}
        </span>
      </button>

      {/* Like Button */}
      <button
        type="button"
        className={cn(
          "group flex items-center gap-1.5 text-xs transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 rounded",
          liked ? "text-rose-500" : "hover:text-rose-400"
        )}
        onClick={handleLike}
        aria-label={`Like (${likes} likes)`}
      >
        <div className="w-7 h-7 rounded-full flex items-center justify-center transition-colors group-hover:bg-rose-500/10">
          <Heart
            className={cn(
              "w-4 h-4 stroke-[1.75] transition-transform group-active:scale-125",
              liked && "fill-rose-500 stroke-rose-500"
            )}
          />
        </div>
        <span className={cn("font-mono text-2xs tabular-nums", liked ? "text-rose-500 font-medium" : "text-text-dim group-hover:text-rose-400")}>
          {likes > 0 ? likes : ""}
        </span>
      </button>

      {/* Bookmark Button */}
      <button
        type="button"
        className={cn(
          "group flex items-center gap-1 text-xs transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 rounded",
          bookmarked ? "text-amber-400" : "hover:text-amber-400"
        )}
        onClick={handleBookmark}
        aria-label={bookmarked ? "Bookmarked" : "Bookmark"}
      >
        <div className="w-7 h-7 rounded-full flex items-center justify-center transition-colors group-hover:bg-amber-500/10">
          <Bookmark
            className={cn(
              "w-4 h-4 stroke-[1.75]",
              bookmarked && "fill-amber-400 stroke-amber-400"
            )}
          />
        </div>
      </button>

      {/* Share Button */}
      <button
        type="button"
        className="group flex items-center gap-1 text-xs transition-colors hover:text-accent cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 rounded"
        onClick={handleShare}
        aria-label="Share"
      >
        <div className="w-7 h-7 rounded-full flex items-center justify-center transition-colors group-hover:bg-accent/10">
          <Share2 className="w-4 h-4 stroke-[1.75]" />
        </div>
      </button>
    </div>
  );
}
