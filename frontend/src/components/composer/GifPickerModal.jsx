import { useState, useEffect, useRef, useMemo } from "react";
import {
  X,
  Search,
  Sparkles,
  Link2,
  Film,
  Key,
  Check,
  AlertCircle,
  Loader2,
  Upload,
} from "lucide-react";
import { GIF_CATEGORIES, CURATED_GIFS } from "../../data/curatedGifs";
import { cn } from "../../lib/cn";

export default function GifPickerModal({ isOpen, onClose, onSelectGif, onUploadLocal }) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [directUrl, setDirectUrl] = useState("");
  const [urlPreviewValid, setUrlPreviewValid] = useState(false);
  const [testingUrl, setTestingUrl] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Optional custom GIPHY API key
  const [giphyApiKey, setGiphyApiKey] = useState(() => {
    try {
      return localStorage.getItem("nox_giphy_api_key") || "";
    } catch {
      return "";
    }
  });
  const [liveGifs, setLiveGifs] = useState([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState(null);

  const searchInputRef = useRef(null);
  const modalRef = useRef(null);

  // Auto-focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 60);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Escape key listener
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Live GIPHY fetch if an API key is present
  useEffect(() => {
    if (!isOpen || !giphyApiKey.trim()) {
      setLiveGifs([]);
      return;
    }

    let isMounted = true;
    const cleanKey = giphyApiKey.trim();
    const query = searchQuery.trim() || (activeCategory !== "all" ? activeCategory : "trending music");

    const endpoint = searchQuery.trim() || activeCategory !== "all"
      ? `https://api.giphy.com/v1/gifs/search?api_key=${encodeURIComponent(cleanKey)}&q=${encodeURIComponent(query)}&limit=24&rating=pg-13`
      : `https://api.giphy.com/v1/gifs/trending?api_key=${encodeURIComponent(cleanKey)}&limit=24&rating=pg-13`;

    setLiveLoading(true);
    setLiveError(null);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    fetch(endpoint, { signal: controller.signal })
      .then((res) => {
        clearTimeout(timeout);
        if (!res.ok) throw new Error(`GIPHY API Error (${res.status})`);
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;
        const items = (data.data || []).map((g) => ({
          id: g.id,
          title: g.title || "GIPHY GIF",
          url: g.images?.original?.url || g.images?.downsized?.url || g.images?.fixed_height?.url,
          previewUrl: g.images?.fixed_height?.url || g.images?.downsized?.url || g.images?.original?.url,
          category: activeCategory,
        })).filter((item) => Boolean(item.url));

        setLiveGifs(items);
      })
      .catch((err) => {
        if (!isMounted) return;
        setLiveError(err.message);
        setLiveGifs([]);
      })
      .finally(() => {
        if (isMounted) setLiveLoading(false);
      });

    return () => {
      isMounted = false;
      controller.abort();
      clearTimeout(timeout);
    };
  }, [isOpen, searchQuery, activeCategory, giphyApiKey]);

  // Filter curated GIFs
  const filteredCuratedGifs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return CURATED_GIFS.filter((gif) => {
      // Category check
      if (activeCategory !== "all" && gif.category !== activeCategory) {
        // If searching text, allow matching across all categories
        if (!q) return false;
      }

      // Query check
      if (!q) return true;

      const titleMatch = gif.title.toLowerCase().includes(q);
      const tagMatch = gif.tags?.some((t) => t.toLowerCase().includes(q));
      const catMatch = gif.category.toLowerCase().includes(q);

      return titleMatch || tagMatch || catMatch;
    });
  }, [searchQuery, activeCategory]);

  // Combined displayed GIFs: prefer live GIPHY if available, otherwise curated catalog
  const displayedGifs = giphyApiKey.trim() && liveGifs.length > 0 ? liveGifs : filteredCuratedGifs;

  function handleSaveApiKey(e) {
    e.preventDefault();
    try {
      localStorage.setItem("nox_giphy_api_key", giphyApiKey.trim());
      setShowSettings(false);
    } catch {}
  }

  function handleDirectUrlAttach() {
    const trimmed = directUrl.trim();
    if (!trimmed) return;
    onSelectGif({
      url: trimmed,
      title: "Online GIF",
      previewUrl: trimmed,
    });
    setDirectUrl("");
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in text-left"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[620px] max-h-[85vh] rounded-2xl border border-border bg-surface-raised flex flex-col shadow-2xl overflow-hidden animate-slide-up"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-sunken/40">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center text-accent">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-heading font-black text-sm text-text flex items-center gap-1.5">
                <span>Select a GIF</span>
                <span className="font-mono text-[9px] uppercase px-1.5 py-0.2 rounded bg-accent/20 text-accent font-bold">
                  Online
                </span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {onUploadLocal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onUploadLocal();
                }}
                className="h-7 px-2 rounded-md text-xs font-mono text-text-dim hover:text-text hover:bg-surface border border-border/80 transition-colors flex items-center gap-1 cursor-pointer"
                title="Upload GIF from your device"
              >
                <Upload className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Upload</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className={cn(
                "p-1.5 rounded-md text-xs font-mono transition-colors cursor-pointer",
                showSettings ? "bg-accent/20 text-accent" : "text-text-dim hover:text-text hover:bg-surface"
              )}
              title="Custom GIPHY Key (Optional)"
            >
              <Key className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md text-text-dim hover:text-text hover:bg-surface transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Optional GIPHY Key Drawer */}
        {showSettings && (
          <form
            onSubmit={handleSaveApiKey}
            className="p-3 bg-surface-sunken border-b border-border space-y-2 text-xs"
          >
            <div className="flex items-center justify-between text-text-dim">
              <span className="font-mono text-[10px] uppercase font-semibold">
                Custom GIPHY API Key (Optional)
              </span>
              <a
                href="https://developers.giphy.com/dashboard/"
                target="_blank"
                rel="noreferrer"
                className="font-mono text-[10px] text-accent hover:underline flex items-center gap-1"
              >
                <span>Get Free Key &rarr;</span>
              </a>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={giphyApiKey}
                onChange={(e) => setGiphyApiKey(e.target.value)}
                placeholder="Enter GIPHY API key for unlimited live web search..."
                className="flex-1 h-8 px-2.5 rounded bg-surface border border-border font-mono text-xs text-text placeholder:text-text-dim focus:border-accent outline-none"
              />
              <button
                type="submit"
                className="h-8 px-3 rounded bg-accent text-black font-heading font-bold text-xs hover:bg-accent-hover transition-colors cursor-pointer"
              >
                Save
              </button>
              {giphyApiKey && (
                <button
                  type="button"
                  onClick={() => {
                    setGiphyApiKey("");
                    localStorage.removeItem("nox_giphy_api_key");
                  }}
                  className="h-8 px-2 text-text-dim hover:text-danger text-xs cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </form>
        )}

        {/* Search Bar */}
        <div className="p-3 border-b border-border bg-surface">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-text-dim absolute left-3 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for GIFs (e.g. vibing, fire, applause, dancing)..."
              className="w-full h-9 pl-9 pr-8 rounded-lg bg-surface-sunken border border-border font-sans text-xs text-text placeholder:text-text-dim focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 p-1 text-text-dim hover:text-text cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Category Pills */}
        <div className="px-3 py-2 border-b border-border/70 bg-surface flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {GIF_CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id && !searchQuery;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setActiveCategory(cat.id);
                  setSearchQuery("");
                }}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-mono whitespace-nowrap transition-all cursor-pointer flex-shrink-0 flex items-center gap-1",
                  isActive
                    ? "bg-accent text-black font-bold shadow-sm"
                    : "bg-surface-raised border border-border text-text-dim hover:text-text hover:bg-surface-sunken"
                )}
              >
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* GIF Grid Stream */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[300px] max-h-[460px]">
          {liveLoading ? (
            <div className="py-16 text-center space-y-2 font-mono text-xs text-text-dim">
              <Loader2 className="w-6 h-6 animate-spin text-accent mx-auto" />
              <p>Searching online GIFs...</p>
            </div>
          ) : displayedGifs.length === 0 ? (
            <div className="py-14 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-surface-sunken border border-border flex items-center justify-center mx-auto text-text-dim">
                <Film className="w-5 h-5 stroke-[1.5]" />
              </div>
              <h3 className="font-heading font-bold text-sm text-text">No GIFs found</h3>
              <p className="font-sans text-xs text-text-muted max-w-xs mx-auto">
                No results for &ldquo;{searchQuery}&rdquo;. Try another term or paste a direct link below.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {displayedGifs.map((gif) => (
                <button
                  key={gif.id}
                  type="button"
                  onClick={() => {
                    onSelectGif({
                      url: gif.url,
                      title: gif.title,
                      previewUrl: gif.previewUrl || gif.url,
                    });
                    onClose();
                  }}
                  className="group relative aspect-video sm:aspect-square rounded-xl overflow-hidden border border-border bg-surface-sunken hover:border-accent hover:shadow-md transition-all cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-accent"
                >
                  <img
                    src={gif.previewUrl || gif.url}
                    alt={gif.title}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      // Fallback to original url if preview failed
                      if (e.currentTarget.src !== gif.url) {
                        e.currentTarget.src = gif.url;
                      }
                    }}
                  />
                  {/* Subtle Gradient & Hover Title */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex items-end">
                    <span className="font-sans text-[11px] font-semibold text-white line-clamp-1">
                      {gif.title}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer: Direct Link Input Bar (Twitter/X style fallback) */}
        <div className="p-3 border-t border-border bg-surface-sunken/60 flex items-center gap-2">
          <Link2 className="w-4 h-4 text-text-dim flex-shrink-0" />
          <input
            type="url"
            value={directUrl}
            onChange={(e) => setDirectUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleDirectUrlAttach();
              }
            }}
            placeholder="Paste any online GIF link (Tenor, GIPHY, Twitter, Imgur)..."
            className="flex-1 h-8 px-2.5 rounded bg-surface border border-border font-mono text-xs text-text placeholder:text-text-dim focus:border-accent outline-none"
          />
          <button
            type="button"
            onClick={handleDirectUrlAttach}
            disabled={!directUrl.trim()}
            className="h-8 px-3 rounded bg-accent text-black font-heading font-bold text-xs hover:bg-accent-hover transition-colors disabled:opacity-40 cursor-pointer flex-shrink-0"
          >
            Attach
          </button>
        </div>
      </div>
    </div>
  );
}
