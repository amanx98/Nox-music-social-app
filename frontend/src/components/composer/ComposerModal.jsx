import { useState, useEffect, useRef } from "react";
import { X, MessageSquare, Music, LayoutGrid, AlertCircle, Loader2 } from "lucide-react";
import { createThread, getTags } from "../../api/client";
import { useToast } from "../Toast";
import Avatar from "../Avatar";

const POST_TYPES = [
  { id: "discussion", label: "Discussion", icon: MessageSquare, prefix: "[DISCUSSION]" },
  { id: "track", label: "Track", icon: Music, prefix: "[TRACK]" },
  { id: "topster", label: "Topster", icon: LayoutGrid, prefix: "[TOPSTER]" },
];

const MAX_CHARS = 2000;

export default function ComposerModal({ isOpen, onClose, user, onSuccess, defaultTagId = null }) {
  const { addToast } = useToast();

  const [postType, setPostType] = useState("discussion");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [trackRef, setTrackRef] = useState("");
  const [selectedTagId, setSelectedTagId] = useState(defaultTagId || "");
  const [tags, setTags] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const modalRef = useRef(null);
  const titleInputRef = useRef(null);

  // Load available tags
  useEffect(() => {
    if (isOpen) {
      getTags()
        .then((data) => {
          const list = data || [];
          setTags(list);
          if (!selectedTagId && list.length > 0) {
            setSelectedTagId(defaultTagId || list[0].id);
          }
        })
        .catch(() => {});
      setTimeout(() => titleInputRef.current?.focus(), 50);
    }
  }, [isOpen, defaultTagId, selectedTagId]);

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

  if (!isOpen) return null;

  async function handleTransmit(e) {
    e.preventDefault();
    setErrorMessage(null);

    const cleanTitle = title.trim();
    const cleanBody = body.trim();

    if (!cleanTitle) {
      setErrorMessage("Please provide a title for your discussion.");
      return;
    }
    if (!cleanBody) {
      setErrorMessage("Please enter content for this discussion.");
      return;
    }

    const tagIdToUse = selectedTagId || (tags[0]?.id ?? 1);
    const selectedTypeObj = POST_TYPES.find((p) => p.id === postType);
    
    let formattedBody = cleanBody;
    if (postType === "track" && trackRef.trim()) {
      formattedBody = `${selectedTypeObj?.prefix} Track Reference: ${trackRef.trim()}\n\n${cleanBody}`;
    } else if (selectedTypeObj?.prefix) {
      formattedBody = `${selectedTypeObj.prefix} ${cleanBody}`;
    }

    setSubmitting(true);
    try {
      const created = await createThread(tagIdToUse, cleanTitle, formattedBody);
      addToast("Transmission broadcast to community feed");
      // Reset form only on success
      setTitle("");
      setBody("");
      setTrackRef("");
      setErrorMessage(null);
      onSuccess?.(created);
      onClose();
    } catch (err) {
      // Preserve draft and show actionable error
      setErrorMessage(err.message || "Failed to transmit post. Your draft has been preserved.");
    } finally {
      setSubmitting(false);
    }
  }

  const charCount = body.length;
  const isOverLimit = charCount > MAX_CHARS;
  const isReady = title.trim().length > 0 && body.trim().length > 0 && !isOverLimit && !submitting;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="composer-modal-title"
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="w-full max-w-lg rounded-md bg-surface-raised border border-border p-5 sm:p-6 shadow-5 text-left flex flex-col gap-4 animate-slide-up relative"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div>
            <div className="font-mono text-[9px] uppercase tracking-widest text-accent font-bold">
              TRANSMIT RECORD // NEW BROADCAST
            </div>
            <h2 id="composer-modal-title" className="font-heading font-extrabold text-lg text-text m-0">
              Start a discussion
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close composer"
            className="w-7 h-7 rounded flex items-center justify-center text-text-dim hover:text-text hover:bg-surface border border-transparent hover:border-border transition-colors cursor-pointer disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Callout (Preserves draft) */}
        {errorMessage && (
          <div className="p-3 rounded-md bg-danger-muted/30 border border-danger text-rose-200 text-xs flex items-start gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
            <div className="flex-1 leading-snug">{errorMessage}</div>
          </div>
        )}

        {/* Post Type Selector Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-md bg-surface-sunken border border-border">
          {POST_TYPES.map((type) => {
            const Icon = type.icon;
            const active = postType === type.id;
            return (
              <button
                key={type.id}
                type="button"
                onClick={() => setPostType(type.id)}
                className={`flex-1 h-8 rounded text-xs font-heading font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  active
                    ? "bg-accent text-accent-text font-bold shadow-1"
                    : "text-text-muted hover:text-text hover:bg-surface-raised"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{type.label}</span>
              </button>
            );
          })}
        </div>

        {/* Form Body */}
        <form onSubmit={handleTransmit} className="flex flex-col gap-3">
          {/* User & Tag Row */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Avatar username={user?.username || "me"} size={26} />
              <span className="font-mono text-xs text-text-muted">
                as <span className="text-accent font-semibold">@{user?.username || "you"}</span>
              </span>
            </div>

            {/* Community/Tag Selector */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="composer-tag" className="font-mono text-[10px] uppercase text-text-dim">
                Community:
              </label>
              <select
                id="composer-tag"
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
            <label htmlFor="composer-title" className="sr-only">
              Discussion Title
            </label>
            <input
              id="composer-title"
              ref={titleInputRef}
              type="text"
              placeholder={
                postType === "track"
                  ? "Track Spotlight: Artist — Track Title"
                  : postType === "topster"
                  ? "Topster Take: 9 Albums Defining..."
                  : "Headline / Discussion topic..."
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={submitting}
              required
              className="w-full h-10 px-3 rounded-md bg-surface-sunken border border-border text-sm font-heading font-bold text-text placeholder:text-text-dim focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
            />
          </div>

          {/* Extra Reference Input for Track/Topster */}
          {postType === "track" && (
            <div className="space-y-1">
              <input
                type="text"
                placeholder="Track / Album reference (e.g. Boards of Canada — Music Is Math)"
                value={trackRef}
                onChange={(e) => setTrackRef(e.target.value)}
                disabled={submitting}
                className="w-full h-8 px-3 rounded-md bg-surface-sunken border border-border font-mono text-xs text-text placeholder:text-text-dim focus:border-accent outline-none"
              />
            </div>
          )}

          {/* Body Textarea */}
          <div className="space-y-1">
            <label htmlFor="composer-body" className="sr-only">
              Discussion Content
            </label>
            <textarea
              id="composer-body"
              rows={4}
              placeholder="What are your arguments, record notes, or sound observations?"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={submitting}
              required
              className="w-full p-3 rounded-md bg-surface-sunken border border-border text-xs sm:text-sm font-sans text-text placeholder:text-text-dim focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors resize-y min-h-[100px]"
            />
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
                className="h-8 px-4 rounded-md bg-accent text-accent-text hover:bg-accent-hover font-heading font-bold text-xs tracking-tight transition-all active:translate-y-px disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5 shadow-1"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Transmitting...</span>
                  </>
                ) : (
                  <span>Transmit</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
