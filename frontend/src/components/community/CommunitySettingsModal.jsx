import { useState, useEffect, useRef } from "react";
import {
  X,
  Upload,
  Camera,
  Image as ImageIcon,
  Palette,
  FileText,
  ShieldAlert,
  Plus,
  Trash2,
  Loader2,
  Check,
  Disc,
  Mic,
  Radio,
  Sliders,
  Sparkles,
  Music,
} from "lucide-react";
import {
  updateTag,
  uploadTagBanner,
  uploadTagIcon,
  resolveImageUrl,
} from "../../api/client";
import { useToast } from "../Toast";

const COLOR_PRESETS = [
  { name: "Electric Lime", value: "#C7F43D" },
  { name: "Sky Cyan", value: "#38BDF8" },
  { name: "Amber Glow", value: "#F59E0B" },
  { name: "Velvet Rose", value: "#F43F5E" },
  { name: "Neon Violet", value: "#A855F7" },
  { name: "Emerald", value: "#10B981" },
  { name: "Silver Chrome", value: "#94A3B8" },
];

const EDITORIAL_BANNERS = [
  { label: "Gig Flyer", url: "/assets/editorial/gig-flyer.svg" },
  { label: "Vinyl Desk", url: "/assets/editorial/vinyl-desk.svg" },
  { label: "Topster Nine", url: "/assets/editorial/topster-nine.svg" },
  { label: "Ambient Space", url: "/assets/editorial/ambient.svg" },
  { label: "Tape Loop", url: "/assets/editorial/lofi-tape.svg" },
  { label: "Industrial", url: "/assets/editorial/industrial.svg" },
];

