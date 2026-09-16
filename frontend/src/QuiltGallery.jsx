import { useState, useEffect } from "react";
import {
  LayoutGrid,
  Layers,
  Sliders,
  Folder,
  FolderPlus,
  Trash2,
  Download,
  RefreshCw,
  Settings,
  Disc,
  User,
} from "lucide-react";
import {
  generateQuilt,
  getQuilts,
  deleteQuilt,
  getTopAlbums,
  getTopArtists,
  getArtistDetails,
} from "./api/client";
import { useToast } from "./components/Toast";
import LightboxModal from "./components/LightboxModal";
import QuiltFolderModal from "./components/QuiltFolderModal";
import BentoTopsterGrid from "./components/quilt/BentoTopsterGrid";
import AlbumDetailModal from "./components/quilt/AlbumDetailModal";
import ArtistModal from "./components/ArtistModal";
import Button from "./components/ui/Button";
import { cn } from "./lib/cn";

const PERIODS = [
  { value: "overall", label: "All Time" },
  { value: "7day", label: "Last 7 Days" },
  { value: "1month", label: "Last Month" },
  { value: "3month", label: "Last 3 Months" },
  { value: "6month", label: "Last 6 Months" },
  { value: "12month", label: "Last Year" },
];

const DIMENSION_PRESETS = [
  { size: 2, label: "2×2 (4)" },
  { size: 3, label: "3×3 (9)" },
  { size: 4, label: "4×4 (16)" },
  { size: 5, label: "5×5 (25)" },
  { size: 6, label: "6×6 (36)" },
];

