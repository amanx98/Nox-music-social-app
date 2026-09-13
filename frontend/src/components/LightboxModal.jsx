import { useState } from "react";
import { useToast } from "./Toast";

export default function LightboxModal({
  quilt,
  folders = [],
  quiltFolders = {},
  onClose,
  onDelete,
  onAssignFolder,
}) {
  const { addToast } = useToast();
  const [selectedFolder, setSelectedFolder] = useState(quiltFolders[quilt.id] || "");

  if (!quilt) return null;

  function handleDownload() {
    fetch(quilt.image_url)
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `nox-quilt-${quilt.period}-${quilt.quilt_type}-${quilt.id}.png`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        addToast("Quilt downloaded!");
      })
      .catch(() => {
        window.open(quilt.image_url, "_blank");
      });
  }

  function handleFolderChange(e) {
    const folder = e.target.value;
    setSelectedFolder(folder);
    onAssignFolder(quilt.id, folder);
    addToast(folder ? `Added to "${folder}"` : "Removed from folders");
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        style={{ maxWidth: "680px", textAlign: "center" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ textAlign: "left" }}>
            <h3 style={{ margin: 0, textTransform: "uppercase" }}>
              {quilt.quilt_type === "tracks" ? "Top Tracks Quilt" : "Album Quilt"}
            </h3>
            <span className="meta" style={{ color: "var(--mustard)" }}>
              {quilt.period} &middot; {new Date(quilt.created_at).toLocaleDateString()}
            </span>
          </div>
          <button className="btn-ghost" onClick={onClose} style={{ fontSize: "20px", padding: "4px 8px" }}>
            ✕
          </button>
        </div>

        <div style={{ background: "#0d0c0a", padding: "12px", borderRadius: "8px", marginBottom: "18px" }}>
          <img
            src={quilt.image_url}
            alt="Quilt preview"
            style={{
              maxHeight: "65vh",
              maxWidth: "100%",
              objectFit: "contain",
              borderRadius: "4px",
              boxShadow: "0 8px 30px rgba(0,0,0,0.6)",
            }}
          />
        </div>

        {/* Controls row */}
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="meta" style={{ fontSize: "11px" }}>CRATE / FOLDER:</span>
            <select
              value={selectedFolder}
              onChange={handleFolderChange}
              style={{ padding: "6px 12px", fontSize: "13px" }}
            >
              <option value="">(No folder)</option>
              {folders.map((f) => (
                <option key={f} value={f}>
                  📁 {f}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button className="btn-secondary" onClick={handleDownload}>
              ⬇ Download PNG
            </button>
            <button
              className="btn-danger"
              onClick={() => {
                if (window.confirm("Are you sure you want to delete this quilt?")) {
                  onDelete(quilt.id);
                  onClose();
                }
              }}
            >
              🗑 Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
