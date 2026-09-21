import { useState, useEffect } from "react";
import { ArrowLeft, Send, Heart, MessageSquare } from "lucide-react";
import { getPosts, createPost } from "./api/client";
import { useToast } from "./components/Toast";
import Avatar from "./components/Avatar";
import SocialActions from "./components/SocialActions";
import { Button } from "./components/ui/Button";

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

export default function ThreadView({ thread, onBack, user }) {
  const { addToast } = useToast();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadPosts();
  }, [thread]);

  async function loadPosts() {
    setLoading(true);
    try {
      const data = await getPosts(thread.id);
      setPosts(data || []);
    } catch (err) {
      addToast(err.message || "Failed to load replies", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleReply(e) {
    e.preventDefault();
    if (!reply.trim() || submitting) return;

    setSubmitting(true);
    try {
      await createPost(thread.id, reply.trim());
      setReply("");
      addToast("Reply posted");
      loadPosts();
    } catch (err) {
      addToast(err.message || "Failed to post reply", "error");
    } finally {
      setSubmitting(false);
    }
  }

  function handleKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      handleReply(e);
    }
  }

  const threadAuthor = thread.author_name || thread.username || `listener_${thread.user_id}`;
  const authorHandle = threadAuthor.toLowerCase().replace(/\s+/g, "_");

  return (
    <div className="max-w-[760px] mx-auto w-full space-y-4">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 font-mono text-xs text-text-muted hover:text-text py-1 transition-colors cursor-pointer group"
      >
        <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
        <span>Back to feed</span>
      </button>

      {/* Main Post Card */}
      <article className="rounded-xl border border-border bg-surface p-5 shadow-1 text-left space-y-3">
        {/* Author Line */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Avatar username={threadAuthor} src={thread.author_avatar_url || thread.avatar_url} size={42} />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-sans font-semibold text-sm text-text">{threadAuthor}</span>
                <span className="font-mono text-2xs uppercase tracking-wider px-1.5 py-0.2 rounded bg-accent/15 text-accent border border-accent/30 font-semibold">
                  OP
                </span>
              </div>
              <div className="flex items-baseline gap-1 text-xs text-text-dim font-mono">
                <span>@{authorHandle}</span>
                <span>&middot;</span>
                <span>{formatTimeAgo(thread.created_at)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Title & Body */}
        <div className="space-y-2 pt-1">
          <h1 className="font-heading font-black text-xl sm:text-2xl text-text leading-tight tracking-tight">
            {thread.title}
          </h1>
          <p className="font-sans text-sm sm:text-base text-text/90 leading-relaxed whitespace-pre-line">
            {thread.body}
          </p>
        </div>

        {/* Action Bar */}
        <div className="pt-3 border-t border-border/60">
          <SocialActions
            id={thread.id}
            type="thread_detail"
            replyCount={posts.length}
            initialLikes={8}
            initialReposts={3}
          />
        </div>
      </article>

      {/* Reply Composer Card */}
      <form
        onSubmit={handleReply}
        className="rounded-xl border border-border bg-surface-raised p-4 flex gap-3 shadow-1"
      >
        <div className="pt-1 flex-shrink-0">
          <Avatar username={user?.username || "me"} src={user?.avatar_url} size={34} />
        </div>
        <div className="flex-1 space-y-2">
          <textarea
            placeholder="Post your reply..."
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={submitting}
            rows={2}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-dim outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="font-mono text-2xs text-text-dim">
              Press <kbd className="px-1 py-0.5 rounded bg-surface-sunken border border-border">Ctrl+Enter</kbd> to send
            </span>
            <Button type="submit" variant="primary" size="sm" disabled={submitting || !reply.trim()}>
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? "Replying..." : "Reply"}</span>
            </Button>
          </div>
        </div>
      </form>

      {/* Replies Stream */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-heading font-bold text-sm text-text flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-text-dim" />
            <span>Replies ({posts.length})</span>
          </h2>
        </div>

        {loading ? (
          <div className="rounded-xl border border-border bg-surface p-6 text-center text-text-muted font-mono text-xs animate-pulse">
            Loading replies...
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-xl border border-border/80 bg-surface p-8 text-center">
            <p className="font-sans text-xs text-text-muted">No replies yet. Be the first to join the conversation.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border/80 bg-surface overflow-hidden divide-y divide-border/60">
            {posts.map((post) => {
              const replyAuthor = post.username || `user_${post.user_id}`;
              const isOP = post.user_id === thread.user_id;

              return (
                <div key={post.id} className="p-3.5 flex gap-3 text-left hover:bg-surface-raised/30 transition-colors">
                  <div className="flex-shrink-0 pt-0.5">
                    <Avatar username={replyAuthor} src={post.author_avatar_url || post.avatar_url} size={32} />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className="font-sans font-semibold text-xs text-text">{replyAuthor}</span>
                      <span className="font-mono text-2xs text-text-dim">@{replyAuthor.toLowerCase()}</span>
                      {isOP && (
                        <span className="font-mono text-[9px] uppercase px-1 py-0.2 rounded bg-accent/15 text-accent border border-accent/25">
                          OP
                        </span>
                      )}
                      <span className="text-text-dim text-xs">&middot;</span>
                      <span className="font-mono text-2xs text-text-dim">{formatTimeAgo(post.created_at)}</span>
                    </div>

                    <p className="font-sans text-xs sm:text-sm text-text/90 leading-relaxed whitespace-pre-line m-0">
                      {post.body}
                    </p>

                    <div className="pt-1">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-2xs font-mono text-text-dim hover:text-rose-400 transition-colors cursor-pointer"
                        onClick={() => addToast("Liked reply")}
                      >
                        <Heart className="w-3 h-3" />
                        <span>Like</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}