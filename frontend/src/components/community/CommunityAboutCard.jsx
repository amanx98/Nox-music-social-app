import { Link } from "react-router-dom";
import {
  ShieldAlert,
  Calendar,
  Layers,
  Sparkles,
  MessageSquare,
  Flame,
  Settings,
  Disc,
} from "lucide-react";
import { resolveImageUrl } from "../../api/client";

export default function CommunityAboutCard({
  tag,
  user,
  onOpenSettings,
  onOpenComposer,
}) {
  if (!tag) return null;

  const isCreator = Boolean(
    tag?.is_creator || (user?.id && tag?.creator_id && user.id === tag.creator_id)
  );

  const themeColor = tag.theme_color || "#C7F43D";

  // Parse rules list: support newlines or bullet format
  const rawRules = tag.rules || "";
  const rulesList = rawRules
    .split("\n")
    .map((r) => r.trim())
    .filter(Boolean);

  const formattedDate = tag.created_at
    ? new Date(tag.created_at).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    : "Recently";

  return (
    <aside className="space-y-4">
      {/* 1. About Scene Card */}
      <div className="rounded-xl border border-border bg-surface-raised overflow-hidden shadow-2">
        {/* Color accent header stripe */}
        <div
          className="h-2 w-full"
          style={{ backgroundColor: themeColor }}
        />

        <div className="p-4 sm:p-5 space-y-4">
          <div>
            <span className="font-mono text-[9px] uppercase tracking-widest text-text-dim font-bold block mb-1">
              SCENE DESK
            </span>
            <h2 className="font-heading font-black text-sm uppercase tracking-wide text-text m-0">
              About c/{tag.name}
            </h2>
          </div>

          <p className="font-sans text-xs text-text-muted leading-relaxed">
            {tag.description ||
              `Welcome to c/${tag.name}. An open circle for deep-listening discussions, record recommendations, and sound debates.`}
          </p>

          {/* Quick stats strip */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/80">
            <div className="p-2.5 rounded-lg bg-surface-sunken border border-border/60">
              <span className="font-mono text-2xs uppercase tracking-wider text-text-dim block">
                Dispatches
              </span>
              <span className="font-heading font-bold text-base text-text mt-0.5 block">
                {tag.threads_count || 0}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-surface-sunken border border-border/60">
              <span className="font-mono text-2xs uppercase tracking-wider text-text-dim block">
                Responses
              </span>
              <span className="font-heading font-bold text-base text-text mt-0.5 block">
                {tag.posts_count || 0}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px] text-text-dim pt-1">
            <Calendar className="w-3.5 h-3.5 text-text-dim shrink-0" />
            <span>Founded {formattedDate}</span>
          </div>

          {/* Post button inside sidebar */}
          <button
            type="button"
            onClick={onOpenComposer}
            className="w-full h-8 px-3 rounded-md bg-accent text-black hover:bg-accent-hover hover:text-black font-heading font-bold text-xs tracking-tight transition-all cursor-pointer shadow-1"
          >
            Create Take in c/{tag.name}
          </button>
        </div>
      </div>

      {/* 2. Community Rules & Code of Conduct Card */}
      {rulesList.length > 0 && (
        <div className="rounded-xl border border-border bg-surface-raised p-4 sm:p-5 space-y-3 shadow-2">
          <div className="flex items-center gap-2 pb-2 border-b border-border/80">
            <ShieldAlert className="w-4 h-4 text-accent shrink-0" />
            <h3 className="font-heading font-black text-xs uppercase tracking-wider text-text m-0">
              Community Rules
            </h3>
          </div>

          <ol className="space-y-2 text-xs text-text-muted list-none p-0 m-0">
            {rulesList.map((rule, idx) => {
              // Strip existing "1.", "2." prefixes if any to unify display
              const cleanText = rule.replace(/^\d+[\.\)]\s*/, "");
              return (
                <li
                  key={idx}
                  className="flex items-start gap-2.5 p-2 rounded-md bg-surface-sunken border border-border/40"
                >
                  <span
                    className="font-mono text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                    style={{
                      backgroundColor: `${themeColor}25`,
                      color: themeColor,
                    }}
                  >
                    {idx + 1}
                  </span>
                  <span className="font-sans leading-snug text-text">
                    {cleanText}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* 3. Curator / Moderator Desk Card */}
      <div className="rounded-xl border border-border bg-surface-raised p-4 sm:p-5 space-y-3 shadow-2">
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/80">
          <div className="flex items-center gap-1.5">
            <Disc className="w-3.5 h-3.5 text-accent" />
            <h3 className="font-heading font-black text-xs uppercase tracking-wider text-text m-0">
              Scene Moderator
            </h3>
          </div>

          {isCreator && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="font-mono text-[10px] text-accent hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Settings className="w-2.5 h-2.5" />
              <span>Edit</span>
            </button>
          )}
        </div>

        {tag.creator_username ? (
          <Link
            to={`/profile/${tag.creator_username}`}
            className="flex items-center gap-3 p-2 rounded-lg bg-surface-sunken border border-border/60 hover:border-accent transition-colors group"
          >
            <div className="w-10 h-10 rounded-full overflow-hidden bg-surface-raised border border-white/10 shrink-0">
              {tag.creator_avatar_url ? (
                <img
                  src={resolveImageUrl(tag.creator_avatar_url)}
                  alt={tag.creator_username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-heading font-bold text-accent text-xs">
                  {tag.creator_username.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="font-heading font-bold text-xs text-text group-hover:text-accent truncate">
                @{tag.creator_username}
              </div>
              <div className="font-mono text-[9px] uppercase tracking-wider text-accent font-semibold">
                Founding Curator
              </div>
            </div>
          </Link>
        ) : (
          <p className="font-sans text-xs text-text-dim m-0">
            This scene is curated collectively by the community.
          </p>
        )}
      </div>
    </aside>
  );
}
