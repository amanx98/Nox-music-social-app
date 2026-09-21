import { useState, useEffect } from "react";
import { MessageSquare, Repeat2, Heart, Bookmark, Share2 } from "lucide-react";
import { useToast } from "./Toast";
import { likeThread, repostThread, bookmarkThread } from "../api/client";
import { cn } from "../lib/cn";

export default function SocialActions({
  id,
  type = "thread",
  replyCount = 0,
  onReplyClick,
  initialLikes = 0,
  initialReposts = 0,
  isLiked = false,
  isReposted = false,
  isBookmarked = false,
  className,
}) {
  const { addToast } = useToast();
  const storagePrefix = `nox_${type}_${id}`;

  const [liked, setLiked] = useState(() => {
    if (typeof isLiked === "boolean") return isLiked;
    return localStorage.getItem(`${storagePrefix}_liked`) === "true";
  });
  const [likes, setLikes] = useState(() => {
    if (typeof initialLikes === "number" && initialLikes > 0) return initialLikes;
    const saved = localStorage.getItem(`${storagePrefix}_likes_count`);
    return saved !== null ? parseInt(saved, 10) : (initialLikes || 0);
  });

  const [reposted, setReposted] = useState(() => {
    if (typeof isReposted === "boolean") return isReposted;
    return localStorage.getItem(`${storagePrefix}_reposted`) === "true";
  });
  const [reposts, setReposts] = useState(() => {
    if (typeof initialReposts === "number" && initialReposts > 0) return initialReposts;
    const saved = localStorage.getItem(`${storagePrefix}_reposts_count`);
    return saved !== null ? parseInt(saved, 10) : (initialReposts || 0);
  });

  const [bookmarked, setBookmarked] = useState(() => {
    if (typeof isBookmarked === "boolean") return isBookmarked;
    return localStorage.getItem(`${storagePrefix}_bookmarked`) === "true";
  });

  // Sync with incoming props if they change
  useEffect(() => {
    if (typeof isLiked === "boolean") setLiked(isLiked);
    if (typeof initialLikes === "number") setLikes(initialLikes);
  }, [isLiked, initialLikes]);

  useEffect(() => {
    if (typeof isReposted === "boolean") setReposted(isReposted);
    if (typeof initialReposts === "number") setReposts(initialReposts);
  }, [isReposted, initialReposts]);

  useEffect(() => {
    if (typeof isBookmarked === "boolean") setBookmarked(isBookmarked);
  }, [isBookmarked]);

  // Synchronize across components on the same page via custom event
  useEffect(() => {
    function handleSocialSync(e) {
      if (!e.detail || e.detail.id !== id || e.detail.type !== type) return;
      if (e.detail.action === "like") {
        setLiked(e.detail.value);
        if (typeof e.detail.likesCount === "number") setLikes(e.detail.likesCount);
      } else if (e.detail.action === "repost") {
        setReposted(e.detail.value);
        if (typeof e.detail.repostsCount === "number") setReposts(e.detail.repostsCount);
      } else if (e.detail.action === "bookmark") {
        setBookmarked(e.detail.value);
      }
    }
    window.addEventListener("nox-social-action", handleSocialSync);
    return () => window.removeEventListener("nox-social-action", handleSocialSync);
  }, [id, type]);

  async function handleLike(e) {
    e.stopPropagation();
    const newLiked = !liked;
    const newCount = newLiked ? likes + 1 : Math.max(0, likes - 1);
    setLiked(newLiked);
    setLikes(newCount);

    localStorage.setItem(`${storagePrefix}_liked`, String(newLiked));
    localStorage.setItem(`${storagePrefix}_likes_count`, String(newCount));

    window.dispatchEvent(
      new CustomEvent("nox-social-action", {
        detail: { id, type, action: "like", value: newLiked, likesCount: newCount },
      })
    );

    if (type === "thread") {
      try {
        const res = await likeThread(id);
        if (res && typeof res.likes_count === "number") {
          setLikes(res.likes_count);
          localStorage.setItem(`${storagePrefix}_likes_count`, String(res.likes_count));
        }
      } catch {
        // Local state remains active for guest/offline fallback
      }
    }
  }

  async function handleRepost(e) {
    e.stopPropagation();
    const newReposted = !reposted;
    const newCount = newReposted ? reposts + 1 : Math.max(0, reposts - 1);
    setReposted(newReposted);
    setReposts(newCount);

    localStorage.setItem(`${storagePrefix}_reposted`, String(newReposted));
    localStorage.setItem(`${storagePrefix}_reposts_count`, String(newCount));

    if (newReposted) {
      addToast("Reposted to your profile");
    } else {
      addToast("Removed repost");
    }

    window.dispatchEvent(
      new CustomEvent("nox-social-action", {
        detail: { id, type, action: "repost", value: newReposted, repostsCount: newCount },
      })
    );

    if (type === "thread") {
      try {
        const res = await repostThread(id);
        if (res && typeof res.reposts_count === "number") {
          setReposts(res.reposts_count);
          localStorage.setItem(`${storagePrefix}_reposts_count`, String(res.reposts_count));
        }
      } catch {
        // Fallback gracefully
      }
    }
  }

  async function handleBookmark(e) {
    e.stopPropagation();
    const newBookmarked = !bookmarked;
    setBookmarked(newBookmarked);

    localStorage.setItem(`${storagePrefix}_bookmarked`, String(newBookmarked));

    if (newBookmarked) {
      addToast("Saved to bookmarks");
    } else {
      addToast("Removed from bookmarks");
    }

    window.dispatchEvent(
      new CustomEvent("nox-social-action", {
        detail: { id, type, action: "bookmark", value: newBookmarked },
      })
    );

    if (type === "thread") {
      try {
        await bookmarkThread(id);
      } catch {
        // Fallback gracefully
      }
    }
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
          reposted ? "text-accent" : "hover:text-accent"
        )}
        onClick={handleRepost}
        aria-label={`Repost (${reposts} reposts)`}
      >
        <div className="w-7 h-7 rounded-full flex items-center justify-center transition-colors group-hover:bg-accent/10">
          <Repeat2 className="w-4 h-4 stroke-[1.75]" />
        </div>
        <span className={cn("font-mono text-2xs tabular-nums", reposted ? "text-accent" : "text-text-dim group-hover:text-accent")}>
          {reposts > 0 ? reposts : ""}
        </span>
      </button>

      {/* Like Button */}
      <button
        type="button"
        className={cn(
          "group flex items-center gap-1.5 text-xs transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 rounded",
          liked ? "text-danger" : "hover:text-danger"
        )}
        onClick={handleLike}
        aria-label={`Like (${likes} likes)`}
      >
        <div className="w-7 h-7 rounded-full flex items-center justify-center transition-colors group-hover:bg-danger/10">
          <Heart
            className={cn(
              "w-4 h-4 stroke-[1.75] transition-transform group-active:scale-125",
              liked && "fill-danger stroke-danger"
            )}
          />
        </div>
        <span className={cn("font-mono text-2xs tabular-nums", liked ? "text-danger font-medium" : "text-text-dim group-hover:text-danger")}>
          {likes > 0 ? likes : ""}
        </span>
      </button>

      {/* Bookmark Button */}
      <button
        type="button"
        className={cn(
          "group flex items-center gap-1 text-xs transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 rounded",
          bookmarked ? "text-accent" : "hover:text-accent"
        )}
        onClick={handleBookmark}
        aria-label={bookmarked ? "Bookmarked" : "Bookmark"}
      >
        <div className="w-7 h-7 rounded-full flex items-center justify-center transition-colors group-hover:bg-accent/10">
          <Bookmark
            className={cn(
              "w-4 h-4 stroke-[1.75]",
              bookmarked && "fill-accent stroke-accent"
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
