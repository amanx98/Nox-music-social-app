import { useState } from "react";
import { useToast } from "./Toast";

export default function SocialActions({
  id,
  type = "thread",
  replyCount = 0,
  onReplyClick,
  initialLikes = 0,
  initialReposts = 0,
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
      addToast("Re-scrobbled to your profile!");
    }
  }

  function handleBookmark(e) {
    e.stopPropagation();
    const newBookmarked = !bookmarked;
    setBookmarked(newBookmarked);
    localStorage.setItem(`${storagePrefix}_bookmarked`, String(newBookmarked));
    addToast(newBookmarked ? "Saved to your bookmarks" : "Removed from bookmarks");
  }

  function handleShare(e) {
    e.stopPropagation();
    const shareUrl = window.location.origin + (window.location.pathname.includes("profile") ? "/" : window.location.pathname);
    navigator.clipboard?.writeText(shareUrl).then(
      () => addToast("Link copied to clipboard!"),
      () => addToast("Link ready to share: " + shareUrl)
    );
  }

  return (
    <div className="social-actions" onClick={(e) => e.stopPropagation()}>
      {/* Reply Button */}
      <button
        type="button"
        className="social-action-btn"
        onClick={onReplyClick}
        title="Reply"
      >
        <span>💬</span>
        <span>{replyCount}</span>
      </button>

      {/* Repost Button */}
      <button
        type="button"
        className={`social-action-btn ${reposted ? "reposted" : ""}`}
        onClick={handleRepost}
        title="Re-scrobble / Repost"
      >
        <span>🔁</span>
        <span>{reposts}</span>
      </button>

      {/* Like Button */}
      <button
        type="button"
        className={`social-action-btn ${liked ? "liked" : ""}`}
        onClick={handleLike}
        title="Like"
      >
        <span>{liked ? "❤️" : "🤍"}</span>
        <span>{likes}</span>
      </button>

      {/* Bookmark Button */}
      <button
        type="button"
        className={`social-action-btn ${bookmarked ? "bookmarked" : ""}`}
        onClick={handleBookmark}
        title={bookmarked ? "Bookmarked" : "Save / Bookmark"}
      >
        <span>{bookmarked ? "🔖" : "🏷️"}</span>
      </button>

      {/* Share Button */}
      <button
        type="button"
        className="social-action-btn"
        onClick={handleShare}
        title="Share"
      >
        <span>🔗</span>
      </button>
    </div>
  );
}