export default function CommunitySettingsModal({
  isOpen,
  onClose,
  tag,
  user,
  onSuccess,
}) {
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState("appearance"); // "appearance" | "about" | "rules"
  const [description, setDescription] = useState("");
  const [themeColor, setThemeColor] = useState("#C7F43D");
  const [rules, setRules] = useState([]);
  const [newRuleText, setNewRuleText] = useState("");

  // Banner states
  const [bannerUrl, setBannerUrl] = useState("");
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState("");
  const [bannerInputUrl, setBannerInputUrl] = useState("");

  // Icon states
  const [iconUrl, setIconUrl] = useState("");
  const [iconFile, setIconFile] = useState(null);
  const [iconPreview, setIconPreview] = useState("");
  const [iconInputUrl, setIconInputUrl] = useState("");

  const [saving, setSaving] = useState(false);
  const bannerFileInputRef = useRef(null);
  const iconFileInputRef = useRef(null);

  // Initialize form with tag data
  useEffect(() => {
    if (tag && isOpen) {
      setDescription(tag.description || "");
      setThemeColor(tag.theme_color || "#C7F43D");
      setBannerUrl(tag.banner_url || "");
      setBannerPreview(tag.banner_url ? resolveImageUrl(tag.banner_url) : "");
      setIconUrl(tag.icon_url || "");
      setIconPreview(tag.icon_url ? resolveImageUrl(tag.icon_url) : "");

      // Parse rules
      const rList = (tag.rules || "")
        .split("\n")
        .map((r) => r.trim())
        .filter(Boolean)
        .map((r) => r.replace(/^\d+[\.\)]\s*/, ""));
      setRules(rList);
      setBannerFile(null);
      setIconFile(null);
      setBannerInputUrl("");
      setIconInputUrl("");
    }
  }, [tag, isOpen]);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && isOpen && !saving) {
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
  }, [isOpen, saving, onClose]);

  if (!isOpen || !tag) return null;

  function handleBannerFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      addToast("Banner must be smaller than 10MB", "error");
      return;
    }
    setBannerFile(file);
    const objectUrl = URL.createObjectURL(file);
    setBannerPreview(objectUrl);
  }

  function handleIconFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      addToast("Icon must be smaller than 5MB", "error");
      return;
    }
    setIconFile(file);
    const objectUrl = URL.createObjectURL(file);
    setIconPreview(objectUrl);
  }

  function handleAddRule(e) {
    e?.preventDefault();
    const trimmed = newRuleText.trim();
    if (!trimmed) return;
    setRules((prev) => [...prev, trimmed]);
    setNewRuleText("");
  }

  function handleRemoveRule(index) {
    setRules((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setSaving(true);
    try {
      let finalBannerUrl = bannerUrl;
      let finalIconUrl = iconUrl;

      // 1. Upload Banner File if provided
      if (bannerFile) {
        const res = await uploadTagBanner(tag.id, bannerFile);
        finalBannerUrl = res.banner_url;
      } else if (bannerInputUrl.trim()) {
        finalBannerUrl = bannerInputUrl.trim();
      }

      // 2. Upload Icon File if provided
      if (iconFile) {
        const res = await uploadTagIcon(tag.id, iconFile);
        finalIconUrl = res.icon_url;
      } else if (iconInputUrl.trim()) {
        finalIconUrl = iconInputUrl.trim();
      }

      // 3. Format rules text
      const rulesString = rules
        .map((r, i) => `${i + 1}. ${r}`)
        .join("\n");

      // 4. Update community details
      const updated = await updateTag(tag.id, {
        description: description.trim(),
        rules: rulesString,
        theme_color: themeColor,
        banner_url: finalBannerUrl,
        icon_url: finalIconUrl,
      });

      addToast(`c/${tag.name} settings updated successfully!`);
      if (onSuccess) onSuccess(updated);
      onClose();
    } catch (err) {
      addToast(err.message || "Failed to save community settings", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="community-settings-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] bg-surface-raised border border-border rounded-xl shadow-4 flex flex-col overflow-hidden text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border bg-surface shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-black font-bold text-xs shrink-0"
              style={{ backgroundColor: themeColor }}
            >
              c/
            </div>
            <div>
              <h2
                id="community-settings-title"
                className="font-heading font-black text-base sm:text-lg text-text uppercase tracking-tight m-0"
              >
                Customize c/{tag.name}
              </h2>
              <span className="font-mono text-[10px] text-accent uppercase tracking-wider font-semibold">
                Creator &amp; Moderator Studio
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="p-1.5 rounded-md text-text-dim hover:text-text hover:bg-surface-raised transition-colors cursor-pointer"
            aria-label="Close customization studio"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-4 sm:px-5 border-b border-border bg-surface/50 shrink-0">
          {[
            { id: "appearance", label: "Appearance & Banner", icon: Palette },
            { id: "about", label: "About & Manifesto", icon: FileText },
            { id: "rules", label: "Rules & Etiquette", icon: ShieldAlert },
          ].map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 py-3 px-3 font-heading font-bold text-xs uppercase tracking-wider transition-all border-b-2 -mb-px cursor-pointer ${
                  active
                    ? "border-accent text-accent"
                    : "border-transparent text-text-dim hover:text-text"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: APPEARANCE */}
          {activeTab === "appearance" && (
            <div className="space-y-6">
              {/* Live Preview Box */}
              <div className="space-y-1.5">
                <span className="font-mono text-[10px] uppercase tracking-wider text-text-dim font-bold block">
                  Live Banner Preview
                </span>
                <div className="relative w-full h-32 rounded-lg overflow-hidden border border-border bg-surface-sunken flex items-end p-3">
                  {bannerPreview ? (
                    <img
                      src={bannerPreview}
                      alt="Banner preview"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="absolute inset-0"
                      style={{
                        background: `radial-gradient(ellipse at 70% 30%, ${themeColor}33 0%, rgba(10, 11, 10, 0.95) 75%),
                                     linear-gradient(135deg, #0e100f 0%, #151816 100%)`,
                      }}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent pointer-events-none" />

                  {/* Icon & Title Overlay */}
                  <div className="relative z-10 flex items-center gap-2.5">
                    <div
                      className="w-12 h-12 rounded-xl bg-surface-sunken border-2 overflow-hidden shadow-2 flex items-center justify-center shrink-0"
                      style={{ borderColor: themeColor }}
                    >
                      {iconPreview ? (
                        <img src={iconPreview} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Disc className="w-6 h-6" style={{ color: themeColor }} />
                      )}
                    </div>
                    <div>
                      <div className="font-heading font-black text-sm text-white uppercase drop-shadow">
                        c/{tag.name}
                      </div>
                      <div className="font-mono text-[9px] text-text-dim uppercase">
                        {themeColor} theme
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Banner Upload / Choice */}
              <div className="space-y-2">
                <label className="font-heading font-bold text-xs text-text uppercase tracking-wider block">
                  Community Banner (Max 10MB)
                </label>
                <input
                  ref={bannerFileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handleBannerFileChange}
                  className="hidden"
                />

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => bannerFileInputRef.current?.click()}
                    className="h-8 px-3 rounded-md bg-surface-sunken hover:bg-surface border border-border text-xs font-mono text-text flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5 text-accent" />
                    <span>Upload Banner Image</span>
                  </button>

                  <span className="font-mono text-2xs text-text-dim">or</span>

                  <input
                    type="url"
                    placeholder="Paste direct banner image URL..."
                    value={bannerInputUrl}
                    onChange={(e) => {
                      setBannerInputUrl(e.target.value);
                      if (e.target.value.trim()) {
                        setBannerPreview(e.target.value.trim());
                        setBannerUrl(e.target.value.trim());
                        setBannerFile(null);
                      }
                    }}
                    className="flex-1 min-w-[200px] h-8 px-2.5 rounded-md bg-surface-sunken border border-border font-mono text-xs text-text placeholder:text-text-dim outline-none focus:border-accent"
                  />
                </div>

                {/* Preset Editorial Banners */}
                <div className="pt-2">
                  <span className="font-mono text-[10px] text-text-dim block mb-1.5">
                    Or select an editorial preset:
                  </span>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                    {EDITORIAL_BANNERS.map((preset) => (
                      <button
                        key={preset.url}
                        type="button"
                        onClick={() => {
                          setBannerUrl(preset.url);
                          setBannerPreview(preset.url);
                          setBannerFile(null);
                          setBannerInputUrl("");
                        }}
                        className={`p-1 rounded border text-[10px] font-mono truncate transition-all cursor-pointer ${
                          bannerPreview === preset.url
                            ? "border-accent bg-accent/10 text-accent font-bold"
                            : "border-border bg-surface-sunken text-text-dim hover:text-text"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Community Icon Upload */}
              <div className="space-y-2 pt-2 border-t border-border">
                <label className="font-heading font-bold text-xs text-text uppercase tracking-wider block">
                  Community Avatar / Icon (Max 5MB)
                </label>
                <input
                  ref={iconFileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handleIconFileChange}
                  className="hidden"
                />

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => iconFileInputRef.current?.click()}
                    className="h-8 px-3 rounded-md bg-surface-sunken hover:bg-surface border border-border text-xs font-mono text-text flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5 text-accent" />
                    <span>Upload Custom Avatar</span>
                  </button>

                  <span className="font-mono text-2xs text-text-dim">or</span>

                  <input
                    type="url"
                    placeholder="Paste direct icon URL..."
                    value={iconInputUrl}
                    onChange={(e) => {
                      setIconInputUrl(e.target.value);
                      if (e.target.value.trim()) {
                        setIconPreview(e.target.value.trim());
                        setIconUrl(e.target.value.trim());
                        setIconFile(null);
                      }
                    }}
                    className="flex-1 min-w-[200px] h-8 px-2.5 rounded-md bg-surface-sunken border border-border font-mono text-xs text-text placeholder:text-text-dim outline-none focus:border-accent"
                  />
                </div>
              </div>

              {/* Theme Color Picker */}
              <div className="space-y-2 pt-2 border-t border-border">
                <label className="font-heading font-bold text-xs text-text uppercase tracking-wider block">
                  Scene Accent Tone
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {COLOR_PRESETS.map((color) => {
                    const isSelected = themeColor.toLowerCase() === color.value.toLowerCase();
                    return (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setThemeColor(color.value)}
                        className={`flex items-center gap-1.5 h-8 px-2.5 rounded-md border text-xs font-mono transition-all cursor-pointer ${
                          isSelected
                            ? "border-white bg-surface-sunken text-white shadow-1 ring-1 ring-white/50"
                            : "border-border bg-surface-sunken text-text-dim hover:text-text"
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/40"
                          style={{ backgroundColor: color.value }}
                        />
                        <span>{color.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ABOUT & MANIFESTO */}
          {activeTab === "about" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="community-desc"
                  className="font-heading font-bold text-xs text-text uppercase tracking-wider block"
                >
                  Community Manifesto / "About" Statement
                </label>
                <textarea
                  id="community-desc"
                  rows={5}
                  placeholder="What is this scene about? Describe the sound, essential records, vibe, or listening philosophy..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 rounded-md bg-surface-sunken border border-border text-xs sm:text-sm font-sans text-text placeholder:text-text-dim outline-none focus:border-accent resize-none"
                />
                <span className="font-mono text-2xs text-text-dim block text-right">
                  {description.length} characters
                </span>
              </div>
            </div>
          )}

          {/* TAB 3: RULES & ETIQUETTE */}
          {activeTab === "rules" && (
            <div className="space-y-4">
              <div>
                <label className="font-heading font-bold text-xs text-text uppercase tracking-wider block">
                  Community Guidelines &amp; Rules
                </label>
                <p className="font-sans text-xs text-text-muted mt-0.5">
                  Set ground rules for record recommendations, master fidelity, and respectful discussion.
                </p>
              </div>

              {/* Add rule input */}
              <form onSubmit={handleAddRule} className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Always cite album release year or record label..."
                  value={newRuleText}
                  onChange={(e) => setNewRuleText(e.target.value)}
                  className="flex-1 h-9 px-3 rounded-md bg-surface-sunken border border-border text-xs text-text placeholder:text-text-dim outline-none focus:border-accent"
                />
                <button
                  type="submit"
                  disabled={!newRuleText.trim()}
                  className="h-9 px-3.5 rounded-md bg-accent text-black hover:bg-accent-hover font-heading font-bold text-xs tracking-tight transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Add Rule</span>
                </button>
              </form>

              {/* Rules List */}
              <div className="space-y-2 pt-2">
                {rules.length === 0 ? (
                  <p className="font-mono text-xs text-text-dim italic">
                    No custom rules configured yet. Standard music platform etiquette applies.
                  </p>
                ) : (
                  rules.map((rule, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-md bg-surface-sunken border border-border group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-5 h-5 rounded-full font-mono text-[10px] font-bold flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: `${themeColor}25`,
                            color: themeColor,
                          }}
                        >
                          {idx + 1}
                        </span>
                        <span className="font-sans text-xs text-text leading-snug">
                          {rule}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveRule(idx)}
                        className="p-1 rounded text-text-dim hover:text-danger hover:bg-surface transition-colors cursor-pointer shrink-0"
                        title="Remove rule"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-t border-border bg-surface shrink-0">
          <span className="font-mono text-[11px] text-text-dim">
            Curated by <span className="text-text font-semibold">@{user?.username || "you"}</span>
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="h-9 px-4 rounded-md border border-border hover:bg-surface-raised font-mono text-xs text-text transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="h-9 px-5 rounded-md bg-accent text-black hover:bg-accent-hover hover:text-black font-heading font-bold text-xs tracking-tight transition-all active:translate-y-px disabled:opacity-50 cursor-pointer shadow-1 flex items-center gap-1.5"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Save Scene</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
