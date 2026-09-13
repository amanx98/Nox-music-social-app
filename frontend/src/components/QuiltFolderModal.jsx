import { useState } from "react";
import { useToast } from "./Toast";

export default function QuiltFolderModal({
  folders = [],
  onClose,
  onCreateFolder,
  onDeleteFolder,
}) {
  const { addToast } = useToast();
  const [folderName, setFolderName] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = folderName.trim();
    if (!trimmed) return;
    if (folders.includes(trimmed)) {
      addToast("A folder with this name already exists");
      return;
    }
    onCreateFolder(trimmed);
    setFolderName("");
    addToast(`Created folder "${trimmed}"`);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
          <h2 style={{ margin: 0 }}>Manage Quilt Crates</h2>
          <button className="btn-ghost" onClick={onClose} style={{ fontSize: "20px", padding: "4px 8px" }}>
            ✕
          </button>
        </div>

        <p style={{ fontSize: "14px", color: "var(--cream-text-dim)", marginBottom: "20px" }}>
          Organize your album and track quilts into custom collections or listening eras.
        </p>

        {/* Create new folder form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
          <input
            type="text"
            placeholder="New crate name (e.g. 2024 Heavy Rotation)"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn-primary">
            + Add Crate
          </button>
        </form>

        {/* List of existing folders */}
        <div style={{ maxHeight: "240px", overflowY: "auto" }}>
          {folders.length === 0 ? (
            <p className="meta" style={{ textAlign: "center", padding: "20px 0" }}>
              No custom crates created yet.
            </p>
          ) : (
            folders.map((folder) => (
              <div
                key={folder}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 14px",
                  background: "var(--bg-subtle)",
                  borderRadius: "6px",
                  marginBottom: "8px",
                }}
              >
                <span style={{ fontWeight: 600, fontSize: "14px" }}>📁 {folder}</span>
                <button
                  className="btn-danger"
                  style={{ padding: "4px 10px", fontSize: "11px" }}
                  onClick={() => {
                    if (window.confirm(`Delete crate "${folder}"? (Quilts inside won't be deleted)`)) {
                      onDeleteFolder(folder);
                      addToast(`Deleted crate "${folder}"`);
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
