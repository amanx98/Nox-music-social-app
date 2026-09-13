import { useState, useEffect } from "react";
import { generateQuilt, getQuilts, deleteQuilt } from "./api/client";
import { useToast } from "./components/Toast";
import LightboxModal from "./components/LightboxModal";
import QuiltFolderModal from "./components/QuiltFolderModal";

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
  const [quilts, setQuilts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("overall");
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
    loadQuilts();
  }, []);

  useEffect(() => {
    localStorage.setItem("nox_quilt_folders", JSON.stringify(folders));
  }, [folders]);

  useEffect(() => {
    localStorage.setItem("nox_quilt_assignments", JSON.stringify(quiltFolders));
  }, [quiltFolders]);

  async function loadQuilts() {
    try {
      const data = await getQuilts();
      setQuilts(data);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleGenerate(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await generateQuilt(period, quiltType, gridSize);
      await loadQuilts();
      addToast("Quilt generated successfully!");
    } catch (err) {
      setError(err.message);
      addToast(err.message || "Failed to generate quilt", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteQuilt(id) {
    try {
      await deleteQuilt(id);
      setQuilts((prev) => prev.filter((q) => q.id !== id));
      // remove from assignments
      setQuiltFolders((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      addToast("Quilt deleted");
    } catch {
      // Fallback optimistic delete
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

  // Filter quilts
  const filteredQuilts = quilts.filter((q) => {
    if (activeFolder === "all") return true;
    if (activeFolder === "unassigned") return !quiltFolders[q.id];
    return quiltFolders[q.id] === activeFolder;
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "16px" }}>
        <div>
          <h2>Album &amp; Track Quilts</h2>
          <p className="meta" style={{ margin: 0 }}>
            Generate high-res visual collages from your actual listening history.
          </p>
        </div>
      </div>

      {error && (
        <div style={{ padding: "12px 16px", background: "rgba(224, 109, 83, 0.15)", border: "1px solid var(--coral)", borderRadius: "var(--radius)", color: "#fca5a5", marginBottom: "16px" }}>
          {error}
        </div>
      )}

      {/* Quilt Generation Control Box */}
      <div className="card" style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <span style={{ fontSize: "20px" }}>🎛️</span>
          <h3 style={{ margin: 0 }}>Quilt Studio</h3>
        </div>

        <form onSubmit={handleGenerate} style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          {/* Period selector */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label className="meta" style={{ fontSize: "11px" }}>TIME WINDOW</label>
            <select value={period} onChange={(e) => setPeriod(e.target.value)}>
              {PERIODS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Type selector */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label className="meta" style={{ fontSize: "11px" }}>MEDIA TYPE</label>
            <select value={quiltType} onChange={(e) => setQuiltType(e.target.value)}>
              <option value="albums">Top Albums</option>
              <option value="tracks">Top Tracks</option>
            </select>
          </div>

          {/* Grid Size / Dimensions */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label className="meta" style={{ fontSize: "11px" }}>GRID DIMENSIONS</label>
            <select value={gridSize} onChange={(e) => setGridSize(Number(e.target.value))}>
              {DIMENSION_PRESETS.map((preset) => (
                <option key={preset.size} value={preset.size}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ alignSelf: "flex-end" }}>
            <button type="submit" className="btn-primary" disabled={loading} style={{ height: "42px", padding: "0 22px" }}>
              {loading ? (
                <>
                  <span className="spin" style={{ display: "inline-block" }}>💿</span>
                  <span>Spinning Quilt...</span>
                </>
              ) : (
                <>
                  <span>✦</span>
                  <span>Generate Quilt</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Crates / Folders Bar */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <span className="meta" style={{ fontSize: "12px", color: "var(--cream-text)" }}>
            CRATES &amp; COLLECTIONS ({filteredQuilts.length})
          </span>
          <button
            className="btn-ghost"
            style={{ fontSize: "12px", padding: "4px 8px" }}
            onClick={() => setShowFolderModal(true)}
          >
            ⚙️ Manage Crates
          </button>
        </div>

        <div className="crate-bar">
          <button
            className={`crate-pill ${activeFolder === "all" ? "active" : ""}`}
            onClick={() => setActiveFolder("all")}
          >
            All Quilts ({quilts.length})
          </button>

          {folders.map((folder) => {
            const count = quilts.filter((q) => quiltFolders[q.id] === folder).length;
            return (
              <button
                key={folder}
                className={`crate-pill ${activeFolder === folder ? "active" : ""}`}
                onClick={() => setActiveFolder(folder)}
              >
                📁 {folder} ({count})
              </button>
            );
          })}

          <button
            className={`crate-pill ${activeFolder === "unassigned" ? "active" : ""}`}
            onClick={() => setActiveFolder("unassigned")}
          >
            Unassigned
          </button>

          <button
            className="crate-pill"
            style={{ borderStyle: "dashed" }}
            onClick={() => setShowFolderModal(true)}
          >
            + New Crate
          </button>
        </div>
      </div>

      {/* Quilt Grid */}
      {filteredQuilts.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: "36px", marginBottom: "12px" }}>🖼️</div>
          <h3 style={{ margin: 0, marginBottom: "6px" }}>No quilts in this crate</h3>
          <p className="meta">
            {quilts.length === 0
              ? "Generate your first album or track quilt above using your Last.fm data."
              : "Assign quilts to this folder by clicking on any quilt card."}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "22px" }}>
          {filteredQuilts.map((quilt) => {
            const assigned = quiltFolders[quilt.id];
            return (
              <div
                key={quilt.id}
                className="quilt-frame"
                style={{ cursor: "pointer" }}
                onClick={() => setActiveLightboxQuilt(quilt)}
              >
                <img src={quilt.image_url} alt={`Quilt ${quilt.id}`} />

                <div className="quilt-actions">
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "13px", textTransform: "capitalize", color: "var(--ink)" }}>
                      {quilt.quilt_type} &middot; {quilt.period}
                    </div>
                    {assigned && (
                      <span className="badge badge-mustard" style={{ marginTop: "4px", fontSize: "10px" }}>
                        📁 {assigned}
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: "4px" }} onClick={(e) => e.stopPropagation()}>
                    <button
                      className="btn-icon"
                      onClick={(e) => handleDownloadQuick(quilt, e)}
                      title="Download PNG"
                      style={{ padding: "5px 7px" }}
                    >
                      ⬇
                    </button>
                    <button
                      className="btn-icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm("Delete this quilt?")) {
                          handleDeleteQuilt(quilt.id);
                        }
                      }}
                      title="Delete Quilt"
                      style={{ padding: "5px 7px", color: "var(--coral)" }}
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

      {/* Lightbox Modal */}
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