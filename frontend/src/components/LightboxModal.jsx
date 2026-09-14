import { useState } from "react";
import { X, Download, Trash2, Folder } from "lucide-react";
import { useToast } from "./Toast";
import Button from "./ui/Button";

export default function LightboxModal({
  quilt,
  folders = [],
  quiltFolders = {},
  onClose,
  onDelete,
  onAssignFolder,
}) {
  const { addToast } = useToast();
  const [selectedFolder, setSelectedFolder] = useState(quiltFolders[quilt?.id] || "");

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
        addToast("Quilt downloaded");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-xl border border-border bg-surface-raised p-5 shadow-5 text-left animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center pb-3 border-b border-border mb-4">
          <div>
            <h3 className="font-heading font-bold text-base text-text capitalize">
              {quilt.quilt_type === "tracks" ? "Top Tracks Quilt" : "Album Quilt"}
            </h3>
            <span className="font-mono text-2xs text-accent">
              {quilt.period} &middot; {new Date(quilt.created_at).toLocaleDateString()}
            </span>
          </div>
          <button
            type="button"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-text hover:bg-surface transition-colors"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-surface-sunken p-2.5 rounded-lg mb-4 flex items-center justify-center">
          <img
            src={quilt.image_url}
            alt="Quilt preview"
            className="max-h-[60vh] max-w-full object-contain rounded shadow-2"
          />
        </div>

        {/* Controls row */}
        <div className="flex flex-wrap justify-between items-center gap-3 pt-2">
          <div className="flex items-center gap-2">
            <Folder className="w-3.5 h-3.5 text-text-dim" />
            <select
              value={selectedFolder}
              onChange={handleFolderChange}
              className="px-2.5 py-1.5 rounded-md bg-surface border border-border font-mono text-xs text-text focus:outline-none focus:border-accent"
            >
              <option value="">No folder</option>
              {folders.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={handleDownload}>
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (window.confirm("Delete this quilt?")) {
                  onDelete(quilt.id);
                  onClose();
                }
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
