import { useState, useEffect } from "react";
import { Plus, X, Search, MessageSquare, Mic, Hash, Radio } from "lucide-react";
import { getThreads, createThread, getTags } from "./api/client";
import { useToast } from "./components/Toast";
import ThreadCard from "./components/feed/ThreadCard";
import Avatar from "./components/Avatar";
import { Button } from "./components/ui/Button";
import { Input } from "./components/ui/Input";

const FLAIRS = [
  { id: "discussion", label: "Discussion" },
  { id: "review", label: "Review" },
  { id: "quilt", label: "Quilt" },
  { id: "recommendation", label: "Recs" },
];

export default function ThreadList({ tag, onSelectThread, onSelectTag, user }) {
  const { addToast } = useToast();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isComposing, setIsComposing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Composer Form state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [selectedTagId, setSelectedTagId] = useState(tag?.id || "");
  const [selectedFlair, setSelectedFlair] = useState("discussion");
  const [availableTags, setAvailableTags] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadThreads();
    if (!tag) {
      getTags()
        .then((tags) => setAvailableTags(tags || []))
        .catch(() => setAvailableTags([]));
    }
  }, [tag]);

  async function loadThreads() {
    setLoading(true);
    try {
      const data = await getThreads(tag ? tag.id : null);
      setThreads(Array.isArray(data) ? data : []);
    } catch {
      setThreads([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateThread(e) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      addToast("Title and content are required", "error");
      return;
    }

    const tagIdToUse = tag?.id || selectedTagId || (availableTags[0]?.id ?? 1);
    const formattedBody = selectedFlair ? `[${selectedFlair.toUpperCase()}] ${body.trim()}` : body.trim();

    setSubmitting(true);
    try {
      await createThread(tagIdToUse, title.trim(), formattedBody);
      setTitle("");
      setBody("");
      setIsComposing(false);
      addToast("Post published");
      await loadThreads();
    } catch (err) {
      addToast(err.message || "Failed to publish post", "error");
    } finally {
      setSubmitting(false);
    }
  }

  // Filter threads by search query
  const filteredThreads = threads.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchesTitle = t.title?.toLowerCase().includes(q);
    const matchesBody = t.body?.toLowerCase().includes(q);
    const matchesAuthor = (t.author_name || t.username || "").toLowerCase().includes(q);
    return matchesTitle || matchesBody || matchesAuthor;
  });

  return (
    <div className="flex flex-col gap-4 max-w-[760px] mx-auto w-full">
      {/* Top Feed Bar: Clean Header & Actions */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-surface-raised border border-border flex items-center justify-center text-text">
            {tag ? (
              tag.type === "artist" ? <Mic className="w-4 h-4 text-accent" /> : <Hash className="w-4 h-4 text-secondary" />
            ) : (
              <Radio className="w-4 h-4 text-accent" />
            )}
          </div>
          <div>
            <h1 className="font-heading font-bold text-lg text-text leading-none">
              {tag ? `#${tag.name}` : "Feed"}
            </h1>
            <p className="font-mono text-2xs text-text-dim mt-1">
              {threads.length} {threads.length === 1 ? "post" : "posts"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {tag && (
            <button
              type="button"
              onClick={() => onSelectTag(null)}
              className="inline-flex items-center gap-1 font-mono text-xs text-text-muted hover:text-text px-2.5 py-1 rounded-md border border-border hover:bg-surface-raised transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear filter</span>
            </button>
          )}

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsComposing((prev) => !prev)}
            aria-expanded={isComposing}
          >
            {isComposing ? (
              <>
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>New Post</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Expandable Inline Post Composer */}
      {isComposing && (
        <form
          onSubmit={handleCreateThread}
          className="rounded-xl border border-accent/40 bg-surface-raised p-4 flex flex-col gap-3 shadow-3 animate-slide-up"
        >
          <div className="flex items-center gap-2.5 pb-2.5 border-b border-border">
            <Avatar username={user?.username || "me"} size={32} />
            <span className="font-mono text-xs text-text-muted">
              Posting as <span className="text-accent font-medium">@{user?.username || "you"}</span>
            </span>
          </div>

          <Input
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={submitting}
            required
            className="font-heading text-base font-bold bg-surface"
          />

          <textarea
            placeholder="What's on your mind? Share thoughts, reviews, or tracks..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={submitting}
            required
            rows={3}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-dim outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors resize-y min-h-[80px]"
          />

          {/* Tag & Flair Selectors */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
            <div className="flex items-center gap-2 flex-wrap">
              {!tag && availableTags.length > 0 && (
                <select
                  value={selectedTagId}
                  onChange={(e) => setSelectedTagId(Number(e.target.value))}
                  className="px-2.5 py-1 rounded-md bg-surface border border-border font-mono text-2xs text-text focus:outline-none focus:border-accent"
                >
                  {availableTags.map((t) => (
                    <option key={t.id} value={t.id}>
                      #{t.name}
                    </option>
                  ))}
                </select>
              )}

              <div className="flex items-center gap-1">
                {FLAIRS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedFlair(f.id)}
                    className={`font-mono text-2xs px-2 py-0.5 rounded transition-colors ${
                      selectedFlair === f.id
                        ? "bg-accent text-surface font-semibold"
                        : "bg-surface text-text-muted hover:text-text border border-border"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsComposing(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={submitting}>
                {submitting ? "Publishing..." : "Publish"}
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
        <Input
          type="search"
          placeholder="Search posts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-surface text-xs h-9"
        />
      </div>

      {/* Unified Feed Stream */}
      <div className="rounded-xl border border-border/80 bg-surface overflow-hidden divide-y divide-border/60 shadow-1">
        {loading ? (
          // Content-matched loading skeleton
          [1, 2, 3, 4].map((n) => (
            <div key={n} className="px-4 py-3.5 flex gap-3 animate-pulse" aria-busy="true">
              <div className="w-9 h-9 rounded-full bg-border flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-border rounded w-1/4" />
                <div className="h-4 bg-border rounded w-3/4" />
                <div className="h-3 bg-border rounded w-1/2" />
              </div>
            </div>
          ))
        ) : filteredThreads.length === 0 ? (
          // Clean empty state
          <div className="px-6 py-12 text-center flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-surface-raised border border-border flex items-center justify-center text-text-dim mb-3">
              <MessageSquare className="w-5 h-5 stroke-[1.75]" />
            </div>
            <h3 className="font-heading font-bold text-base text-text">
              {searchQuery ? "No matching posts" : "No posts yet"}
            </h3>
            <p className="font-sans text-xs text-text-muted max-w-xs mt-1">
              {searchQuery
                ? "Try searching for a different keyword or artist tag."
                : "Be the first to start a conversation in this feed."}
            </p>
            {!searchQuery && (
              <Button
                variant="primary"
                size="sm"
                className="mt-4"
                onClick={() => setIsComposing(true)}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create post</span>
              </Button>
            )}
          </div>
        ) : (
          filteredThreads.map((thread) => (
            <ThreadCard
              key={thread.id}
              thread={thread}
              tag={tag}
              onSelect={() => onSelectThread(thread)}
              onSelectTag={onSelectTag}
            />
          ))
        )}
      </div>
    </div>
  );
}