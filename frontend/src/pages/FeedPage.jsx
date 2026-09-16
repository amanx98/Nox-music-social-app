import { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { Plus, Radio, RefreshCw, AlertCircle, X } from "lucide-react";
import { getThreads } from "../api/client";
import FeaturedDiscussion from "../components/feed/FeaturedDiscussion";
import ThreadCard from "../components/feed/ThreadCard";
import DiscoveryRail from "../components/feed/DiscoveryRail";
import TopsterSpotlight from "../components/feed/TopsterSpotlight";
import ThreadView from "../ThreadView";
import ComposerModal from "../components/composer/ComposerModal";

export default function FeedPage({ user: propUser }) {
  const context = useOutletContext?.() || {};
  const user = propUser || context?.user;
  const contextOpenComposer = context?.onOpenComposer;

  const [threads, setThreads] = useState([]);
  const [selectedTag, setSelectedTag] = useState(null);
  const [selectedThread, setSelectedThread] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Local Composer Modal state
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  const loadFeedData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const threadsData = await getThreads(selectedTag?.id || null);
      setThreads(Array.isArray(threadsData) ? threadsData : []);
    } catch (err) {
      setError(err.message || "Could not retrieve transmission feed. Check station connection.");
    } finally {
      setLoading(false);
    }
  }, [selectedTag]);

  useEffect(() => {
    loadFeedData();
  }, [loadFeedData]);

  // If a thread is selected, render ThreadView
  if (selectedThread) {
    return (
      <div className="w-full max-w-[960px] mx-auto py-2">
        <ThreadView
          thread={selectedThread}
          onBack={() => setSelectedThread(null)}
          user={user}
        />
      </div>
    );
  }

  // Designate featured thread: first thread in list or default editorial feature
  const featuredThread = threads.length > 0 ? threads[0] : null;
  // Remaining threads form the community stream (or all threads if tag selected)
  const circleThreads = threads.length > 1 ? threads.slice(1) : threads;

  function handleOpenComposer() {
    if (contextOpenComposer) {
      contextOpenComposer();
    } else {
      setIsComposerOpen(true);
    }
  }

  return (
    <div className="w-full max-w-[1440px] mx-auto space-y-6 text-left">
      {/* Editorial Page Heading */}
      <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4 border-b border-border">
        <div>
          {/* Micro broadcast label */}
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="font-mono text-[10px] font-bold tracking-widest text-accent uppercase">
              BROADCAST 027 // CONTROL DESK
            </span>
          </div>

          {/* Single H1 on Page */}
          <h1 className="font-heading font-black text-2xl sm:text-3xl lg:text-4xl text-text tracking-tight uppercase leading-none m-0">
            THE LIVE WIRE
          </h1>
        </div>

        {/* Restrained Supporting Copy Aligned Opposite on Wide Screens */}
        <p className="font-sans text-xs sm:text-sm text-text-dim max-w-sm sm:text-right m-0 leading-snug">
          The records, arguments, and scenes moving after dark.
        </p>
      </section>

      {/* 12-Column Desktop Editorial Grid (8 columns main feed / 4 columns discovery rail) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Feed Column (8 Cols on Desktop) */}
        <div className="lg:col-span-8 space-y-6">
          {/* 4. Featured Discussion (Dominant content block roughly 2/3 desktop width) */}
          <FeaturedDiscussion
            thread={featuredThread}
            onSelectThread={(t) => setSelectedThread(t || featuredThread)}
            onSelectTag={setSelectedTag}
          />

          {/* 5. Community Feed Section */}
          <section aria-labelledby="community-feed-heading" className="space-y-3">
            {/* Section Bar: "FROM YOUR CIRCLES" & "ADD YOUR TAKE" action */}
            <div className="flex items-center justify-between gap-3 pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <h2
                  id="community-feed-heading"
                  className="font-heading font-black text-sm uppercase tracking-wider text-text m-0"
                >
                  FROM YOUR CIRCLES
                </h2>
                {selectedTag && (
                  <span className="font-mono text-2xs text-accent px-1.5 py-0.2 rounded bg-surface-raised border border-accent/30">
                    #{selectedTag.name}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {selectedTag && (
                  <button
                    type="button"
                    onClick={() => setSelectedTag(null)}
                    className="inline-flex items-center gap-1 font-mono text-[11px] text-text-dim hover:text-text px-2 py-0.5 rounded border border-border hover:bg-surface-raised transition-colors cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                    <span>Clear filter</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleOpenComposer}
                  className="inline-flex items-center gap-1 h-7 px-3 rounded-md bg-accent text-[#0A0B0A] hover:bg-accent-hover font-heading font-bold text-xs tracking-tight transition-all active:translate-y-px cursor-pointer shadow-1"
                >
                  <Plus className="w-3 h-3 stroke-[2.5]" />
                  <span>ADD YOUR TAKE</span>
                </button>
              </div>
            </div>

            {/* Error State with Retry Button */}
            {error && (
              <div className="p-4 rounded-md border border-danger/40 bg-danger-muted/20 text-rose-200 text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-danger shrink-0" />
                  <span>{error}</span>
                </div>
                <button
                  type="button"
                  onClick={loadFeedData}
                  className="h-7 px-2.5 rounded bg-surface border border-danger/50 text-rose-200 hover:text-text font-mono text-xs flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Retry</span>
                </button>
              </div>
            )}

            {/* Content Feed List */}
            <div className="rounded-md border border-border bg-surface overflow-hidden divide-y divide-border shadow-1">
              {loading ? (
                // Polished Loading Skeleton
                [1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-4 flex gap-3.5 animate-pulse" aria-busy="true">
                    <div className="w-12 h-12 rounded bg-surface-raised shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-surface-raised rounded w-1/4" />
                      <div className="h-4 bg-surface-raised rounded w-3/4" />
                      <div className="h-3 bg-surface-raised rounded w-1/2" />
                    </div>
                  </div>
                ))
              ) : circleThreads.length === 0 ? (
                // Empty State
                <div className="p-10 text-center flex flex-col items-center justify-center">
                  <div className="w-10 h-10 rounded-md bg-surface-raised border border-border flex items-center justify-center text-text-dim mb-3">
                    <Radio className="w-5 h-5 stroke-[1.75]" />
                  </div>
                  <h3 className="font-heading font-bold text-sm text-text mb-1">
                    No community transmissions yet
                  </h3>
                  <p className="font-sans text-xs text-text-muted max-w-xs mb-4">
                    {selectedTag
                      ? `No takes published under #${selectedTag.name} yet. Be the first to drop the needle.`
                      : "The feed is quiet. Start the night's discussion and transmit your take."}
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenComposer}
                    className="h-8 px-4 rounded-md bg-accent text-[#0A0B0A] hover:bg-accent-hover font-heading font-bold text-xs transition-all active:translate-y-px cursor-pointer"
                  >
                    Transmit First Take
                  </button>
                </div>
              ) : (
                circleThreads.map((t) => (
                  <ThreadCard
                    key={t.id}
                    thread={t}
                    tag={selectedTag}
                    onSelect={() => setSelectedThread(t)}
                    onSelectTag={setSelectedTag}
                  />
                ))
              )}
            </div>
          </section>
        </div>

        {/* Right Discovery Rail & Topster Spotlight (4 Cols on Desktop) */}
        <div className="lg:col-span-4 space-y-6">
          {/* 6. Discovery Rail */}
          <DiscoveryRail
            onSelectTag={setSelectedTag}
            selectedTag={selectedTag}
          />

          {/* 7. Topster Spotlight */}
          <TopsterSpotlight user={user} />
        </div>
      </div>

      {/* Floating Mobile Compose Control (Fixed at bottom right on small screens) */}
      <div className="sm:hidden fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={handleOpenComposer}
          className="w-12 h-12 rounded-md bg-accent text-[#0A0B0A] hover:bg-accent-hover shadow-5 flex items-center justify-center transition-transform active:scale-95 cursor-pointer"
          aria-label="Start a discussion"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>
      </div>

      {/* Composer Modal */}
      <ComposerModal
        isOpen={isComposerOpen}
        onClose={() => setIsComposerOpen(false)}
        user={user}
        defaultTagId={selectedTag?.id}
        onSuccess={() => {
          loadFeedData();
        }}
      />
    </div>
  );
}