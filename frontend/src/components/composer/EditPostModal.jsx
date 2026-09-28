import { useState, useEffect, useRef } from "react";
import {
  X,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  Video,
  Film,
  Link2,
  Save,
} from "lucide-react";
import { updateThread, uploadThreadMedia, getTags } from "../../api/client";
import { useToast } from "../Toast";
import Avatar from "../Avatar";
import GifPickerModal from "./GifPickerModal";

const MAX_CHARS = 2000;

export default function EditPostModal({ isOpen, onClose, thread, user, onSuccess }) {
  const { addToast } = useToast();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [selectedTagId, setSelectedTagId] = useState("");
  const [tags, setTags] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Media attachment states
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [mediaUrlInput, setMediaUrlInput] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [fileAccept, setFileAccept] = useState("image/*");
  const fileInputRef = useRef(null);

  const modalRef = useRef(null);
  const titleInputRef = useRef(null);
  const bodyTextareaRef = useRef(null);

  // Dynamically auto-fit textarea height to content and media presence
  useEffect(() => {
    const el = bodyTextareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const baseMin = mediaPreview ? 74 : 100;
    const target = Math.max(el.scrollHeight, baseMin);
    el.style.height = `${Math.min(target, 200)}px`;
  }, [body, mediaPreview]);

  // Prepopulate form when opened with thread
  useEffect(() => {
    if (isOpen && thread) {
      setTitle(thread.title || "");
      setBody(thread.body || "");
      setSelectedTagId(thread.tag_id || "");

      const currentImg = thread.image_url || "";
      setMediaUrl(currentImg);
      setMediaPreview(currentImg || null);
      setMediaType(thread.media_type || (currentImg ? "image" : null));
      setMediaUrlInput("");
      setShowUrlInput(false);
      setErrorMessage(null);

      getTags()
        .then((data) => setTags(data || []))
        .catch(() => {});

      setTimeout(() => titleInputRef.current?.focus(), 60);
    }
  }, [isOpen, thread]);

  // Escape key & click outside
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && isOpen && !submitting) {
        onClose();
      }
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, submitting, onClose]);

  if (!isOpen || !thread) return null;

  function triggerFileInput(type) {
    if (type === "video") {
      setFileAccept("video/mp4,video/webm,video/quicktime");
    } else if (type === "gif") {
      setFileAccept("image/gif");
    } else {
      setFileAccept("image/png,image/jpeg,image/webp,image/svg+xml");
    }
    setTimeout(() => fileInputRef.current?.click(), 10);
  }

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    let detectedType = "image";
    const name = file.name.toLowerCase();
    if (file.type.startsWith("video/") || name.endsWith(".mp4") || name.endsWith(".webm") || name.endsWith(".mov")) {
      detectedType = "video";
    } else if (file.type === "image/gif" || name.endsWith(".gif")) {
      detectedType = "gif";
    }

    setMediaType(detectedType);
    const localUrl = URL.createObjectURL(file);
    setMediaPreview(localUrl);
    setShowUrlInput(false);

    setUploadingMedia(true);
    try {
      const res = await uploadThreadMedia(file);
      setMediaUrl(res.url);
      setMediaType(res.media_type);
    } catch (err) {
      addToast(err.message || "Failed to upload file", "error");
      handleRemoveMedia();
    } finally {
      setUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleAttachUrl() {
    const trimmed = mediaUrlInput.trim();
    if (!trimmed) return;

    let detectedType = "image";
    const lower = trimmed.toLowerCase();
    if (lower.includes(".mp4") || lower.includes(".webm") || lower.includes(".mov")) {
      detectedType = "video";
    } else if (lower.includes(".gif") || lower.includes("giphy.com") || lower.includes("tenor.com")) {
      detectedType = "gif";
    }

    setMediaUrl(trimmed);
    setMediaPreview(trimmed);
    setMediaType(detectedType);
    setShowUrlInput(false);
  }

  function handleRemoveMedia() {
    setMediaUrl("");
    setMediaPreview(null);
    setMediaType(null);
    setMediaUrlInput("");
    setShowUrlInput(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSave(e) {
    e.preventDefault();
    setErrorMessage(null);

    const cleanTitle = title.trim();
    const cleanBody = body.trim();

    if (!cleanTitle) {
      setErrorMessage("Please provide a title for your post.");
      return;
    }
    if (!cleanBody) {
      setErrorMessage("Please enter content for this post.");
      return;
    }

    setSubmitting(true);
    try {
      const updated = await updateThread(thread.id, {
        title: cleanTitle,
        body: cleanBody,
        imageUrl: mediaUrl || "",
        mediaType: mediaType || "",
        tagId: selectedTagId ? Number(selectedTagId) : undefined,
      });

      addToast("Post updated successfully");
      onSuccess?.(updated);
      onClose();
    } catch (err) {
      setErrorMessage(err.message || "Failed to update post. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const charCount = body.length;
  const isOverLimit = charCount > MAX_CHARS;
  const isReady =
    title.trim().length > 0 &&
    body.trim().length > 0 &&
    !isOverLimit &&
    !submitting &&
    !uploadingMedia;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-post-modal-title"
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-surface-raised border border-border p-4 sm:p-5 shadow-5 text-left flex flex-col gap-3.5 animate-slide-up relative"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div>
            <div className="font-mono text-[9px] uppercase tracking-widest text-accent font-bold">
              POST EDITOR // UPDATE BROADCAST
            </div>
            <h2 id="edit-post-modal-title" className="font-heading font-extrabold text-lg text-text m-0">
              Edit discussion
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close edit modal"
            className="w-7 h-7 rounded flex items-center justify-center text-text-dim hover:text-text hover:bg-surface border border-transparent hover:border-border transition-colors cursor-pointer disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Callout */}
        {errorMessage && (
          <div className="p-3 rounded-md bg-danger-muted/30 border border-danger text-rose-200 text-xs flex items-start gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
            <div className="flex-1 leading-snug">{errorMessage}</div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          {/* User & Tag Row */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Avatar username={user?.username || "me"} src={user?.avatar_url} size={26} />
              <span className="font-mono text-xs text-text-muted">
                editing as <span className="text-accent font-semibold">@{user?.username || "you"}</span>
              </span>
            </div>

            {/* Tag / Community Selector */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="edit-tag" className="font-mono text-[10px] uppercase text-text-dim">
                Community:
              </label>
              <select
                id="edit-tag"
                value={selectedTagId}
                onChange={(e) => setSelectedTagId(Number(e.target.value))}
                disabled={submitting}
                className="h-7 px-2 rounded-md bg-surface-sunken border border-border font-mono text-xs text-text focus:border-accent focus:outline-none"
              >
                {tags.map((t) => (
                  <option key={t.id} value={t.id}>
                    #{t.name} ({t.type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Title Input */}
          <div className="space-y-1">
            <label htmlFor="edit-title" className="sr-only">
              Discussion Title
            </label>
            <input
              id="edit-title"
              ref={titleInputRef}
              type="text"
              placeholder="Headline / Discussion topic..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={submitting}
              required
              className="w-full h-10 px-3 rounded-md bg-surface-sunken border border-border text-sm font-heading font-bold text-text placeholder:text-text-dim focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
            />
          </div>

          {/* Body Textarea (Auto-fits content, adapts when media is attached) */}
          <div className="space-y-1">
            <label htmlFor="edit-body" className="sr-only">
              Discussion Content
            </label>
            <textarea
              id="edit-body"
              ref={bodyTextareaRef}
              rows={mediaPreview ? 2 : 4}
              placeholder="What are your arguments, record notes, or sound observations?"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={submitting}
              required
              className="w-full p-3 rounded-md bg-surface-sunken border border-border text-xs sm:text-sm font-sans text-text placeholder:text-text-dim focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all resize-none overflow-y-auto"
            />
          </div>

          {/* Media Attachment Preview (True Aspect Ratio, No Cropping into Landscape) */}
          {mediaPreview && (
            <div className="relative rounded-xl border border-border bg-surface-sunken/80 overflow-hidden group flex items-center justify-center max-h-60 sm:max-h-72 w-full">
              {/* Subtle ambient backdrop for letterboxed areas */}
              {mediaType !== "video" && (
                <div
                  className="absolute inset-0 bg-cover bg-center filter blur-xl opacity-20 scale-110 pointer-events-none"
                  style={{ backgroundImage: `url(${mediaPreview})` }}
                />
              )}
              {mediaType === "video" ? (
                <video
                  src={mediaPreview}
                  controls
                  className="max-h-60 sm:max-h-72 w-auto max-w-full object-contain bg-black rounded-lg"
                />
              ) : (
                <img
                  src={mediaPreview}
                  alt="Attached media preview"
                  className="relative z-10 max-h-60 sm:max-h-72 w-auto max-w-full object-contain mx-auto block"
                />
              )}

              {/* Type Badge */}
              <div className="absolute top-2 left-2 z-20 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-xs border border-white/10 font-mono text-[9px] uppercase tracking-wider text-accent font-bold shadow-sm">
                {mediaType || "media"}
              </div>

              {/* Remove Media Button */}
              <button
                type="button"
                onClick={handleRemoveMedia}
                disabled={submitting}
                className="absolute top-2 right-2 p-1 rounded-full bg-black/75 hover:bg-black text-text-dim hover:text-white border border-white/10 transition-colors cursor-pointer"
                title="Remove media"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              {/* Uploading Progress Overlay */}
              {uploadingMedia && (
                <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center gap-2 font-mono text-xs text-text">
                  <Loader2 className="w-4 h-4 animate-spin text-accent" />
                  <span>Uploading media...</span>
                </div>
              )}
            </div>
          )}

          {/* Media URL Input Box (if open) */}
          {showUrlInput && (
            <div className="flex items-center gap-2 p-2 rounded-md bg-surface-sunken border border-border">
              <input
                type="url"
                placeholder="Paste direct image, GIF, or video URL..."
                value={mediaUrlInput}
                onChange={(e) => setMediaUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAttachUrl();
                  }
                }}
                disabled={submitting}
                className="flex-1 h-8 px-2.5 rounded bg-surface border border-border font-mono text-xs text-text placeholder:text-text-dim focus:border-accent outline-none"
              />
              <button
                type="button"
                onClick={handleAttachUrl}
                disabled={!mediaUrlInput.trim() || submitting}
                className="h-8 px-3 rounded bg-accent text-black font-heading font-bold text-xs hover:bg-accent-hover transition-colors disabled:opacity-40 cursor-pointer"
              >
                Attach
              </button>
              <button
                type="button"
                onClick={() => setShowUrlInput(false)}
                className="h-8 px-2 text-text-dim hover:text-text text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Media Attachment Toolbar */}
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-1">
              <span className="font-mono text-[10px] uppercase text-text-dim mr-1">
                Attach:
              </span>

              {/* Photo Button */}
              <button
                type="button"
                onClick={() => triggerFileInput("photo")}
                disabled={submitting || uploadingMedia}
                title="Attach photo (.png, .jpg, .webp, .svg)"
                className="h-7 px-2.5 rounded flex items-center gap-1.5 text-xs font-mono text-text-muted hover:text-accent hover:bg-surface border border-border/60 hover:border-accent/40 transition-colors cursor-pointer disabled:opacity-40"
              >
                <ImageIcon className="w-3.5 h-3.5 text-accent" />
                <span>Photo</span>
              </button>

              {/* Video Button */}
              <button
                type="button"
                onClick={() => triggerFileInput("video")}
                disabled={submitting || uploadingMedia}
                title="Attach video (.mp4, .webm, .mov)"
                className="h-7 px-2.5 rounded flex items-center gap-1.5 text-xs font-mono text-text-muted hover:text-secondary hover:bg-surface border border-border/60 hover:border-secondary/40 transition-colors cursor-pointer disabled:opacity-40"
              >
                <Video className="w-3.5 h-3.5 text-secondary" />
                <span>Video</span>
              </button>

              {/* GIF Button (Online Search & Curated Picker) */}
              <button
                type="button"
                onClick={() => setShowGifPicker(true)}
                disabled={submitting || uploadingMedia}
                title="Search and attach online GIF (Twitter-style)"
                className="h-7 px-2.5 rounded flex items-center gap-1.5 text-xs font-mono text-text-muted hover:text-accent hover:bg-surface border border-border/60 hover:border-accent/40 transition-colors cursor-pointer disabled:opacity-40"
              >
                <Film className="w-3.5 h-3.5 text-accent" />
                <span>GIF</span>
              </button>

              {/* URL Link Button */}
              <button
                type="button"
                onClick={() => setShowUrlInput(!showUrlInput)}
                disabled={submitting || uploadingMedia}
                title="Attach media from URL"
                className={`h-7 px-2 rounded flex items-center gap-1 text-xs font-mono border transition-colors cursor-pointer disabled:opacity-40 ${
                  showUrlInput
                    ? "text-accent bg-accent/10 border-accent/40"
                    : "text-text-muted hover:text-text hover:bg-surface border-border/60"
                }`}
              >
                <Link2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Link</span>
              </button>

              {/* Hidden Native File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept={fileAccept}
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            {uploadingMedia && (
              <span className="flex items-center gap-1.5 font-mono text-2xs text-accent">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Uploading...</span>
              </span>
            )}
          </div>

          {/* Bottom Bar: Character Count + Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span
              className={`font-mono text-2xs ${
                isOverLimit ? "text-danger font-bold" : "text-text-dim"
              }`}
            >
              {charCount} / {MAX_CHARS} chars
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="h-8 px-3 rounded-md text-xs font-heading font-medium text-text-muted hover:text-text hover:bg-surface border border-transparent transition-colors cursor-pointer disabled:opacity-40"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={!isReady}
                className="h-8 px-4 rounded-md bg-accent text-black hover:bg-accent-hover hover:text-black font-heading font-bold text-xs tracking-tight transition-all active:translate-y-px disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5 shadow-1"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Online GIF Picker (Twitter/X style) */}
      <GifPickerModal
        isOpen={showGifPicker}
        onClose={() => setShowGifPicker(false)}
        onSelectGif={(gif) => {
          setMediaUrl(gif.url);
          setMediaPreview(gif.previewUrl || gif.url);
          setMediaType("gif");
          setShowUrlInput(false);
        }}
        onUploadLocal={() => triggerFileInput("gif")}
      />
    </div>
  );
}
