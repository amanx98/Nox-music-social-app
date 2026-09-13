import { useState, useEffect } from "react";
import { getThreads, createThread } from "./api/client";
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

export default function ThreadList({ tag, onSelectThread, onBack, user }) {
  const { addToast } = useToast();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [selectedFlair, setSelectedFlair] = useState("");

  const FLAIRS = ["Discussion", "Hot Take", "Album Review", "Recommendation", "Question"];

  useEffect(() => {
    loadThreads();
  }, [tag]);

  async function loadThreads() {
    setLoading(true);
    try {
      const data = await getThreads(tag.id);
      setThreads(data || []);
    } catch (err) {
      addToast(err.message || "Failed to load discussions");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateThread(e) {
    e.preventDefault();
    if (!title.trim()) return;

    const postBody = selectedFlair ? `[${selectedFlair}] ${body.trim()}` : body.trim();

    try {
      await createThread(tag.id, title, postBody);
      setTitle("");
      setBody("");
      setSelectedFlair("");
      setIsComposing(false);
      addToast("Discussion started!");
      loadThreads();
    } catch (err) {
      addToast(err.message || "Failed to post discussion");
    }
  }

  return (
    <div>
      {/* Navigation Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
        <button
          onClick={onBack}
          className="btn-ghost"
          style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}
        >
          <span>←</span>
          <span>Back to Communities</span>
        </button>
      </div>

      {/* Community Banner Card */}
      <div className="card" style={{ marginBottom: "24px", background: "linear-gradient(135deg, #24201a 0%, #1a1713 100%)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "14px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
              <span style={{ fontSize: "28px" }}>
                {tag.type === "artist" ? "🎙️" : tag.type === "genre" ? "🎸" : "💬"}
              </span>
              <h1 style={{ margin: 0, fontSize: "30px" }}>{tag.name}</h1>
              <span className={`badge ${tag.type === "artist" ? "badge-mustard" : "badge-teal"}`}>
                {tag.type}
              </span>
            </div>
            <p className="meta" style={{ margin: 0 }}>
              {threads.length} active discussion{threads.length === 1 ? "" : "s"} &middot; Share your thoughts on {tag.name}
            </p>
          </div>

          <button
            onClick={() => setIsComposing(!isComposing)}
            className="btn-primary"
            style={{ padding: "8px 16px" }}
          >
            {isComposing ? "✕ Close Composer" : "✎ Start Discussion"}
          </button>
        </div>
      </div>

      {/* Expandable Composer Card */}
      {isComposing && (
        <form
          onSubmit={handleCreateThread}
          className="social-card"
          style={{
            marginBottom: "24px",
            border: "1px solid var(--mustard)",
            boxShadow: "0 0 16px rgba(217, 164, 65, 0.15)",
          }}
        >
          <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "14px" }}>
            <Avatar username={user?.username || "me"} size={36} />
            <div style={{ fontWeight: 600, fontSize: "14px" }}>
              Post to #{tag.name} as <span style={{ color: "var(--mustard)" }}>@{user?.username || "you"}</span>
            </div>
          </div>

          {/* Post Title */}
          <input
            type="text"
            placeholder="Title / Topic (e.g. Is this their best record to date?)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ marginBottom: "12px", width: "100%", fontSize: "15px", fontWeight: 600 }}
            required
          />

          {/* Flair selection */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" }}>
            {FLAIRS.map((flair) => (
              <button
                key={flair}
                type="button"
                className={`badge ${selectedFlair === flair ? "badge-mustard" : ""}`}
                style={{ cursor: "pointer", background: selectedFlair === flair ? "var(--mustard-dim)" : "var(--bg-subtle)" }}
                onClick={() => setSelectedFlair(selectedFlair === flair ? "" : flair)}
              >
                #{flair}
              </button>
            ))}
          </div>

          {/* Post Body */}
          <textarea
            placeholder="Write your analysis, hot takes, favorite track moments, or questions..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            style={{ marginBottom: "16px", minHeight: "110px" }}
          />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="meta" style={{ fontSize: "11px" }}>Tip: Markdown supported</span>
            <div style={{ display: "flex", gap: "8px" }}>
              <button type="button" className="btn-ghost" onClick={() => setIsComposing(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Publish Discussion →
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Thread Stream */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <span className="spin" style={{ display: "inline-block", fontSize: "28px" }}>💿</span>
          <p className="meta" style={{ marginTop: "8px" }}>Loading conversations...</p>
        </div>
      ) : threads.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "48px 20px" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>💬</div>
          <h3 style={{ margin: 0, marginBottom: "6px" }}>No discussions yet in #{tag.name}</h3>
          <p className="meta" style={{ marginBottom: "18px" }}>
            Be the first listener to kick off the conversation!
          </p>
          <button onClick={() => setIsComposing(true)} className="btn-primary">
            + Start the First Discussion
          </button>
        </div>
      ) : (
        <div>
          {threads.map((thread) => {
            const authorUsername = `listener_${thread.user_id}`;

            return (
              <article
                key={thread.id}
                className="social-card social-card-interactive"
                onClick={() => onSelectThread(thread)}
              >
                {/* Author & Header */}
                <div className="social-header">
                  <div className="social-author">
                    <Avatar username={authorUsername} size={38} />
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span className="author-name">Listener #{thread.user_id}</span>
                        <span className="author-handle">@{authorUsername}</span>
                      </div>
                      <div className="meta" style={{ fontSize: "11px" }}>
                        {formatTimeAgo(thread.created_at)} &middot; in <span style={{ color: "var(--mustard)" }}>#{tag.name}</span>
                      </div>
                    </div>
                  </div>

                  <span className="badge badge-teal">💬 Thread</span>
                </div>

                {/* Content */}
                <h2 className="post-title" style={{ fontSize: "20px" }}>
                  {thread.title}
                </h2>
                {thread.body && (
                  <p className="post-body">
                    {thread.body}
                  </p>
                )}

                {/* Interactive Social Media Buttons */}
                <SocialActions
                  id={thread.id}
                  type="thread"
                  replyCount={thread.reply_count || 0}
                  onReplyClick={(e) => {
                    e?.stopPropagation();
                    onSelectThread(thread);
                  }}
                  initialLikes={(thread.id * 3 + 2) % 15}
                  initialReposts={(thread.id * 2) % 6}
                />
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}