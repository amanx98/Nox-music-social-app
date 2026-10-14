import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  Settings,
  Plus,
  Users,
  MessageSquare,
  Radio,
  Mic,
  Disc,
  Check,
  Share2,
} from "lucide-react";
import { resolveImageUrl } from "../../api/client";
import { useToast } from "../Toast";

export default function CommunityBannerWindow({
  tag,
  user,
  onOpenSettings,
  onOpenComposer,
  onTagUpdated,
}) {
  const { addToast } = useToast();
  const [isFollowing, setIsFollowing] = useState(false);

  const tagId = tag?.id;
  const isCreator = Boolean(
    tag?.is_creator || (user?.id && tag?.creator_id && user.id === tag.creator_id)
  );

  useEffect(() => {
    if (!tagId) return;
    const stored = localStorage.getItem(`nox_sub_${tagId}`);
    setIsFollowing(stored === "true");
  }, [tagId]);

  function handleToggleFollow() {
    if (!tagId) return;
    const nextState = !isFollowing;
    setIsFollowing(nextState);
    localStorage.setItem(`nox_sub_${tagId}`, nextState ? "true" : "false");
    addToast(
      nextState
        ? `Joined c/${tag.name} feed!`
        : `Left c/${tag.name}.`
    );
  }

  function handleShare() {
    const url = `${window.location.origin}/c/${encodeURIComponent(tag.name)}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      addToast("Community link copied to clipboard!");
    } else {
      addToast(url);
    }
  }

  if (!tag) return null;

  const themeColor = tag.theme_color || "#C7F43D";
  const bannerSrc = tag.banner_url ? resolveImageUrl(tag.banner_url) : null;
  const iconSrc = tag.icon_url ? resolveImageUrl(tag.icon_url) : null;

  return (
    <div className="w-full rounded-xl overflow-hidden border border-border bg-surface-raised shadow-3 transition-all duration-300">
      {/* 1. Hero Panoramic Banner Window (Reddit Subreddit Style) */}
      <div className="relative w-full h-44 sm:h-56 md:h-64 overflow-hidden bg-surface-sunken select-none">
        {bannerSrc ? (
          <img
            src={bannerSrc}
            alt={`${tag.name} banner`}
            className="w-full h-full object-cover object-center filter brightness-90 transition-transform duration-700 hover:scale-[1.02]"
          />
        ) : (
          /* Procedural Music Groove Banner based on community theme color */
          <div
            className="w-full h-full relative"
            style={{
              background: `radial-gradient(ellipse at 70% 30%, ${themeColor}22 0%, rgba(10, 11, 10, 0.95) 75%),
                           linear-gradient(135deg, #0e100f 0%, #151816 100%)`,
            }}
          >
            {/* Vinyl groove subtle concentric line textures */}
            <div
              className="absolute inset-0 opacity-15 pointer-events-none"
              style={{
                backgroundImage: `repeating-radial-gradient(circle at 50% 120%, transparent 0, transparent 4px, ${themeColor}40 5px, transparent 6px)`,
              }}
            />
          </div>
        )}

        {/* Ambient Dark Vignette for contrast & text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20 pointer-events-none" />

        {/* Top Floating Action Bar */}
        <div className="absolute top-3.5 left-3.5 right-3.5 z-10 flex items-center justify-between gap-2">
          {/* Subreddit badge */}
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/75 border border-white/10 backdrop-blur-md shadow-2">
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: themeColor }}
            />
            <span
              className="font-mono text-[9px] font-bold tracking-widest uppercase"
              style={{ color: themeColor }}
            >
              COMMUNITY // c/{tag.name}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShare}
              className="h-8 px-2.5 rounded-md bg-black/70 hover:bg-black text-text border border-white/10 backdrop-blur-md font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Share community link"
            >
              <Share2 className="w-3.5 h-3.5 text-text-dim" />
              <span className="hidden sm:inline text-xs">Share</span>
            </button>

            {isCreator && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="h-8 px-3 rounded-md bg-black/80 hover:bg-black text-white border border-accent/60 hover:border-accent backdrop-blur-md font-heading font-semibold text-xs flex items-center gap-1.5 transition-all shadow-2 cursor-pointer group"
                title="Customize this community (Creator only)"
              >
                <Settings
                  className="w-3.5 h-3.5 text-accent group-hover:rotate-45 transition-transform duration-300"
                />
                <span>Customize Scene</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Subreddit Header Bar with Overlapping Icon */}
      <div className="px-4 sm:px-6 pb-5 pt-0 relative">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 sm:-mt-14 relative z-10">
          {/* Community Avatar & Names */}
          <div className="flex items-end gap-3.5 sm:gap-4 min-w-0">
            {/* Community Avatar / Emblem */}
            <div className="relative shrink-0">
              <div
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-surface-sunken border-3 overflow-hidden shadow-4 flex items-center justify-center transition-transform hover:scale-105"
                style={{ borderColor: themeColor }}
              >
                {iconSrc ? (
                  <img
                    src={iconSrc}
                    alt={tag.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{ backgroundColor: `${themeColor}15` }}
                  >
                    {tag.type === "artist" ? (
                      <Mic className="w-10 h-10" style={{ color: themeColor }} />
                    ) : (
                      <Disc className="w-10 h-10" style={{ color: themeColor }} />
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Title & Founder Metadata */}
            <div className="min-w-0 pb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-heading font-black text-xl sm:text-2xl md:text-3xl text-text tracking-tight uppercase m-0 truncate">
                  c/{tag.name}
                </h1>
                <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface-sunken border border-border text-text-dim">
                  {tag.type}
                </span>
              </div>

              {/* Founder / Creator Attribution Pill */}
              <div className="flex items-center gap-2 mt-1 text-xs text-text-dim flex-wrap">
                {tag.creator_username ? (
                  <span className="font-sans flex items-center gap-1.5">
                    Founded by
                    <Link
                      to={`/profile/${tag.creator_username}`}
                      className="inline-flex items-center gap-1 font-semibold text-text hover:text-accent transition-colors"
                    >
                      {tag.creator_avatar_url && (
                        <img
                          src={resolveImageUrl(tag.creator_avatar_url)}
                          alt=""
                          className="w-4 h-4 rounded-full object-cover border border-white/20"
                        />
                      )}
                      <span>@{tag.creator_username}</span>
                    </Link>
                  </span>
                ) : (
                  <span className="font-sans">Founding Scene</span>
                )}

                <span className="text-border-strong">•</span>

                <span className="font-mono text-[11px] text-text-muted">
                  {tag.threads_count || 0} {tag.threads_count === 1 ? "take" : "takes"}
                </span>

                <span className="text-border-strong">•</span>

                <span className="font-mono text-[11px] text-text-muted">
                  {tag.posts_count || 0} {tag.posts_count === 1 ? "reply" : "replies"}
                </span>
              </div>
            </div>
          </div>

          {/* Action Hub (Follow & Post buttons) */}
          <div className="flex items-center gap-2 self-start sm:self-end shrink-0 pt-2 sm:pt-0">
            <button
              type="button"
              onClick={handleToggleFollow}
              className={`h-9 px-4 rounded-md font-heading font-bold text-xs tracking-tight transition-all cursor-pointer flex items-center gap-1.5 border ${
                isFollowing
                  ? "bg-surface-sunken border-accent/40 text-accent hover:border-danger hover:text-danger"
                  : "bg-surface-raised hover:bg-surface border-border text-text"
              }`}
            >
              {isFollowing ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>JOINED</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>JOIN SCENE</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onOpenComposer}
              className="h-9 px-4 rounded-md bg-accent text-black hover:bg-accent-hover hover:text-black font-heading font-bold text-xs tracking-tight transition-all active:translate-y-px cursor-pointer shadow-1 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>POST IN c/{tag.name}</span>
            </button>
          </div>
        </div>

        {/* Tag Description preview if available on mobile */}
        {tag.description && (
          <p className="font-sans text-xs sm:text-sm text-text-muted mt-3 max-w-3xl leading-relaxed">
            {tag.description}
          </p>
        )}
      </div>
    </div>
  );
}
