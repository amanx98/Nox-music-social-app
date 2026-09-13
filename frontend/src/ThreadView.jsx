import { useState, useEffect } from "react";
import { getPosts, createPost } from "./api/client";
import { useToast } from "./components/Toast";
import Avatar from "./components/Avatar";
import SocialActions from "./components/SocialActions";

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
      addToast(err.message || "Failed to load replies");
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
      addToast("Reply posted!");
      loadPosts();
    } catch (err) {
      addToast(err.message || "Failed to post reply");
    } finally {
      setSubmitting(false);
    }
  }

  function handleKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      handleReply(e);
    }
  }

  const threadAuthor = `listener_${thread.user_id}`;

  return (
    <div style={{ maxWidth: "800px" }}>
      {/* Back Link */}
      <button
        onClick={onBack}
        className="btn-ghost"
        style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "20px", fontSize: "13px" }}
      >
        <span>←</span>
        <span>Back to Discussions</span>
      </button>

      {/* Main Original Post Card */}
      <div className="social-card" style={{ padding: "24px", marginBottom: "28px", border: "1px solid var(--border-strong)" }}>
        {/* Post Author Header */}
        <div className="social-header" style={{ marginBottom: "16px" }}>
          <div className="social-author">
            <Avatar username={threadAuthor} size={46} />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="author-name" style={{ fontSize: "16px" }}>Listener #{thread.user_id}</span>
                <span className="author-handle">@{threadAuthor}</span>
                <span className="badge badge-mustard" style={{ fontSize: "10px" }}>OP</span>
              </div>
              <div className="meta" style={{ fontSize: "12px", marginTop: "2px" }}>
                {formatTimeAgo(thread.created_at)} &middot; Original Post
              </div>
            </div>
          </div>
        </div>

        {/* Title and Body */}
        <h1 className="post-title" style={{ fontSize: "26px", lineHeight: "1.25", marginBottom: "14px" }}>
          {thread.title}
        </h1>

        <div className="post-body" style={{ fontSize: "15.5px", color: "var(--cream-text)" }}>
          {thread.body}
        </div>

        {/* Social Action Bar */}
        <div style={{ marginTop: "20px" }}>
          <SocialActions
            id={thread.id}
            type="thread_detail"
            replyCount={posts.length}
            initialLikes={8}
            initialReposts={3}
          />
        </div>
      </div>

      {/* Replies Conversation Stream */}
      <div style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
          <h3 style={{ margin: 0, fontSize: "17px" }}>
            Discussion ({posts.length})
          </h3>
          <span className="meta">Threaded Conversation</span>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "30px" }}>
            <span className="spin" style={{ display: "inline-block", fontSize: "22px" }}>💿</span>
            <p className="meta" style={{ marginTop: "6px" }}>Loading replies...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "32px 20px", marginBottom: "24px" }}>
            <p className="meta" style={{ margin: 0 }}>
              No replies yet. Join the conversation below!
            </p>
          </div>
        ) : (
          <div className="thread-conversation">
            {posts.map((post, index) => {
              const replyAuthor = `user_${post.user_id}`;
              const isOP = post.user_id === thread.user_id;

              return (
                <div key={post.id} className="reply-tree-item">
                  {/* Visual tree connector line */}
                  <div className="reply-tree-line" />

                  <div className="reply-card">
                    {/* Reply Author */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <Avatar username={replyAuthor} size={30} />
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ fontWeight: 600, fontSize: "13.5px" }}>Listener #{post.user_id}</span>
                            <span className="meta" style={{ fontSize: "11px" }}>@{replyAuthor}</span>
                            {isOP && <span className="badge badge-mustard" style={{ fontSize: "9px", padding: "1px 5px" }}>OP</span>}
                          </div>
                        </div>
                      </div>
                      <span className="meta" style={{ fontSize: "11px" }}>{formatTimeAgo(post.created_at)}</span>
                    </div>

                    {/* Reply Content */}
                    <p style={{ margin: "0 0 10px", color: "var(--cream-text)", fontSize: "14px", lineHeight: "1.5" }}>
                      {post.body}
                    </p>

                    {/* Micro action bar */}
                    <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
                      <button
                        className="social-action-btn"
                        style={{ padding: "2px 4px", fontSize: "11px" }}
                        onClick={() => addToast("Liked reply!")}
                      >
                        <span>🤍</span>
                        <span>{(index * 2 + 1) % 5}</span>
                      </button>
                      <button
                        className="social-action-btn"
                        style={{ padding: "2px 4px", fontSize: "11px" }}
                        onClick={() => setReply(`@${replyAuthor} `)}
                      >
                        <span>↩ Reply</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rich Reply Composer Box */}
      <form
        onSubmit={handleReply}
        className="card"
        style={{
          padding: "20px",
          border: "1px solid var(--border-strong)",
          background: "var(--bg-raised)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "12px" }}>
          <Avatar username={user?.username || "me"} size={32} />
          <span style={{ fontWeight: 600, fontSize: "13px", color: "var(--cream-text)" }}>
            Replying as <span style={{ color: "var(--mustard)" }}>@{user?.username || "you"}</span>
          </span>
        </div>

        <textarea
          placeholder="Add to the discussion... What did you think? (Press Ctrl+Enter to post)"
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{ minHeight: "90px", marginBottom: "12px" }}
          required
        />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="meta" style={{ fontSize: "11px" }}>
            Press <kbd style={{ background: "var(--bg-card)", padding: "2px 5px", borderRadius: "3px" }}>Ctrl</kbd> + <kbd style={{ background: "var(--bg-card)", padding: "2px 5px", borderRadius: "3px" }}>Enter</kbd> to post
          </span>
          <button type="submit" className="btn-primary" disabled={submitting || !reply.trim()}>
            {submitting ? "Posting..." : "Post Reply →"}
          </button>
        </div>
      </form>
    </div>
  );
}