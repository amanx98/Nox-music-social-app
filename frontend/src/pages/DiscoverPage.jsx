import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Hash,
  Mic,
  Radio,
  Search,
  Plus,
  ArrowRight,
  Loader2,
  X,
  Sparkles,
  Disc,
} from "lucide-react";
import { getTags, createTag, resolveImageUrl } from "../api/client";
import { useToast } from "../components/Toast";
import EngineCompareView from "../components/curation/EngineCompareView";
import PlaylistGeneratorModal from "../components/curation/PlaylistGeneratorModal";
import TasteVectorCard from "../components/curation/TasteVectorCard";

export default function DiscoverPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const [newTagName, setNewTagName] = useState("");
  const [newTagDesc, setNewTagDesc] = useState("");
  const [newTagType, setNewTagType] = useState("genre");
  const [creating, setCreating] = useState(false);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);

  const loadTags = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTags();
      setTags(data || []);
    } catch (err) {
      addToast(err.message || "Failed to load communities", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  async function handleCreateTag(e) {
    e.preventDefault();
    const trimmed = newTagName.trim().replace(/^#/, "").replace(/^c\//, "");
    if (!trimmed) return;

    setCreating(true);
    try {
      await createTag(trimmed, newTagType, {
        description: newTagDesc.trim() || null,
      });
      setNewTagName("");
      setNewTagDesc("");
      addToast(`Community c/${trimmed} founded successfully!`);
      navigate(`/c/${encodeURIComponent(trimmed)}`);
    } catch (err) {
      addToast(err.message || "Failed to create community", "error");
    } finally {
      setCreating(false);
    }
  }

  const filteredTags = tags.filter((tag) => {
    const matchesQuery = tag.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === "all" ? true : tag.type === activeFilter;
    return matchesQuery && matchesFilter;
  });

  return (
    <div className="w-full max-w-[1020px] mx-auto space-y-6 text-left">
      {/* Header */}
      <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Radio className="w-4 h-4 text-accent" />
            <span className="font-mono text-[10px] font-bold tracking-widest text-accent uppercase">
              RADAR // SCENES &amp; FREQUENCIES
            </span>
          </div>
          <h1 className="font-heading font-black text-2xl sm:text-3xl text-text tracking-tight uppercase m-0">
            Discover Communities
          </h1>
        </div>

        <p className="font-sans text-xs sm:text-sm text-text-dim max-w-sm sm:text-right m-0">
          Explore artist enclaves, genre archives, and underground sound circles.
        </p>
      </section>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-md bg-surface-raised border border-border">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[220px] flex items-center">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim pointer-events-none z-10" />
          <input
            type="text"
            placeholder="Filter scenes and tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: "2.75rem", paddingRight: "2rem" }}
            className="input-unstyled w-full h-9 rounded-md bg-surface-sunken border border-border text-xs text-text placeholder:text-text-dim outline-none focus:border-accent font-sans transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-text-dim hover:text-text cursor-pointer transition-colors"
              aria-label="Clear filter"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {["all", "genre", "artist", "custom"].map((filter) => {
            const active = activeFilter === filter;
            return (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                style={active ? { backgroundColor: "#C7F43D", color: "#0A0B0A" } : undefined}
                className={`h-8 px-3.5 rounded-md font-mono text-2xs uppercase tracking-wider transition-colors cursor-pointer ${
                  active
                    ? "bg-accent text-black font-bold border border-accent shadow-md"
                    : "bg-[#1E211E] border border-white/10 text-[#F4F5EF] hover:bg-[#282C28] hover:border-white/20 hover:text-white"
                }`}
              >
                {filter === "all" ? `All (${tags.length})` : filter}
              </button>
            );
          })}
        </div>
      </div>

      {/* Reddit-Style Grid of Subreddit Communities */}
      {loading ? (
        <div className="py-16 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-accent mx-auto mb-2" />
          <p className="font-mono text-xs text-text-dim">Scanning frequencies...</p>
        </div>
      ) : filteredTags.length === 0 ? (
        <div className="rounded-md border border-border bg-surface-raised p-8 text-center">
          <p className="font-heading font-bold text-sm text-text mb-1">
            No communities found matching "{searchQuery}"
          </p>
          <p className="font-sans text-xs text-text-muted max-w-xs mx-auto">
            You can create this scene below to become its founding curator.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filteredTags.map((tag) => {
            const themeColor = tag.theme_color || "#C7F43D";
            const bannerSrc = tag.banner_url ? resolveImageUrl(tag.banner_url) : null;
            const iconSrc = tag.icon_url ? resolveImageUrl(tag.icon_url) : null;

            return (
              <div
                key={tag.id}
                onClick={() => navigate(`/c/${encodeURIComponent(tag.name)}`)}
                className="rounded-xl border border-border bg-surface-raised hover:border-accent hover:bg-surface transition-all cursor-pointer group flex flex-col overflow-hidden shadow-2 hover:shadow-4 relative"
              >
                {/* Card Mini Banner */}
                <div className="relative w-full h-20 overflow-hidden bg-surface-sunken">
                  {bannerSrc ? (
                    <img
                      src={bannerSrc}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div
                      className="w-full h-full"
                      style={{
                        background: `radial-gradient(ellipse at 80% 20%, ${themeColor}33 0%, rgba(10, 11, 10, 0.95) 75%),
                                     linear-gradient(135deg, #0e100f 0%, #151816 100%)`,
                      }}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none" />

                  {/* Type badge */}
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-xs font-mono text-[9px] uppercase tracking-wider text-text-dim border border-white/10">
                    {tag.type}
                  </div>
                </div>

                {/* Card Body with Overlapping Avatar */}
                <div className="p-3.5 pt-0 flex-1 flex flex-col justify-between">
                  <div className="flex items-start gap-2.5 -mt-6 relative z-10 mb-2">
                    {/* Community Icon */}
                    <div
                      className="w-12 h-12 rounded-xl bg-surface-sunken border-2 overflow-hidden shadow-2 flex items-center justify-center shrink-0"
                      style={{ borderColor: themeColor }}
                    >
                      {iconSrc ? (
                        <img src={iconSrc} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Disc className="w-6 h-6" style={{ color: themeColor }} />
                      )}
                    </div>

                    <div className="min-w-0 pt-6">
                      <h3 className="font-heading font-black text-sm text-text group-hover:text-accent truncate m-0">
                        c/{tag.name}
                      </h3>
                      {tag.creator_username && (
                        <span className="font-mono text-[10px] text-text-dim">
                          curated by @{tag.creator_username}
                        </span>
                      )}
                    </div>
                  </div>

                  {tag.description && (
                    <p className="font-sans text-xs text-text-muted line-clamp-2 leading-relaxed mb-3">
                      {tag.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-border/60 text-text-dim font-mono text-[10px] mt-auto">
                    <span>
                      {tag.threads_count || 0} takes • {tag.posts_count || 0} replies
                    </span>
                    <span className="text-accent group-hover:translate-x-0.5 transition-transform font-heading font-bold text-xs inline-flex items-center gap-0.5">
                      Enter Scene →
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create New Community Box */}
      <div className="rounded-xl border border-border bg-surface-raised p-5 sm:p-6 space-y-4 shadow-2">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-widest text-accent font-bold">
            FOUND A FREQUENCY
          </div>
          <h3 className="font-heading font-bold text-base text-text m-0">
            Start a New Music Community
          </h3>
          <p className="font-sans text-xs text-text-muted mt-0.5">
            You will become the founding creator and moderator, with full rights to customize its banner, icon, rules, and vibe.
          </p>
        </div>

        <form onSubmit={handleCreateTag} className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Community name (e.g. Cocteau Twins, Minimal Wave)"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              disabled={creating}
              className="flex-1 min-w-[200px] h-9 px-3 rounded-md bg-surface-sunken border border-border text-xs text-text placeholder:text-text-dim outline-none focus:border-accent"
            />

            <select
              value={newTagType}
              onChange={(e) => setNewTagType(e.target.value)}
              disabled={creating}
              className="h-9 px-3 rounded-md bg-surface-sunken border border-border font-mono text-xs text-text focus:border-accent outline-none cursor-pointer"
            >
              <option value="genre">Genre</option>
              <option value="artist">Artist</option>
              <option value="custom">Custom Discussion</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Brief manifesto or description (optional)..."
              value={newTagDesc}
              onChange={(e) => setNewTagDesc(e.target.value)}
              disabled={creating}
              className="flex-1 min-w-[200px] h-9 px-3 rounded-md bg-surface-sunken border border-border text-xs text-text placeholder:text-text-dim outline-none focus:border-accent"
            />

            <button
              type="submit"
              disabled={creating || !newTagName.trim()}
              className="h-9 px-4 rounded-md bg-accent text-black hover:bg-accent-hover hover:text-black font-heading font-bold text-xs tracking-tight transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{creating ? "Founding..." : "Found Community"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* ——— ENGINE LAB ——— */}
      <section className="space-y-5 pt-2">
        {/* Section header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4 border-b border-border">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="font-mono text-[10px] font-bold tracking-widest text-accent uppercase">
                ENGINE LAB // CURATION SCIENCE
              </span>
            </div>
            <h2 className="font-heading font-black text-2xl sm:text-3xl text-text tracking-tight uppercase m-0">
              Taste Engine
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaylistModalOpen(true)}
              className="h-9 px-4 rounded-md bg-accent text-black hover:bg-accent-hover font-heading font-bold text-xs tracking-tight transition-all cursor-pointer flex items-center gap-1.5 shadow-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Generate Playlist
            </button>
          </div>
        </div>

        {/* Two-column layout: Taste ID left, Compare right on wide screens */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Taste Vector Card */}
          <div className="lg:col-span-1">
            <TasteVectorCard />
          </div>

          {/* Engine Compare View */}
          <div className="lg:col-span-2">
            <EngineCompareView />
          </div>
        </div>
      </section>

      {/* Playlist Generator Modal */}
      <PlaylistGeneratorModal
        isOpen={isPlaylistModalOpen}
        onClose={() => setIsPlaylistModalOpen(false)}
      />
    </div>
  );
}
