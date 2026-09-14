import { useState, useEffect } from "react";
import { getThreads, createThread, createTag } from "./api/client";
import { useToast } from "./components/Toast";
import ThreadCard from "./components/feed/ThreadCard";
import Avatar from "./components/Avatar";
import { Button } from "./components/ui/Button";
import { Input } from "./components/ui/Input";

const FLAIRS = ["Discussion", "Hot Take", "Album Review", "Recommendation", "Question"];

export default function ThreadList({ tag, tags = [], onSelectTag, onSelectThread, user }) {
  const { addToast } = useToast();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Composer fields
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [selectedFlair, setSelectedFlair] = useState("Discussion");
  const [composerTagId, setComposerTagId] = useState(tag?.id || "");
  const [customTagName, setCustomTagName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadThreads();
  }, [tag]);

  useEffect(() => {
    if (tag) setComposerTagId(tag.id);
  }, [tag]);

  async function loadThreads() {
    setLoading(true);
    try {
      const data = await getThreads(tag ? tag.id : null);
      setThreads(data || []);
    } catch (err) {
      addToast(err.message || "Failed to load discussions");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateThread(e) {
    e.preventDefault();
    if (!title.trim() || submitting) return;

    let targetTagId = composerTagId || tag?.id;

    setSubmitting(true);
    try {
      // If user typed a custom tag that isn't in the list
      if (!targetTagId && customTagName.trim()) {
        const newTag = await createTag(customTagName.trim(), "genre");
        targetTagId = newTag.id;
      }

      if (!targetTagId) {
        // Default to first tag or fallback 1
        targetTagId = tags[0]?.id || 1;
      }

      const postBody = selectedFlair ? `[${selectedFlair}] ${body.trim()}` : body.trim();
      await createThread(targetTagId, title.trim(), postBody);

      setTitle("");
      setBody("");
      setCustomTagName("");
      setIsComposing(false);
      addToast("Discussion started!");
      loadThreads();
    } catch (err) {
      addToast(err.message || "Failed to post discussion");
    } finally {
      setSubmitting(false);
    }
  }

  // Filter threads by search query
  const filteredThreads = threads.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.title?.toLowerCase().includes(q) ||
      t.body?.toLowerCase().includes(q) ||
      t.author_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col gap-6 max-w-[840px] mx-auto w-full">
      {/* Community / Feed Banner */}
      <div className="bg-surface-raised border border-border rounded-md p-6 flex items-start justify-between gap-4 flex-wrap shadow-1">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <span className="text-3xl" aria-hidden="true">
              {tag ? (tag.type === "artist" ? "🎙️" : "🏷️") : "📻"}
            </span>
            <div>
              <h1 className="text-xl font-bold text-text m-0">
                {tag ? `#${tag.name}` : "Live Music Feed"}
              </h1>
              <p className="text-xs font-mono text-text-muted m-0">
                {tag
                  ? `${threads.length} topic${threads.length === 1 ? "" : "s"} &middot; Dedicated community for ${tag.name}`
                  : `${threads.length} total discussion${threads.length === 1 ? "" : "s"} across all vinyl & scrobble frequencies`}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsComposing((prev) => !prev)}
            aria-expanded={isComposing}
          >
            {isComposing ? "✕ Close" : "✎ Start Discussion"}
          </Button>
        </div>
      </div>

      {/* Real-time Filter & Search Bar */}
      <div className="flex items-center gap-3">
        <Input
          type="search"
          placeholder="Search discussions by keyword, album, or artist..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1"
        />
        {tag && (
          <Button
            variant="outline"
            size="md"
            onClick={() => onSelectTag(null)}
            title="Clear filter to view all discussions"
          >
            ✕ Clear #{tag.name}
          </Button>
        )}
      </div>

      {/* Expandable Discussion Composer Surface */}
      {isComposing && (
        <form
          onSubmit={handleCreateThread}
          className="bg-surface-raised border border-accent/40 rounded-md p-6 flex flex-col gap-4 shadow-3 animate-in fade-in duration-200"
        >
          <div className="flex items-center gap-3 pb-3 border-b border-border">
            <Avatar username={user?.username || "me"} size={36} />
            <div className="text-sm font-semibold text-text">
              Create Discussion as <span className="text-accent">@{user?.username || "you"}</span>
            </div>
          </div>

          {/* Title Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-mono text-text-muted uppercase tracking-wider">
              Discussion Topic / Headline
            </label>
            <Input
              type="text"
              placeholder="e.g. Is OK Computer the defining record of the late 90s?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="text-base font-semibold"
            />
          </div>

          {/* Flair & Tag Selection */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-mono text-text-muted uppercase tracking-wider">
              Category Flair
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {FLAIRS.map((flair) => (
                <button
                  key={flair}
                  type="button"
                  onClick={() => setSelectedFlair(selectedFlair === flair ? "" : flair)}
                  className={`min-h-[32px] px-3 rounded-full text-xs font-mono transition-colors border cursor-pointer ${
                    selectedFlair === flair
                      ? "bg-accent text-accent-text font-semibold border-accent"
                      : "bg-surface-sunken text-text-muted border-border hover:text-text"
                  }`}
                >
                  #{flair}
                </button>
              ))}
            </div>
          </div>

          {/* Topic / Tag Assignment if on All Frequencies */}
          {!tag && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono text-text-muted uppercase tracking-wider">
                Community Tag
              </label>
              <select
                value={composerTagId}
                onChange={(e) => setComposerTagId(e.target.value)}
                className="bg-surface-sunken border border-border rounded-md px-3 py-2 text-sm text-text outline-none focus-visible:border-accent"
              >
                <option value="">Select a community tag...</option>
                {tags.map((t) => (
                  <option key={t.id} value={t.id}>
                    #{t.name} ({t.type})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Body Textarea */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-mono text-text-muted uppercase tracking-wider">
              Discussion Content
            </label>
            <textarea
              placeholder="Share your thoughts, favorite song moments, production details, or vinyl impressions..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className="bg-surface-sunken border border-border rounded-md p-3 text-sm text-text outline-none focus-visible:border-accent resize-y min-h-[100px]"
            />
          </div>

          {/* Submit Row */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-2xs font-mono text-text-dim">
              Press Enter or click publish to broadcast
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsComposing(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={submitting || !title.trim()}
              >
                {submitting ? "Publishing..." : "Publish Topic →"}
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* Thread Stream */}
      {loading ? (
        /* Skeleton Loading Cards Matched to Content Shape */
        <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading discussions">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-surface-raised border border-border rounded-md p-5 flex flex-col gap-3 animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-surface-sunken" />
                <div className="flex flex-col gap-1.5 flex-1">
                  <div className="w-28 h-3.5 bg-surface-sunken rounded-xs" />
                  <div className="w-20 h-2.5 bg-surface-sunken rounded-xs" />
                </div>
              </div>
              <div className="w-3/4 h-5 bg-surface-sunken rounded-xs" />
              <div className="w-full h-12 bg-surface-sunken rounded-xs" />
            </div>
          ))}
        </div>
      ) : filteredThreads.length === 0 ? (
        /* Empty State with CTA */
        <div className="bg-surface-raised border border-border rounded-md p-12 text-center flex flex-col items-center gap-3 shadow-1">
          <span className="text-4xl" aria-hidden="true">📻</span>
          <h2 className="text-lg font-semibold text-text m-0">
            {searchQuery ? "No matching discussions found" : "No discussions recorded yet"}
          </h2>
          <p className="text-sm text-text-muted max-w-[45ch] m-0">
            {searchQuery
              ? `We couldn't find any threads matching "${searchQuery}". Try searching another keyword or clear the search.`
              : `Be the first music obsessive to drop a needle in ${tag ? `#${tag.name}` : "this feed"} and spark a conversation.`}
          </p>
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsComposing(true)}
            className="mt-2"
          >
            Start the First Discussion
          </Button>
        </div>
      ) : (
        /* Thread Card List */
        <div className="flex flex-col gap-4">
          {filteredThreads.map((thread) => {
            // Match thread tag if present
            const threadTag = tags.find((t) => t.id === thread.tag_id) || tag;

            return (
              <ThreadCard
                key={thread.id}
                thread={thread}
                tag={threadTag}
                onSelect={() => onSelectThread(thread)}
                onSelectTag={onSelectTag}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}