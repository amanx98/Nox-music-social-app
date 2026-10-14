import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import {
  Radio,
  RefreshCw,
  AlertCircle,
  Plus,
  ArrowLeft,
  Loader2,
  Clock,
  Flame,
  Music,
} from "lucide-react";
import { getTag, getThreads } from "../api/client";
import CommunityBannerWindow from "../components/community/CommunityBannerWindow";
import CommunityAboutCard from "../components/community/CommunityAboutCard";
import CommunitySettingsModal from "../components/community/CommunitySettingsModal";
import ThreadCard from "../components/feed/ThreadCard";
import ThreadView from "../ThreadView";
import ComposerModal from "../components/composer/ComposerModal";
import EditPostModal from "../components/composer/EditPostModal";
import { useToast } from "../components/Toast";

export default function CommunityPage({ user: propUser }) {
  const { tagName } = useParams();
  const navigate = useNavigate();
  const context = useOutletContext?.() || {};
  const user = propUser || context?.user;
  const contextOpenComposer = context?.onOpenComposer;
  const { addToast } = useToast();

  const [tag, setTag] = useState(null);
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortMode, setSortMode] = useState("latest"); // "latest" | "top" | "tracks"

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [editingThread, setEditingThread] = useState(null);

  const loadCommunityData = useCallback(async () => {
    if (!tagName) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Community details
      const tagData = await getTag(tagName);
      setTag(tagData);

      // 2. Fetch Threads in this community
      const threadsData = await getThreads(tagData.id);
      setThreads(Array.isArray(threadsData) ? threadsData : []);
    } catch (err) {
      setError(err.message || `Could not tune into frequency '${tagName}'.`);
    } finally {
      setLoading(false);
    }
  }, [tagName]);

  useEffect(() => {
    loadCommunityData();
  }, [loadCommunityData]);

  function handleThreadUpdated(updatedThread) {
    if (!updatedThread) return;
    setThreads((prev) =>
      prev.map((t) => (t.id === updatedThread.id ? { ...t, ...updatedThread } : t))
    );
    if (selectedThread && selectedThread.id === updatedThread.id) {
      setSelectedThread((prev) => ({ ...prev, ...updatedThread }));
    }
  }

  function handleTagUpdated(updatedTag) {
    if (!updatedTag) return;
    setTag(updatedTag);
  }

  function handleOpenComposer() {
    if (contextOpenComposer) {
      contextOpenComposer();
    } else {
      setIsComposerOpen(true);
    }
  }

  // Filter & sort threads
  const sortedThreads = [...threads].sort((a, b) => {
    if (sortMode === "top") {
      const aInteractions = (a.likes_count || 0) + (a.post_count || 0);
      const bInteractions = (b.likes_count || 0) + (b.post_count || 0);
      return bInteractions - aInteractions;
    }
    if (sortMode === "tracks") {
      const aIsTrack = a.title?.toLowerCase().includes("track") || a.body?.includes("[TRACK]");
      const bIsTrack = b.title?.toLowerCase().includes("track") || b.body?.includes("[TRACK]");
      if (aIsTrack && !bIsTrack) return -1;
      if (!aIsTrack && bIsTrack) return 1;
    }
    return new Date(b.created_at) - new Date(a.created_at);
  });

  // If viewing a single thread within community
  if (selectedThread) {
    return (
      <div className="w-full max-w-[960px] mx-auto py-2 text-left">
        <ThreadView
          thread={selectedThread}
          onBack={() => setSelectedThread(null)}
          user={user}
          onThreadUpdated={handleThreadUpdated}
        />
        <EditPostModal
          isOpen={Boolean(editingThread)}
          thread={editingThread}
          user={user}
          onClose={() => setEditingThread(null)}
          onSuccess={handleThreadUpdated}
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1240px] mx-auto space-y-6 text-left">
      {/* Back button & Breadcrumb */}
      <div className="flex items-center justify-between gap-3 pb-1 border-b border-border/60">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 font-mono text-xs text-text-dim hover:text-text transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to broadcast</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-text-dim">
            RADAR // c/{tagName}
          </span>
        </div>
      </div>

      {/* Loading State */}
      {loading && !tag && (
        <div className="py-24 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-3" />
          <p className="font-mono text-xs text-text-dim">
            Tuning into c/{tagName} transmission...
          </p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-6 rounded-xl border border-danger/40 bg-danger-muted/20 text-rose-200 text-xs flex flex-col items-center justify-center gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-danger" />
            <span className="font-heading font-bold text-sm">{error}</span>
          </div>
          <button
            type="button"
            onClick={loadCommunityData}
            className="h-8 px-4 rounded bg-surface border border-danger/50 text-rose-200 hover:text-text font-mono text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Connection</span>
          </button>
        </div>
      )}

      {/* Main Subreddit Community View */}
      {tag && (
        <>
          {/* 1. Reddit-Style Panoramic Banner & Header Window */}
          <CommunityBannerWindow
            tag={tag}
            user={user}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenComposer={handleOpenComposer}
            onTagUpdated={handleTagUpdated}
          />

          {/* 2. 12-Column Layout (8 cols threads feed / 4 cols About Community sidebar) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Main Community Dispatches (8 Cols) */}
            <div className="lg:col-span-8 space-y-4">
              {/* Feed Control Bar: Sort Tabs & Add Take */}
              <div className="flex items-center justify-between gap-3 p-2 rounded-lg bg-surface-raised border border-border">
                <div className="flex items-center gap-1">
                  {[
                    { id: "latest", label: "Latest", icon: Clock },
                    { id: "top", label: "Top Debates", icon: Flame },
                    { id: "tracks", label: "Tracks", icon: Music },
                  ].map((s) => {
                    const Icon = s.icon;
                    const active = sortMode === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSortMode(s.id)}
                        className={`h-7 px-3 rounded-md font-heading font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer ${
                          active
                            ? "bg-accent text-black shadow-1"
                            : "text-text-dim hover:text-text hover:bg-surface-sunken"
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                        <span>{s.label}</span>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={handleOpenComposer}
                  className="h-7 px-3 rounded-md bg-surface-sunken hover:bg-surface border border-border hover:border-accent font-heading font-bold text-xs text-text hover:text-accent transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>New Post</span>
                </button>
              </div>

              {/* Threads Feed Container */}
              <div className="rounded-xl border border-border bg-surface overflow-hidden divide-y divide-border shadow-1">
                {loading ? (
                  [1, 2, 3].map((i) => (
                    <div key={i} className="p-4 flex gap-3.5 animate-pulse" aria-busy="true">
                      <div className="w-12 h-12 rounded bg-surface-raised shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-surface-raised rounded w-1/4" />
                        <div className="h-4 bg-surface-raised rounded w-3/4" />
                      </div>
                    </div>
                  ))
                ) : sortedThreads.length === 0 ? (
                  <div className="p-10 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-surface-raised border border-border flex items-center justify-center mx-auto text-accent">
                      <Radio className="w-6 h-6 stroke-[1.5]" />
                    </div>
                    <div>
                      <h3 className="font-heading font-bold text-sm text-text uppercase">
                        No Dispatches in c/{tag.name} yet
                      </h3>
                      <p className="font-sans text-xs text-text-muted max-w-sm mx-auto mt-1">
                        Be the first crate-digger or tastemaker to start the debate in this circle.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenComposer}
                      className="h-8 px-4 rounded-md bg-accent text-black hover:bg-accent-hover font-heading font-bold text-xs tracking-tight transition-all cursor-pointer shadow-1"
                    >
                      Post First Take
                    </button>
                  </div>
                ) : (
                  sortedThreads.map((thread) => (
                    <ThreadCard
                      key={thread.id}
                      thread={thread}
                      onSelect={(t) => {
                        const target = t || thread;
                        if (target?.id) navigate(`/threads/${target.id}`);
                        else setSelectedThread(target);
                      }}
                      onSelectTag={(selected) => {
                        if (selected?.name) navigate(`/c/${encodeURIComponent(selected.name)}`);
                      }}
                      onEdit={(t) => setEditingThread(t || thread)}
                      currentUser={user}
                      onThreadUpdated={handleThreadUpdated}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Sidebar Column (4 Cols): Reddit-style About Scene Window */}
            <div className="lg:col-span-4">
              <CommunityAboutCard
                tag={tag}
                user={user}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onOpenComposer={handleOpenComposer}
              />
            </div>
          </div>
        </>
      )}

      {/* Creator Customization Modal */}
      {tag && (
        <CommunitySettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          tag={tag}
          user={user}
          onSuccess={handleTagUpdated}
        />
      )}

      {/* Global Post Composer pre-selected for this tag */}
      {user && tag && (
        <ComposerModal
          isOpen={isComposerOpen}
          onClose={() => setIsComposerOpen(false)}
          user={user}
          defaultTagId={tag.id}
          onSuccess={(newThread) => {
            setThreads((prev) => [newThread, ...prev]);
            setIsComposerOpen(false);
            addToast(`Dispatched to c/${tag.name}!`);
          }}
        />
      )}

      {/* Edit Post Modal */}
      <EditPostModal
        isOpen={Boolean(editingThread)}
        thread={editingThread}
        user={user}
        onClose={() => setEditingThread(null)}
        onSuccess={handleThreadUpdated}
      />
    </div>
  );
}
