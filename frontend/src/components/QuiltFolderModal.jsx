import { useState } from "react";
import { X, Folder, Plus, Trash2 } from "lucide-react";
import { useToast } from "./Toast";
import Button from "./ui/Button";
import { Input } from "./ui/Input";

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
      addToast("A folder with this name already exists", "error");
      return;
    }
    onCreateFolder(trimmed);
    setFolderName("");
    addToast(`Created folder "${trimmed}"`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl border border-border bg-surface-raised p-5 shadow-5 text-left animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center pb-3 border-b border-border mb-4">
          <h2 className="font-heading font-bold text-base text-text">Manage Folders</h2>
          <button
            type="button"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-text hover:bg-surface transition-colors"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Create new folder form */}
        <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
          <Input
            type="text"
            placeholder="New folder name..."
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            className="flex-1 text-xs"
          />
          <Button type="submit" variant="primary" size="sm">
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </Button>
        </form>

        {/* List of existing folders */}
        <div className="max-h-60 overflow-y-auto space-y-1.5 divide-y divide-border/40">
          {folders.length === 0 ? (
            <p className="font-mono text-xs text-text-dim text-center py-6">
              No custom folders created yet.
            </p>
          ) : (
            folders.map((folder) => (
              <div
                key={folder}
                className="flex justify-between items-center py-2 px-1 text-xs"
              >
                <span className="font-medium text-text flex items-center gap-2">
                  <Folder className="w-3.5 h-3.5 text-text-dim" />
                  <span>{folder}</span>
                </span>
                <button
                  type="button"
                  className="w-7 h-7 rounded flex items-center justify-center text-text-dim hover:text-danger hover:bg-danger/10 transition-colors"
                  onClick={() => {
                    if (window.confirm(`Delete folder "${folder}"?`)) {
                      onDeleteFolder(folder);
                      addToast(`Deleted folder "${folder}"`);
                    }
                  }}
                  title="Delete folder"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
