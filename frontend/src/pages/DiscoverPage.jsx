import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Hash, Mic, Radio, Search, Plus, ArrowRight, Loader2 } from "lucide-react";
import { getTags, createTag } from "../api/client";
import { useToast } from "../components/Toast";

export default function DiscoverPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const [newTagName, setNewTagName] = useState("");
  const [newTagType, setNewTagType] = useState("genre");
  const [creating, setCreating] = useState(false);

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
    const trimmed = newTagName.trim();
    if (!trimmed) return;

    setCreating(true);
    try {
      await createTag(trimmed, newTagType);
      setNewTagName("");
      addToast(`Community #${trimmed} created successfully!`);
      loadTags();
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
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
          <input
            type="search"
            placeholder="Filter scenes and tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-md bg-surface-sunken border border-border text-xs text-text placeholder:text-text-dim outline-none focus:border-accent"
          />
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-1.5">
          {["all", "genre", "artist", "custom"].map((filter) => {
            const active = activeFilter === filter;
            return (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={`h-8 px-3 rounded-md font-mono text-2xs uppercase tracking-wider transition-colors cursor-pointer ${
                  active
                    ? "bg-accent text-[#0A0B0A] font-bold"
                    : "bg-surface-sunken text-text-muted hover:text-text border border-border"
                }`}
              >
                {filter === "all" ? `All (${tags.length})` : filter}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of Communities */}
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
            You can create this scene below to start the conversation.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {filteredTags.map((tag) => (
            <div
              key={tag.id}
              onClick={() => navigate(`/?tag=${encodeURIComponent(tag.name)}`)}
              className="p-3.5 rounded-md border border-border bg-surface-raised hover:border-accent hover:bg-surface transition-all cursor-pointer group flex items-center justify-between gap-3 shadow-1"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded bg-surface-sunken border border-border flex items-center justify-center text-accent shrink-0 group-hover:border-accent transition-colors">
                  {tag.type === "artist" ? (
                    <Mic className="w-4 h-4 stroke-[2]" />
                  ) : (
                    <Hash className="w-4 h-4 stroke-[2]" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-heading font-bold text-xs text-text group-hover:text-accent truncate m-0">
                    #{tag.name}
                  </h3>
                  <span className="font-mono text-[10px] text-text-dim uppercase tracking-wider">
                    {tag.type}
                  </span>
                </div>
              </div>

              <ArrowRight className="w-3.5 h-3.5 text-text-dim group-hover:text-accent group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>
          ))}
        </div>
      )}

      {/* Create New Community Box */}
      <div className="rounded-md border border-border bg-surface-raised p-5 space-y-3 shadow-1">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-widest text-accent font-bold">
            FOUND A FREQUENCY
          </div>
          <h3 className="font-heading font-bold text-sm text-text m-0">
            Start a New Music Community
          </h3>
          <p className="font-sans text-xs text-text-muted mt-0.5">
            Create an unlisted scene, sub-genre, or artist archive.
          </p>
        </div>

        <form onSubmit={handleCreateTag} className="flex flex-wrap items-center gap-2">
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

          <button
            type="submit"
            disabled={creating || !newTagName.trim()}
            className="h-9 px-4 rounded-md bg-accent text-[#0A0B0A] hover:bg-accent-hover font-heading font-bold text-xs tracking-tight transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{creating ? "Creating..." : "Create Scene"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
