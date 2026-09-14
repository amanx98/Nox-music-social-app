import { useState, useEffect } from "react";
import { generateQuilt, getQuilts, deleteQuilt, getTopAlbums } from "./api/client";
import { useToast } from "./components/Toast";
import LightboxModal from "./components/LightboxModal";
import QuiltFolderModal from "./components/QuiltFolderModal";
import BentoTopsterGrid from "./components/quilt/BentoTopsterGrid";
import AlbumDetailModal from "./components/quilt/AlbumDetailModal";
import Button from "./components/ui/Button";

const PERIODS = [
  { value: "overall", label: "All Time" },
  { value: "7day", label: "Last 7 Days" },
  { value: "1month", label: "Last Month" },
  { value: "3month", label: "Last 3 Months" },
  { value: "6month", label: "Last 6 Months" },
  { value: "12month", label: "Last Year" },
];

const DIMENSION_PRESETS = [
  { size: 2, label: "2×2 (4 Covers)" },
  { size: 3, label: "3×3 (9 Covers — Classic)" },
  { size: 4, label: "4×4 (16 Covers)" },
  { size: 5, label: "5×5 (25 Covers)" },
  { size: 6, label: "6×6 (36 Covers)" },
];

export default function QuiltGallery() {
  const { addToast } = useToast();

  // Top view mode: 'bento' or 'quilts'
  const [viewMode, setViewMode] = useState("bento");

  // Bento Topster state
  const [bentoPeriod, setBentoPeriod] = useState("overall");
  const [bentoAlbums, setBentoAlbums] = useState([]);
  const [bentoLoading, setBentoLoading] = useState(false);
  const [selectedBentoAlbum, setSelectedBentoAlbum] = useState(null);
  const [selectedBentoRank, setSelectedBentoRank] = useState(1);

  // Generated Quilts state
  const [quilts, setQuilts] = useState([]);
  const [quiltLoading, setQuiltLoading] = useState(false);
  const [error, setError] = useState("");
  const [quiltPeriod, setQuiltPeriod] = useState("overall");
  const [quiltType, setQuiltType] = useState("albums");
  const [gridSize, setGridSize] = useState(3);

  // Folder state
  const [activeFolder, setActiveFolder] = useState("all");
  const [folders, setFolders] = useState(() => {
    const saved = localStorage.getItem("nox_quilt_folders");
    return saved ? JSON.parse(saved) : ["Heavy Rotation", "All Time Favorites"];
  });
  const [quiltFolders, setQuiltFolders] = useState(() => {
    const saved = localStorage.getItem("nox_quilt_assignments");
    return saved ? JSON.parse(saved) : {};
  });

  // Modal state
  const [activeLightboxQuilt, setActiveLightboxQuilt] = useState(null);
  const [showFolderModal, setShowFolderModal] = useState(false);

  useEffect(() => {
    loadBentoAlbums(bentoPeriod);
    loadQuilts();
  }, []);

  useEffect(() => {
    localStorage.setItem("nox_quilt_folders", JSON.stringify(folders));
  }, [folders]);

  useEffect(() => {
    localStorage.setItem("nox_quilt_assignments", JSON.stringify(quiltFolders));
  }, [quiltFolders]);

  async function loadBentoAlbums(period) {
    setBentoLoading(true);
    try {
      const data = await getTopAlbums(period);
      setBentoAlbums(Array.isArray(data) ? data : []);
    } catch {
      // Graceful fallback if Last.fm not yet connected
      setBentoAlbums([]);
    } finally {
      setBentoLoading(false);
    }
  }

  function handleBentoPeriodChange(p) {
    setBentoPeriod(p);
    loadBentoAlbums(p);
  }

  async function loadQuilts() {
    try {
      const data = await getQuilts();
      setQuilts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleGenerate(e) {
    e.preventDefault();
    setQuiltLoading(true);
    setError("");
    try {
      await generateQuilt(quiltPeriod, quiltType, gridSize);
      await loadQuilts();
      addToast("Quilt generated successfully!");
    } catch (err) {
      setError(err.message);
      addToast(err.message || "Failed to generate quilt", "error");
    } finally {
      setQuiltLoading(false);
    }
  }

  async function handleDeleteQuilt(id) {
    try {
      await deleteQuilt(id);
      setQuilts((prev) => prev.filter((q) => q.id !== id));
      setQuiltFolders((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      addToast("Quilt deleted");
    } catch {
      setQuilts((prev) => prev.filter((q) => q.id !== id));
      addToast("Quilt removed from gallery");
    }
  }

  function handleAssignFolder(quiltId, folderName) {
    setQuiltFolders((prev) => {
      const next = { ...prev };
      if (!folderName) {
        delete next[quiltId];
      } else {
        next[quiltId] = folderName;
      }
      return next;
    });
  }

  function handleCreateFolder(name) {
    if (!folders.includes(name)) {
      setFolders((prev) => [...prev, name]);
    }
  }

  function handleDeleteFolder(name) {
    setFolders((prev) => prev.filter((f) => f !== name));
    if (activeFolder === name) setActiveFolder("all");
    setQuiltFolders((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((qid) => {
        if (next[qid] === name) delete next[qid];
      });
      return next;
    });
  }

  function handleDownloadQuick(quilt, e) {
    e.stopPropagation();
    fetch(quilt.image_url)
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `nox-quilt-${quilt.id}.png`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        addToast("Download started");
      })
      .catch(() => {
        window.open(quilt.image_url, "_blank");
      });
  }

  // Filter quilts by folder
  const filteredQuilts = quilts.filter((q) => {
    if (activeFolder === "all") return true;
    if (activeFolder === "unassigned") return !quiltFolders[q.id];
    return quiltFolders[q.id] === activeFolder;
  });

  return (
    <div className="space-y-6">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-black text-text tracking-tight">
            Album Quilts &amp; Topsters
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Hierarchical bento topsters and high-res composite collages generated from your music journey.
          </p>
        </div>

        {/* View Mode Switcher Pill Group */}
        <div
          role="tablist"
          aria-label="Quilt Gallery Views"
          className="inline-flex p-1 rounded-xl bg-surface-sunken border border-border self-start sm:self-auto"
        >
          <button
            role="tab"
            aria-selected={viewMode === "bento"}
            onClick={() => setViewMode("bento")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
              viewMode === "bento"
                ? "bg-surface-raised text-accent shadow-1 border border-border"
                : "text-muted hover:text-text hover:bg-surface/50"
            }`}
          >
            <span>🍱</span>
            <span>Bento Topster</span>
          </button>
          <button
            role="tab"
            aria-selected={viewMode === "quilts"}
            onClick={() => setViewMode("quilts")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
              viewMode === "quilts"
                ? "bg-surface-raised text-accent shadow-1 border border-border"
                : "text-muted hover:text-text hover:bg-surface/50"
            }`}
          >
            <span>🖼️</span>
            <span>Quilt Studio ({quilts.length})</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg border border-danger/40 bg-danger-muted text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* ====================================================================
          MODE 1: BENTO TOPSTER MOSAIC GRID (Skill: bento-grid-layouts)
         ==================================================================== */}
      {viewMode === "bento" && (
        <div className="space-y-5 animate-fade-in">
          {/* Time Window Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-surface-raised border border-border">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted">
                Period:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {PERIODS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => handleBentoPeriodChange(p.value)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      bentoPeriod === p.value
                        ? "bg-accent text-surface font-bold"
                        : "bg-surface-sunken border border-border text-muted hover:text-text hover:border-border-hover"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-2xs font-mono text-muted hidden sm:inline">
                {bentoAlbums.length} albums synced
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadBentoAlbums(bentoPeriod)}
                disabled={bentoLoading}
              >
                {bentoLoading ? "Syncing..." : "↻ Refresh"}
              </Button>
            </div>
          </div>

          {/* Render Responsive Bento Topster Grid */}
          <BentoTopsterGrid
            albums={bentoAlbums}
            period={bentoPeriod}
            isLoading={bentoLoading}
            onSelectAlbum={(album, rank) => {
              setSelectedBentoAlbum(album);
              setSelectedBentoRank(rank);
            }}
          />

          {/* Quick Explainer Callout */}
          <div className="p-4 rounded-xl border border-border/80 bg-surface-sunken/60 flex items-center justify-between text-xs text-muted">
            <div className="flex items-center gap-2">
              <span className="text-base">💡</span>
              <span>
                Tip: Click any album in your Bento Topster to view details, verify play counts, or search tracks.
              </span>
            </div>
            <button
              onClick={() => setViewMode("quilts")}
              className="text-accent hover:underline font-semibold flex-shrink-0"
            >
              Export to Quilt Canvas →
            </button>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODE 2: QUILT CANVAS STUDIO & CRATES
         ==================================================================== */}
      {viewMode === "quilts" && (
        <div className="space-y-6 animate-fade-in">
          {/* Quilt Generation Control Box */}
          <div className="p-5 rounded-2xl border border-border bg-surface-raised shadow-2">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="text-xl">🎛️</span>
              <h2 className="text-base font-bold text-text">Quilt Studio</h2>
            </div>

            <form
              onSubmit={handleGenerate}
              className="flex flex-wrap items-end gap-3"
            >
              {/* Period selector */}
              <div className="flex flex-col gap-1.5 flex-1 min-w-[130px]">
                <label className="text-2xs font-mono uppercase text-muted tracking-wider">
                  Time Window
                </label>
                <select
                  value={quiltPeriod}
                  onChange={(e) => setQuiltPeriod(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-surface-sunken border border-border text-xs text-text focus:ring-2 focus:ring-accent focus:outline-none"
                >
                  {PERIODS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type selector */}
              <div className="flex flex-col gap-1.5 flex-1 min-w-[130px]">
                <label className="text-2xs font-mono uppercase text-muted tracking-wider">
                  Media Type
                </label>
                <select
                  value={quiltType}
                  onChange={(e) => setQuiltType(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-surface-sunken border border-border text-xs text-text focus:ring-2 focus:ring-accent focus:outline-none"
                >
                  <option value="albums">Top Albums</option>
                  <option value="tracks">Top Tracks</option>
                </select>
              </div>

              {/* Grid Size / Dimensions */}
              <div className="flex flex-col gap-1.5 flex-1 min-w-[150px]">
                <label className="text-2xs font-mono uppercase text-muted tracking-wider">
                  Grid Dimensions
                </label>
                <select
                  value={gridSize}
                  onChange={(e) => setGridSize(Number(e.target.value))}
                  className="px-3 py-2 rounded-lg bg-surface-sunken border border-border text-xs text-text focus:ring-2 focus:ring-accent focus:outline-none"
                >
                  {DIMENSION_PRESETS.map((preset) => (
                    <option key={preset.size} value={preset.size}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={quiltLoading}
                  className="h-[38px]"
                >
                  {quiltLoading ? (
                    <>
                      <span className="animate-spin">💿</span>
                      <span>Spinning Quilt...</span>
                    </>
                  ) : (
                    <>
                      <span>✦</span>
                      <span>Generate Quilt</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Crates / Folders Bar */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-2xs font-mono uppercase tracking-wider text-muted">
                Crates &amp; Collections ({filteredQuilts.length})
              </span>
              <button
                type="button"
                onClick={() => setShowFolderModal(true)}
                className="text-xs text-accent hover:underline font-semibold"
              >
                ⚙️ Manage Crates
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveFolder("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeFolder === "all"
                    ? "bg-accent text-surface font-bold shadow-1"
                    : "bg-surface-sunken border border-border text-muted hover:text-text hover:border-border-hover"
                }`}
              >
                All Quilts ({quilts.length})
              </button>

              {folders.map((folder) => {
                const count = quilts.filter((q) => quiltFolders[q.id] === folder).length;
                return (
                  <button
                    key={folder}
                    onClick={() => setActiveFolder(folder)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      activeFolder === folder
                        ? "bg-accent text-surface font-bold shadow-1"
                        : "bg-surface-sunken border border-border text-muted hover:text-text hover:border-border-hover"
                    }`}
                  >
                    📁 {folder} ({count})
                  </button>
                );
              })}

              <button
                onClick={() => setActiveFolder("unassigned")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeFolder === "unassigned"
                    ? "bg-accent text-surface font-bold shadow-1"
                    : "bg-surface-sunken border border-border text-muted hover:text-text hover:border-border-hover"
                }`}
              >
                Unassigned
              </button>

              <button
                onClick={() => setShowFolderModal(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-dashed border-border text-muted hover:text-text hover:border-accent"
              >
                + New Crate
              </button>
            </div>
          </div>

          {/* Quilt Grid */}
          {filteredQuilts.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface-raised p-10 text-center">
              <div className="text-4xl mb-3">🖼️</div>
              <h3 className="text-base font-bold text-text mb-1">No quilts in this crate</h3>
              <p className="text-xs text-muted max-w-sm mx-auto">
                {quilts.length === 0
                  ? "Generate your first album or track quilt above using your Last.fm data."
                  : "Assign quilts to this crate by opening any quilt card."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredQuilts.map((quilt) => {
                const assigned = quiltFolders[quilt.id];
                return (
                  <div
                    key={quilt.id}
                    onClick={() => setActiveLightboxQuilt(quilt)}
                    className="group rounded-xl overflow-hidden border border-border bg-surface-raised hover:border-border-hover transition-all duration-300 shadow-2 hover:shadow-4 cursor-pointer flex flex-col"
                  >
                    <div className="relative aspect-square overflow-hidden bg-surface-sunken">
                      <img
                        src={quilt.image_url}
                        alt={`Quilt ${quilt.id}`}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>

                    <div className="p-3.5 flex items-center justify-between gap-2 border-t border-border">
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-text capitalize truncate">
                          {quilt.quilt_type} &middot; {quilt.period}
                        </div>
                        {assigned && (
                          <span className="inline-block mt-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                            📁 {assigned}
                          </span>
                        )}
                      </div>

                      <div
                        className="flex items-center gap-1.5 flex-shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={(e) => handleDownloadQuick(quilt, e)}
                          title="Download PNG"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-text hover:bg-surface-sunken border border-border"
                        >
                          ⬇
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm("Delete this quilt?")) {
                              handleDeleteQuilt(quilt.id);
                            }
                          }}
                          title="Delete Quilt"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-danger hover:bg-danger-muted border border-border"
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Album Detail Modal (for Bento Topster) */}
      {selectedBentoAlbum && (
        <AlbumDetailModal
          album={selectedBentoAlbum}
          rank={selectedBentoRank}
          onClose={() => setSelectedBentoAlbum(null)}
        />
      )}

      {/* Lightbox Modal (for Quilt Canvas) */}
      {activeLightboxQuilt && (
        <LightboxModal
          quilt={activeLightboxQuilt}
          folders={folders}
          quiltFolders={quiltFolders}
          onClose={() => setActiveLightboxQuilt(null)}
          onDelete={handleDeleteQuilt}
          onAssignFolder={handleAssignFolder}
        />
      )}

      {/* Folder Management Modal */}
      {showFolderModal && (
        <QuiltFolderModal
          folders={folders}
          onClose={() => setShowFolderModal(false)}
          onCreateFolder={handleCreateFolder}
          onDeleteFolder={handleDeleteFolder}
        />
      )}
    </div>
  );
}