export default function QuiltGallery() {
  const { addToast } = useToast();

  // Mode: 'bento' or 'quilts'
  const [viewMode, setViewMode] = useState("bento");

  // Bento Topster state
  const [bentoCategory, setBentoCategory] = useState("albums"); // "albums" | "artists"
  const [bentoPeriod, setBentoPeriod] = useState("overall");
  const [bentoAlbums, setBentoAlbums] = useState([]);
  const [bentoArtists, setBentoArtists] = useState([]);
  const [bentoLoading, setBentoLoading] = useState(false);
  const [selectedBentoAlbum, setSelectedBentoAlbum] = useState(null);
  const [selectedBentoRank, setSelectedBentoRank] = useState(1);
  const [selectedBentoArtist, setSelectedBentoArtist] = useState(null);

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
    try {
      const saved = localStorage.getItem("nox_quilt_folders");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore corrupted data
    }
    return ["Heavy Rotation", "Favorites"];
  });
  const [quiltFolders, setQuiltFolders] = useState(() => {
    try {
      const saved = localStorage.getItem("nox_quilt_assignments");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore corrupted data
    }
    return {};
  });

  // Modal state
  const [activeLightboxQuilt, setActiveLightboxQuilt] = useState(null);
  const [showFolderModal, setShowFolderModal] = useState(false);

  useEffect(() => {
    loadBentoAlbums(bentoPeriod);
    loadQuilts();
  }, [bentoPeriod]);

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
      setBentoAlbums([]);
    } finally {
      setBentoLoading(false);
    }
  }

  async function loadBentoArtists(period) {
    setBentoLoading(true);
    try {
      const data = await getTopArtists(period);
      const list = Array.isArray(data) ? data : [];
      // Hydrate top 9 artists with photography
      const top9 = list.slice(0, 9);
      const hydrated = await Promise.all(
        top9.map(async (item) => {
          try {
            const details = await getArtistDetails(item.name);
            return {
              ...item,
              name: item.name,
              playcount: item.playcount,
              image_url: details.image || (details.images && details.images[0]) || null,
              fans: details.fans,
              details,
            };
          } catch {
            return {
              ...item,
              name: item.name,
              playcount: item.playcount,
              image_url: null,
            };
          }
        })
      );
      setBentoArtists(hydrated);
    } catch {
      setBentoArtists([]);
    } finally {
      setBentoLoading(false);
    }
  }

  function handleBentoCategoryChange(cat) {
    setBentoCategory(cat);
    if (cat === "artists" && bentoArtists.length === 0) {
      loadBentoArtists(bentoPeriod);
    } else if (cat === "albums" && bentoAlbums.length === 0) {
      loadBentoAlbums(bentoPeriod);
    }
  }

  function handleBentoPeriodChange(p) {
    setBentoPeriod(p);
    if (bentoCategory === "artists") {
      loadBentoArtists(p);
    } else {
      loadBentoAlbums(p);
    }
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
      addToast("Quilt generated successfully");
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
      addToast("Quilt removed");
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
  const safeQuilts = Array.isArray(quilts) ? quilts : [];
  const safeQuiltFolders = quiltFolders && typeof quiltFolders === "object" ? quiltFolders : {};
  const filteredQuilts = safeQuilts.filter((q) => {
    if (!q) return false;
    if (activeFolder === "all") return true;
    if (activeFolder === "unassigned") return !safeQuiltFolders[q.id];
    return safeQuiltFolders[q.id] === activeFolder;
  });

  return (
    <div className="space-y-4 max-w-[1020px] mx-auto w-full">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <h1 className="text-xl sm:text-2xl font-heading font-black text-text tracking-tight">
            Topsters &amp; Quilts
          </h1>
        </div>

        {/* Mode Switcher */}
        <div
          role="tablist"
          aria-label="Views"
          className="inline-flex p-1 rounded-md bg-surface-raised border border-border self-start sm:self-auto"
        >
          <button
            role="tab"
            aria-selected={viewMode === "bento"}
            onClick={() => setViewMode("bento")}
            className={cn(
              "px-3.5 py-1.5 rounded text-xs font-heading font-semibold transition-all flex items-center gap-1.5 cursor-pointer",
              viewMode === "bento"
                ? "bg-accent text-accent-text font-bold shadow-1"
                : "text-text-muted hover:text-text"
            )}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Topster</span>
          </button>
          <button
            role="tab"
            aria-selected={viewMode === "quilts"}
            onClick={() => setViewMode("quilts")}
            className={cn(
              "px-3.5 py-1.5 rounded text-xs font-heading font-semibold transition-all flex items-center gap-1.5 cursor-pointer",
              viewMode === "quilts"
                ? "bg-accent text-accent-text font-bold shadow-1"
                : "text-text-muted hover:text-text"
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Canvas ({quilts.length})</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-md border border-danger/40 bg-danger-muted/30 text-rose-200 text-xs">
          {error}
        </div>
      )}

      {/* MODE 1: BENTO TOPSTER MOSAIC */}
      {viewMode === "bento" && (
        <div className="space-y-4">
          {/* Controls Bar: Category Switcher (Albums vs Artists) + Periods + Sync */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-md bg-surface-raised border border-border">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Albums / Artists Pill Switcher */}
              <div
                role="group"
                aria-label="Topster content type"
                className="inline-flex p-0.5 rounded-md bg-surface-sunken border border-border"
              >
                <button
                  type="button"
                  onClick={() => handleBentoCategoryChange("albums")}
                  className={cn(
                    "px-3 py-1 rounded text-xs font-heading font-semibold transition-all cursor-pointer flex items-center gap-1.5",
                    bentoCategory === "albums"
                      ? "bg-accent text-accent-text font-bold shadow-1"
                      : "text-text-muted hover:text-text"
                  )}
                >
                  <Disc className="w-3.5 h-3.5" />
                  <span>Albums</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleBentoCategoryChange("artists")}
                  className={cn(
                    "px-3 py-1 rounded text-xs font-heading font-semibold transition-all cursor-pointer flex items-center gap-1.5",
                    bentoCategory === "artists"
                      ? "bg-accent text-accent-text font-bold shadow-1"
                      : "text-text-muted hover:text-text"
                  )}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Artists</span>
                </button>
              </div>

              {/* Period Chips */}
              <div className="flex items-center gap-1 flex-wrap">
                {PERIODS.map((p) => {
                  const active = bentoPeriod === p.value;
                  return (
                    <button
                      key={p.value}
                      onClick={() => handleBentoPeriodChange(p.value)}
                      className={cn(
                        "px-2.5 py-1 rounded text-xs font-mono transition-all cursor-pointer",
                        active
                          ? "bg-surface text-accent font-bold border border-accent/40 shadow-1"
                          : "text-text-muted hover:text-text hover:bg-surface border border-transparent"
                      )}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => bentoCategory === "artists" ? loadBentoArtists(bentoPeriod) : loadBentoAlbums(bentoPeriod)}
              disabled={bentoLoading}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${bentoLoading ? "animate-spin" : ""}`} />
              <span>{bentoLoading ? "Syncing..." : "Sync"}</span>
            </Button>
          </div>

          {/* Render Uncropped Bento Topster (Albums or Artists) */}
          <BentoTopsterGrid
            type={bentoCategory}
            items={bentoCategory === "artists" ? bentoArtists : bentoAlbums}
            period={bentoPeriod}
            isLoading={bentoLoading}
            onSelectItem={(item, rank) => {
              if (bentoCategory === "artists") {
                setSelectedBentoArtist(item);
              } else {
                setSelectedBentoAlbum(item);
                setSelectedBentoRank(rank);
              }
            }}
          />
        </div>
      )}

      {/* MODE 2: QUILT STUDIO & CANVAS ARCHIVE */}
      {viewMode === "quilts" && (
        <div className="space-y-4">
          {/* Generator Box */}
          <div className="p-4 rounded-xl border border-border bg-surface-raised">
            <form onSubmit={handleGenerate} className="flex flex-wrap items-end gap-2.5">
              <div className="flex flex-col gap-1 min-w-[120px]">
                <label className="text-[10px] font-mono uppercase text-text-dim tracking-wider">
                  Period
                </label>
                <select
                  value={quiltPeriod}
                  onChange={(e) => setQuiltPeriod(e.target.value)}
                  className="px-2.5 py-1.5 rounded-md bg-surface-sunken border border-border text-xs text-text focus:outline-none focus:border-accent"
                >
                  {PERIODS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1 min-w-[120px]">
                <label className="text-[10px] font-mono uppercase text-text-dim tracking-wider">
                  Type
                </label>
                <select
                  value={quiltType}
                  onChange={(e) => setQuiltType(e.target.value)}
                  className="px-2.5 py-1.5 rounded-md bg-surface-sunken border border-border text-xs text-text focus:outline-none focus:border-accent"
                >
                  <option value="albums">Top Albums</option>
                  <option value="tracks">Top Tracks</option>
                </select>
              </div>

              <div className="flex flex-col gap-1 min-w-[120px]">
                <label className="text-[10px] font-mono uppercase text-text-dim tracking-wider">
                  Grid Size
                </label>
                <select
                  value={gridSize}
                  onChange={(e) => setGridSize(Number(e.target.value))}
                  className="px-2.5 py-1.5 rounded-md bg-surface-sunken border border-border text-xs text-text focus:outline-none focus:border-accent"
                >
                  {DIMENSION_PRESETS.map((preset) => (
                    <option key={preset.size} value={preset.size}>{preset.label}</option>
                  ))}
                </select>
              </div>

              <Button type="submit" variant="primary" size="sm" disabled={quiltLoading} className="h-[34px]">
                {quiltLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Generate</span>
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Folders Bar */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap gap-1.5 items-center">
              <button
                onClick={() => setActiveFolder("all")}
                className={cn(
                  "px-3 py-1 rounded text-xs font-heading font-medium cursor-pointer transition-all",
                  activeFolder === "all"
                    ? "bg-accent text-accent-text font-bold shadow-1"
                    : "text-text-muted hover:text-text hover:bg-surface-raised"
                )}
              >
                All ({safeQuilts.length})
              </button>

              {(Array.isArray(folders) ? folders : []).map((folder) => {
                const count = safeQuilts.filter((q) => q && safeQuiltFolders[q.id] === folder).length;
                const isActive = activeFolder === folder;
                return (
                  <button
                    key={folder}
                    onClick={() => setActiveFolder(folder)}
                    className={cn(
                      "px-3 py-1 rounded text-xs font-heading font-medium cursor-pointer transition-all flex items-center gap-1.5",
                      isActive
                        ? "bg-accent text-accent-text font-bold shadow-1"
                        : "text-text-muted hover:text-text hover:bg-surface-raised"
                    )}
                  >
                    <Folder className="w-3.5 h-3.5" />
                    <span>{folder} ({count})</span>
                  </button>
                );
              })}

              <button
                onClick={() => setActiveFolder("unassigned")}
                className={cn(
                  "px-3 py-1 rounded text-xs font-heading font-medium cursor-pointer transition-all",
                  activeFolder === "unassigned"
                    ? "bg-accent text-accent-text font-bold shadow-1"
                    : "text-text-muted hover:text-text hover:bg-surface-raised"
                )}
              >
                Unassigned
              </button>

              <button
                onClick={() => setShowFolderModal(true)}
                className="px-2.5 py-1 rounded text-xs border border-dashed border-border text-text-dim hover:text-text flex items-center gap-1 cursor-pointer hover:border-accent transition-all"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>New</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowFolderModal(true)}
              className="text-xs text-text-muted hover:text-accent font-medium flex items-center gap-1"
            >
              <Settings className="w-3 h-3" />
              <span>Manage</span>
            </button>
          </div>

          {/* Canvas Quilts Grid */}
          {filteredQuilts.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface-raised p-8 text-center">
              <div className="w-10 h-10 rounded-full bg-surface-sunken border border-border flex items-center justify-center mx-auto mb-2 text-text-dim">
                <Layers className="w-5 h-5 stroke-[1.75]" />
              </div>
              <h3 className="font-heading font-bold text-sm text-text mb-1">No quilts in this folder</h3>
              <p className="font-sans text-xs text-text-muted max-w-xs mx-auto">
                Generate a new quilt canvas above to build your collection.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredQuilts.map((quilt) => {
                const assigned = quiltFolders[quilt.id];
                return (
                  <div
                    key={quilt.id}
                    onClick={() => setActiveLightboxQuilt(quilt)}
                    className="group rounded-lg overflow-hidden border border-border bg-surface-raised hover:border-border-hover transition-all cursor-pointer flex flex-col shadow-1"
                  >
                    <div className="relative aspect-square overflow-hidden bg-surface-sunken">
                      <img
                        src={quilt.image_url}
                        alt={`Quilt ${quilt.id}`}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>

                    <div className="p-2 flex items-center justify-between gap-1 border-t border-border">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-text capitalize truncate">
                          {quilt.quilt_type} &middot; {quilt.period}
                        </div>
                        {assigned && (
                          <span className="font-mono text-[9px] text-accent truncate block">
                            {assigned}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => handleDownloadQuick(quilt, e)}
                          title="Download"
                          className="w-7 h-7 rounded flex items-center justify-center text-text-muted hover:text-text hover:bg-surface border border-border"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm("Delete this quilt?")) {
                              handleDeleteQuilt(quilt.id);
                            }
                          }}
                          title="Delete"
                          className="w-7 h-7 rounded flex items-center justify-center text-danger hover:bg-danger/10 border border-border"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Modals */}
      {selectedBentoAlbum && (
        <AlbumDetailModal
          album={selectedBentoAlbum}
          rank={selectedBentoRank}
          onClose={() => setSelectedBentoAlbum(null)}
        />
      )}

      {selectedBentoArtist && (
        <ArtistModal
          artist={selectedBentoArtist}
          onClose={() => setSelectedBentoArtist(null)}
        />
      )}

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