import { useState, useEffect } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import {
  User,
  LayoutGrid,
  BarChart2,
  Settings,
  Edit2,
  Check,
  Zap,
  CheckCircle2,
  XCircle,
  X,
  ArrowRight,
} from "lucide-react";
import QuiltGallery from "../QuiltGallery";
import TopAlbums from "../TopAlbums";
import TopArtists from "../TopArtists";
import ThemeSelector from "../components/ThemeSelector";
import Avatar from "../components/Avatar";
import { useToast } from "../components/Toast";
import Button from "../components/ui/Button";
import ErrorBoundary from "../components/ErrorBoundary";
import { cn } from "../lib/cn";

export default function ProfilePage({ user: propUser, initialTab = "overview" }) {
  const { addToast } = useToast();
  const outlet = useOutletContext?.() || {};
  const user = propUser || outlet.user || {};
  const userId = user?.id ?? "guest";
  const username = user?.username || "Listener";

  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(() => tabParam || initialTab || "overview");

  useEffect(() => {
    setActiveTab(tabParam || initialTab || "overview");
  }, [tabParam, initialTab]);

  function handleTabChange(tabKey) {
    setActiveTab(tabKey);
    if (tabKey === "overview") {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("tab");
      setSearchParams(nextParams, { replace: true });
    } else {
      setSearchParams({ tab: tabKey }, { replace: true });
    }
  }

  const [bio, setBio] = useState(() => {
    return localStorage.getItem(`nox_bio_${userId}`) || "Crate digger & vinyl enthusiast exploring soundscapes on Nox.";
  });
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState(bio);

  const [tags, setTags] = useState(() => {
    try {
      const saved = localStorage.getItem(`nox_tags_${userId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore corrupted data
    }
    return ["Shoegaze", "Post-Punk", "Ambient", "Jazz Fusion"];
  });
  const [newTag, setNewTag] = useState("");

  const [customAvatar, setCustomAvatar] = useState(() => {
    return localStorage.getItem(`nox_avatar_${userId}`) || "";
  });
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  const [lastfmConnected, setLastfmConnected] = useState(() => {
    return localStorage.getItem("lastfm_connected") === "true";
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("lastfm_success") === "true") {
      setLastfmConnected(true);
      localStorage.setItem("lastfm_connected", "true");
      addToast("Last.fm account connected");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [addToast]);

  function handleSaveBio() {
    setBio(bioInput);
    localStorage.setItem(`nox_bio_${userId}`, bioInput);
    setIsEditingBio(false);
    addToast("Bio updated");
  }

  function handleAddTag(e) {
    e.preventDefault();
    const trimmed = newTag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      const updated = [...tags, trimmed];
      setTags(updated);
      localStorage.setItem(`nox_tags_${userId}`, JSON.stringify(updated));
      setNewTag("");
    }
  }

  function handleRemoveTag(tagToRemove) {
    const updated = tags.filter((t) => t !== tagToRemove);
    setTags(updated);
    localStorage.setItem(`nox_tags_${userId}`, JSON.stringify(updated));
  }

  function handleSelectAvatar(char) {
    setCustomAvatar(char);
    localStorage.setItem(`nox_avatar_${userId}`, char);
    setShowAvatarPicker(false);
    addToast("Avatar icon updated");
  }

  function connectLastfm() {
    window.location.href = "http://localhost:8000/lastfm/login";
  }

  return (
    <div className="space-y-6 max-w-[960px] mx-auto w-full">
      {/* Profile Banner */}
      <div className="profile-banner rounded-2xl" />

      {/* Profile Header Card */}
      <div className="profile-header-card rounded-2xl border border-border bg-surface-raised p-5 sm:p-6 shadow-2">
        <div className="flex justify-between items-start flex-wrap gap-4">
          {/* Avatar and User Info */}
          <div className="flex gap-4 items-end">
            <div className="relative">
              <Avatar
                username={username}
                size={84}
                customIcon={customAvatar}
                onClick={() => setShowAvatarPicker(true)}
                className="cursor-pointer border-2 border-accent"
              />
              <button
                type="button"
                onClick={() => setShowAvatarPicker(true)}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-accent text-surface flex items-center justify-center shadow-2 border border-surface cursor-pointer hover:scale-105 transition-transform"
                title="Change avatar symbol"
                aria-label="Change avatar"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading font-black text-2xl text-white m-0">{username}</h1>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30">
                  Archivist
                </span>
              </div>
              <div className="font-mono text-xs text-text-muted mt-0.5">
                @{username.toLowerCase()}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 items-center flex-wrap">
            <Button
              variant={lastfmConnected ? "outline" : "primary"}
              size="sm"
              onClick={connectLastfm}
            >
              {lastfmConnected ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Last.fm Synced</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  <span>Connect Last.fm</span>
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditingBio(!isEditingBio)}
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Bio</span>
            </Button>
          </div>
        </div>

        {/* Bio Section */}
        <div className="mt-4 max-w-xl">
          {isEditingBio ? (
            <div className="space-y-2">
              <textarea
                value={bioInput}
                onChange={(e) => setBioInput(e.target.value)}
                placeholder="Share your taste, favourite music eras, or audio gear..."
                rows={3}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-white outline-none focus:border-accent"
              />
              <div className="flex gap-2">
                <Button variant="primary" size="sm" onClick={handleSaveBio}>
                  Save
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setIsEditingBio(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="font-sans text-sm text-text-muted leading-relaxed m-0">
              {bio}
            </p>
          )}
        </div>

        {/* Music Tags */}
        <div className="flex items-center gap-1.5 flex-wrap mt-4 pt-3 border-t border-border">
          {tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 font-mono text-2xs uppercase tracking-wider px-2.5 py-1 rounded-full border border-border bg-surface text-text-muted cursor-pointer hover:border-danger hover:text-danger transition-colors"
              onClick={() => handleRemoveTag(t)}
              title="Click to remove"
            >
              <span>{t}</span>
              <X className="w-2.5 h-2.5 opacity-60" />
            </span>
          ))}

          <form onSubmit={handleAddTag} className="inline-flex">
            <input
              type="text"
              placeholder="+ add genre"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              className="h-6 px-2.5 rounded-full border border-dashed border-border bg-transparent font-mono text-2xs text-text placeholder:text-text-dim outline-none focus:border-accent"
            />
          </form>
        </div>
      </div>

      {/* Tabs Navigation: Sleek Modern Pills */}
      <div className="flex items-center gap-1.5 pb-2 border-b border-border overflow-x-auto">
        <button
          className={cn(
            "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer",
            activeTab === "overview"
              ? "bg-white text-zinc-950 shadow-sm"
              : "text-zinc-400 hover:text-white hover:bg-white/5"
          )}
          onClick={() => handleTabChange("overview")}
        >
          <User className="w-3.5 h-3.5" />
          <span>Profile Overview</span>
        </button>

        <button
          className={cn(
            "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer",
            activeTab === "quilts"
              ? "bg-white text-zinc-950 shadow-sm"
              : "text-zinc-400 hover:text-white hover:bg-white/5"
          )}
          onClick={() => handleTabChange("quilts")}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>Topsters &amp; Quilts</span>
        </button>

        <button
          className={cn(
            "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer",
            activeTab === "stats"
              ? "bg-white text-zinc-950 shadow-sm"
              : "text-zinc-400 hover:text-white hover:bg-white/5"
          )}
          onClick={() => handleTabChange("stats")}
        >
          <BarChart2 className="w-3.5 h-3.5" />
          <span>Listening Stats</span>
        </button>

        <button
          className={cn(
            "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer",
            activeTab === "settings"
              ? "bg-white text-zinc-950 shadow-sm"
              : "text-zinc-400 hover:text-white hover:bg-white/5"
          )}
          onClick={() => handleTabChange("settings")}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Settings</span>
        </button>
      </div>

      {/* Tab 1: Profile Overview */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Quick Hub Action Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div
              onClick={() => handleTabChange("quilts")}
              className="p-5 rounded-2xl border border-border bg-surface-raised hover:border-white/20 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="w-9 h-9 rounded-xl bg-surface border border-border flex items-center justify-center text-accent mb-3 group-hover:scale-105 transition-transform">
                  <LayoutGrid className="w-4 h-4" />
                </div>
                <h3 className="font-heading font-bold text-base text-white group-hover:text-accent transition-colors">
                  Topsters &amp; Quilts
                </h3>
                <p className="font-sans text-xs text-text-muted mt-1 leading-relaxed">
                  Generate bento album topsters, collages, and 1:1 vinyl cover quilts.
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold text-accent mt-4">
                <span>View Topsters</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            <div
              onClick={() => handleTabChange("stats")}
              className="p-5 rounded-2xl border border-border bg-surface-raised hover:border-white/20 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="w-9 h-9 rounded-xl bg-surface border border-border flex items-center justify-center text-accent mb-3 group-hover:scale-105 transition-transform">
                  <BarChart2 className="w-4 h-4" />
                </div>
                <h3 className="font-heading font-bold text-base text-white group-hover:text-accent transition-colors">
                  Listening Stats
                </h3>
                <p className="font-sans text-xs text-text-muted mt-1 leading-relaxed">
                  Track top albums, artist play counts, and rotation history over time.
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold text-accent mt-4">
                <span>View Stats</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            <div
              onClick={() => handleTabChange("settings")}
              className="p-5 rounded-2xl border border-border bg-surface-raised hover:border-white/20 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="w-9 h-9 rounded-xl bg-surface border border-border flex items-center justify-center text-accent mb-3 group-hover:scale-105 transition-transform">
                  <Settings className="w-4 h-4" />
                </div>
                <h3 className="font-heading font-bold text-base text-white group-hover:text-accent transition-colors">
                  Theme &amp; Settings
                </h3>
                <p className="font-sans text-xs text-text-muted mt-1 leading-relaxed">
                  Customize atmospheric color themes, spotlights, and Last.fm sync.
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold text-accent mt-4">
                <span>Configure</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </div>

          {/* Quick Preview of Top Albums */}
          <div className="p-6 rounded-2xl border border-border bg-surface-raised space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-heading font-bold text-lg text-white">Recent Top Rotation</h2>
                <p className="font-sans text-xs text-text-muted mt-0.5">
                  High-rotation records synchronized from your listening profile.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTabChange("stats")}
              >
                <span>All Stats</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
            <ErrorBoundary fallback={<div className="p-4 rounded-xl border border-border bg-surface text-center text-xs text-text-muted">Unable to load top rotation at this time.</div>}>
              <TopAlbums />
            </ErrorBoundary>
          </div>
        </div>
      )}

      {/* Tab 2: Quilts & Topster Gallery */}
      {activeTab === "quilts" && (
        <ErrorBoundary>
          <QuiltGallery />
        </ErrorBoundary>
      )}

      {/* Tab 3: Stats */}
      {activeTab === "stats" && (
        <div className="space-y-6">
          <ErrorBoundary>
            <TopAlbums />
          </ErrorBoundary>
          <ErrorBoundary>
            <TopArtists />
          </ErrorBoundary>
        </div>
      )}

      {/* Tab 4: Settings (Themes + Integrations) */}
      {activeTab === "settings" && (
        <div className="space-y-6 max-w-2xl">
          {/* Section 1: Appearance & Themes */}
          <div className="p-6 rounded-2xl border border-border bg-surface-raised space-y-4">
            <div>
              <h2 className="font-heading font-black text-lg text-white">Theme &amp; Look and Feel</h2>
              <p className="font-sans text-xs text-text-muted mt-0.5">
                Atmospheric studio dark themes with subtle cursor spotlight tracking.
              </p>
            </div>
            <ThemeSelector />
          </div>

          {/* Section 2: Last.fm Integration */}
          <div className="p-6 rounded-2xl border border-border bg-surface-raised space-y-4">
            <div>
              <h2 className="font-heading font-black text-lg text-white">Integrations</h2>
              <p className="font-sans text-xs text-text-muted mt-0.5">
                Connect external music services to power scrobbles, topsters, and quilts.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-surface border border-border flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold text-sm text-white">Last.fm Account</div>
                <div className="flex items-center gap-1.5 font-mono text-xs mt-1">
                  {lastfmConnected ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-semibold">Connected &amp; Syncing</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="text-zinc-400">Not Connected</span>
                    </>
                  )}
                </div>
              </div>

              <Button
                variant={lastfmConnected ? "secondary" : "primary"}
                size="sm"
                onClick={connectLastfm}
              >
                {lastfmConnected ? "Re-authorize" : "Connect Last.fm"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Avatar Picker Modal */}
      {showAvatarPicker && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          onClick={() => setShowAvatarPicker(false)}
        >
          <div
            className="w-full max-w-xs rounded-xl border border-border bg-surface-raised p-5 shadow-5 text-left space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-2 border-b border-border">
              <h3 className="font-heading font-bold text-sm text-white">Choose Symbol</h3>
              <button
                type="button"
                className="w-6 h-6 rounded flex items-center justify-center text-text-muted hover:text-white"
                onClick={() => setShowAvatarPicker(false)}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2 py-2">
              {["✦", "★", "▲", "◆", "●", "■", "✶", "❖"].map((char) => (
                <button
                  key={char}
                  type="button"
                  onClick={() => handleSelectAvatar(char)}
                  className="h-10 rounded-lg border border-border hover:border-accent hover:bg-surface text-lg font-bold text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  {char}
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              full
              onClick={() => {
                setCustomAvatar("");
                localStorage.removeItem(`nox_avatar_${userId}`);
                setShowAvatarPicker(false);
                addToast("Avatar reset to initial");
              }}
            >
              Reset to Monogram
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}