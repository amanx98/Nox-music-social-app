import { useState, useEffect, useRef, useTransition } from "react";
import { Search, X, Hash, ArrowRight, Loader2 } from "lucide-react";
import { getThreads, getTags } from "../../api/client";

export default function HeaderSearch({ onSelectThread, onSelectTag }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState({ threads: [], tags: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [, startTransition] = useTransition();

  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const debounceTimer = useRef(null);

  // Global shortcut Ctrl+K or /
  useEffect(() => {
    function handleGlobalKeydown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen(true);
      } else if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    }
    window.addEventListener("keydown", handleGlobalKeydown);
    return () => window.removeEventListener("keydown", handleGlobalKeydown);
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults({ threads: [], tags: [] });
      setError(null);
    }
  }, [isOpen]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        handleClose();
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  function handleClose() {
    setIsOpen(false);
    setQuery("");
  }

  function handleQueryChange(e) {
    const val = e.target.value;
    setQuery(val);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!val.trim()) {
      setResults({ threads: [], tags: [] });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    debounceTimer.current = setTimeout(async () => {
      try {
        const [allThreads, allTags] = await Promise.all([
          getThreads().catch(() => []),
          getTags().catch(() => []),
        ]);

        const q = val.toLowerCase();
        const matchedThreads = (allThreads || []).filter(
          (t) =>
            t.title?.toLowerCase().includes(q) ||
            t.body?.toLowerCase().includes(q) ||
            (t.author_name || t.username || "").toLowerCase().includes(q)
        ).slice(0, 5);

        const matchedTags = (allTags || []).filter((t) =>
          t.name?.toLowerCase().includes(q)
        ).slice(0, 4);

        startTransition(() => {
          setResults({ threads: matchedThreads, tags: matchedTags });
          setLoading(false);
        });
      } catch (err) {
        setError(err.message || "Search failed");
        setLoading(false);
      }
    }, 240);
  }

  const hasMatches = results.threads.length > 0 || results.tags.length > 0;

  return (
    <div ref={containerRef} className="relative flex items-center">
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="header-search-trigger h-9 px-2.5 rounded-md text-text-muted hover:text-black hover:bg-accent border border-transparent transition-all flex items-center gap-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-accent group"
          aria-label="Search posts, tags, and frequencies (Ctrl+K)"
          title="Search (Ctrl+K)"
        >
          <Search className="w-4 h-4 stroke-[2]" />
          <span className="hidden xl:inline text-xs font-mono text-text-dim group-hover:text-black transition-colors">Search...</span>
          <kbd className="hidden xl:inline-block font-mono text-[10px] px-1 py-0.2 rounded bg-surface-sunken border border-border text-text-dim group-hover:text-black group-hover:border-black/30 transition-colors">
            ⌘K
          </kbd>
        </button>
      ) : (
        <div className="relative flex items-center animate-fade-in">
          <div className="flex items-center gap-2 h-9 w-[280px] sm:w-[340px] md:w-[380px] rounded-md bg-surface-sunken border border-accent/70 ring-1 ring-accent/30 px-3 shadow-2">
            <Search className="w-4 h-4 text-accent shrink-0 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleQueryChange}
              onKeyDown={(e) => {
                if (e.key === "Escape") handleClose();
              }}
              placeholder="Search frequencies, tags, users..."
              style={{ padding: 0, margin: 0, border: "none", background: "transparent", outline: "none", boxShadow: "none" }}
              className="input-unstyled !p-0 !m-0 !border-0 !bg-transparent !outline-none !shadow-none !ring-0 text-xs text-text placeholder:text-text-dim flex-1 min-w-0 font-sans h-full"
              aria-label="Search input"
            />
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 text-accent animate-spin shrink-0" />
            ) : query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="text-text-dim hover:text-text p-1 rounded cursor-pointer shrink-0 hover:bg-surface-hover transition-colors flex items-center justify-center"
                aria-label="Clear query"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleClose}
              className="font-mono text-[10px] font-bold uppercase text-text-dim hover:text-black hover:bg-accent px-1.5 py-0.5 border border-border rounded shrink-0 transition-colors cursor-pointer"
              title="Close search (Esc)"
            >
              ESC
            </button>
          </div>

          {/* Results Dropdown Panel */}
          {query.trim() && (
            <div className="absolute top-11 left-0 w-[320px] sm:w-[400px] rounded-md bg-surface-raised border border-border p-2 shadow-5 z-50 animate-slide-up text-left">
              {error ? (
                <div className="p-3 text-xs font-mono text-rose-300">
                  {error}
                </div>
              ) : !hasMatches && !loading ? (
                <div className="p-4 text-center">
                  <p className="font-heading font-bold text-xs text-text mb-0.5">
                    No frequencies located
                  </p>
                  <p className="font-mono text-[11px] text-text-dim m-0">
                    No posts or tags match "{query}".
                  </p>
                </div>
              ) : (
                <div className="space-y-2 divide-y divide-border/60">
                  {/* Tags / Communities Section */}
                  {results.tags.length > 0 && (
                    <div className="pt-1 first:pt-0">
                      <div className="px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-accent">
                        Communities &amp; Tags
                      </div>
                      <div className="flex flex-wrap gap-1 p-1">
                        {results.tags.map((tag) => (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => {
                              onSelectTag?.(tag);
                              handleClose();
                            }}
                            className="inline-flex items-center gap-1 font-mono text-2xs px-2 py-1 rounded bg-surface border border-border hover:border-accent hover:text-accent text-text transition-colors cursor-pointer"
                          >
                            <Hash className="w-2.5 h-2.5 text-accent" />
                            <span>{tag.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Threads Section */}
                  {results.threads.length > 0 && (
                    <div className="pt-2">
                      <div className="px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-text-dim">
                        Discussions ({results.threads.length})
                      </div>
                      <div className="space-y-1">
                        {results.threads.map((thread) => (
                          <div
                            key={thread.id}
                            onClick={() => {
                              onSelectThread?.(thread);
                              handleClose();
                            }}
                            className="p-2 rounded hover:bg-surface border border-transparent hover:border-border cursor-pointer transition-colors group flex items-start justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <h4 className="font-heading font-bold text-xs text-text group-hover:text-accent truncate m-0">
                                {thread.title}
                              </h4>
                              <p className="font-sans text-[11px] text-text-dim truncate m-0 mt-0.5">
                                {thread.body}
                              </p>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-text-dim group-hover:text-accent group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
