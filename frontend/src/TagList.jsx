import { useState, useEffect } from "react";
import { getTags, createTag } from "./api/client";
import { useToast } from "./components/Toast";

export default function TagList({ onSelectTag }) {
  const { addToast } = useToast();
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const [newTagName, setNewTagName] = useState("");
  const [newTagType, setNewTagType] = useState("artist");

  useEffect(() => {
    loadTags();
  }, []);

  async function loadTags() {
    setLoading(true);
    try {
      const data = await getTags();
      setTags(data || []);
    } catch (err) {
      addToast(err.message || "Failed to load communities");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTag(e) {
    e.preventDefault();
    const trimmed = newTagName.trim();
    if (!trimmed) return;
    try {
      await createTag(trimmed, newTagType);
      setNewTagName("");
      addToast(`Community #${trimmed} created!`);
      loadTags();
    } catch (err) {
      addToast(err.message || "Failed to create community");
    }
  }

  const filteredTags = tags.filter((tag) => {
    const matchesQuery = tag.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === "all" ? true : tag.type === activeFilter;
    return matchesQuery && matchesFilter;
  });

  return (
    <div>
      {/* Title & Introduction */}
      <div style={{ marginBottom: "24px" }}>
        <h1>Music Communities</h1>
        <p className="meta" style={{ margin: 0 }}>
          Dive into artist discussions, genre deep-dives, and album debates.
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap", marginBottom: "20px" }}>
        <div style={{ position: "relative", flex: "1 1 240px" }}>
          <input
            type="text"
            placeholder="Search tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: "100%", paddingLeft: "14px" }}
          />
        </div>

        {/* Filter Pills */}
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            className={`btn-ghost ${activeFilter === "all" ? "badge-mustard" : ""}`}
            style={{
              fontSize: "12px",
              padding: "5px 12px",
              borderRadius: "var(--radius-full)",
              border: activeFilter === "all" ? "1px solid var(--mustard)" : "1px solid var(--border)",
            }}
            onClick={() => setActiveFilter("all")}
          >
            All ({tags.length})
          </button>
          <button
            className={`btn-ghost ${activeFilter === "artist" ? "badge-mustard" : ""}`}
            style={{
              fontSize: "12px",
              padding: "5px 12px",
              borderRadius: "var(--radius-full)",
              border: activeFilter === "artist" ? "1px solid var(--mustard)" : "1px solid var(--border)",
            }}
            onClick={() => setActiveFilter("artist")}
          >
            Artists
          </button>
          <button
            className={`btn-ghost ${activeFilter === "genre" ? "badge-mustard" : ""}`}
            style={{
              fontSize: "12px",
              padding: "5px 12px",
              borderRadius: "var(--radius-full)",
              border: activeFilter === "genre" ? "1px solid var(--mustard)" : "1px solid var(--border)",
            }}
            onClick={() => setActiveFilter("genre")}
          >
            Genres
          </button>
        </div>
      </div>

      {/* Community List */}
      <div style={{ marginBottom: "36px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin mx-auto" />
            <p className="font-mono text-xs text-text-dim" style={{ marginTop: "8px" }}>Loading tags...</p>
          </div>
        ) : filteredTags.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "32px 20px" }}>
            <p className="meta" style={{ margin: 0 }}>
              No communities found matching "{searchQuery}". Create one below!
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {filteredTags.map((tag, i) => (
              <div
                key={tag.id}
                className="track-row"
                style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}
                onClick={() => onSelectTag(tag)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <span className="track-number">{String(i + 1).padStart(2, "0")}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontWeight: 600, fontSize: "15px", color: "var(--cream-text)" }}>
                      #{tag.name}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span className={`badge ${tag.type === "artist" ? "badge-mustard" : "badge-teal"}`}>
                    {tag.type}
                  </span>
                  <span style={{ color: "var(--cream-text-muted)", fontSize: "14px" }}>&rarr;</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Community Box */}
      <div className="card" style={{ maxWidth: "560px", background: "var(--bg-raised)" }}>
        <h3 style={{ marginBottom: "8px" }}>Found a New Community</h3>
        <p className="meta" style={{ marginBottom: "14px" }}>
          Create a space for an unlisted artist, sub-genre, or local scene.
        </p>

        <form onSubmit={handleCreateTag} style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Community name (e.g. Cocteau Twins, Post-Bop)"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            style={{ flex: "1 1 200px" }}
          />

          <select value={newTagType} onChange={(e) => setNewTagType(e.target.value)}>
            <option value="artist">Artist</option>
            <option value="genre">Genre</option>
            <option value="custom">Custom Discussion</option>
          </select>

          <button type="submit" className="btn-primary">
            + Create
          </button>
        </form>
      </div>
    </div>
  );
}