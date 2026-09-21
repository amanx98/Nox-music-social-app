import { useState, useEffect, useCallback } from "react";
import { useOutletContext, useSearchParams, Link } from "react-router-dom";
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
  Sparkles,
  Clock,
  MessageSquare,
  Repeat2,
  Heart,
  Bookmark,
  FileText,
  Camera,
  Upload,
  Trash2,
} from "lucide-react";
import QuiltGallery from "../QuiltGallery";
import TopAlbums from "../TopAlbums";
import TopArtists from "../TopArtists";
import ThemeSelector from "../components/ThemeSelector";
import Avatar from "../components/Avatar";
import ThreadCard from "../components/feed/ThreadCard";
import ThreadView from "../ThreadView";
import {
  apiRequest,
  getUserThreads,
  getUserLikes,
  getUserBookmarks,
  getUserReposts,
  getUserReplies,
  uploadAvatar,
  uploadBanner,
  updateProfile,
  resolveImageUrl,
} from "../api/client";
import { useToast } from "../components/Toast";
import Button from "../components/ui/Button";
import ErrorBoundary from "../components/ErrorBoundary";
import { cn } from "../lib/cn";

function formatTimeAgo(dateString) {
  if (!dateString) return "Recently";
  const date = new Date(dateString);
  const now = new Date();
  const diffInSecs = Math.floor((now - date) / 1000);

  if (diffInSecs < 60) return "just now";
  if (diffInSecs < 3600) return `${Math.floor(diffInSecs / 60)}m`;
  if (diffInSecs < 86400) return `${Math.floor(diffInSecs / 3600)}h`;
  if (diffInSecs < 604800) return `${Math.floor(diffInSecs / 86400)}d`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function EmptyState({ icon: Icon, title, description, buttonText, buttonLink }) {
  return (
    <div className="p-10 text-center flex flex-col items-center justify-center">
      <div className="w-10 h-10 rounded-md bg-surface-raised border border-border flex items-center justify-center text-text-dim mb-3">
        <Icon className="w-5 h-5 stroke-[1.75]" />
      </div>
      <h3 className="font-heading font-bold text-sm text-text mb-1">
        {title}
      </h3>
      <p className="font-sans text-xs text-text-muted max-w-xs mb-4">
        {description}
      </p>
      {buttonText && (
        <Link
          to={buttonLink || "/"}
          className="h-8 px-4 rounded-md bg-accent text-black hover:bg-accent-hover hover:text-black font-heading font-bold text-xs inline-flex items-center justify-center transition-all active:translate-y-px cursor-pointer shadow-1"
        >
          {buttonText}
        </Link>
      )}
    </div>
  );
}

function LoadingSkeleton({ count = 3 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 flex gap-3.5 animate-pulse" aria-busy="true">
          <div className="w-12 h-12 rounded bg-surface-raised shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-surface-raised rounded w-1/4" />
            <div className="h-4 bg-surface-raised rounded w-3/4" />
            <div className="h-3 bg-surface-raised rounded w-1/2" />
          </div>
        </div>
      ))}
    </>
  );
}

export default function ProfilePage({ user: propUser, initialTab = "posts", onLogout: _onLogout }) {
  const { addToast } = useToast();
  const outlet = useOutletContext?.() || {};
  const user = propUser || outlet.user || {};
  const userId = user?.id ?? "guest";
  const username = user?.username || "Listener";

  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(() => tabParam || initialTab || "posts");

  useEffect(() => {
    setActiveTab(tabParam || initialTab || "posts");
  }, [tabParam, initialTab]);

  function handleTabChange(tabKey) {
    setActiveTab(tabKey);
    if (tabKey === "posts") {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("tab");
      setSearchParams(nextParams, { replace: true });
    } else {
      setSearchParams({ tab: tabKey }, { replace: true });
    }
  }

  // Profile bio and tags state
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
  const [avatarUrl, setAvatarUrl] = useState(() => {
    return user?.avatar_url || localStorage.getItem(`nox_avatar_img_${userId}`) || "";
  });
  const [bannerUrl, setBannerUrl] = useState(() => {
    return user?.banner_url || localStorage.getItem(`nox_banner_img_${userId}`) || "";
  });
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [avatarModalTab, setAvatarModalTab] = useState("photo");
  const [avatarUrlInput, setAvatarUrlInput] = useState("");
  const [bannerUrlInput, setBannerUrlInput] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  useEffect(() => {
    if (user?.avatar_url !== undefined) {
      setAvatarUrl(user.avatar_url || "");
    }
    if (user?.banner_url !== undefined) {
      setBannerUrl(user.banner_url || "");
    }
    if (user?.bio !== undefined && user?.bio !== null) {
      setBio(user.bio);
      setBioInput(user.bio);
    }
  }, [user?.avatar_url, user?.banner_url, user?.bio]);

  const [lastfmConnected, setLastfmConnected] = useState(() => {
    return localStorage.getItem("lastfm_connected") === "true";
  });

  const [spotlightMode, setSpotlightMode] = useState(() => {
    try {
      return localStorage.getItem("nox_topster_spotlight_mode") || "all_time";
    } catch {
      return "all_time";
    }
  });

  // Twitter-style social streams state
  const [userThreads, setUserThreads] = useState([]);
  const [userThreadsLoading, setUserThreadsLoading] = useState(false);

  const [userReplies, setUserReplies] = useState([]);
  const [userRepliesLoading, setUserRepliesLoading] = useState(false);

  const [userReposts, setUserReposts] = useState([]);
  const [userRepostsLoading, setUserRepostsLoading] = useState(false);

  const [userLikes, setUserLikes] = useState([]);
  const [userLikesLoading, setUserLikesLoading] = useState(false);

  const [userBookmarks, setUserBookmarks] = useState([]);
  const [userBookmarksLoading, setUserBookmarksLoading] = useState(false);

  const [selectedThread, setSelectedThread] = useState(null);

  // Sync spotlight mode across tabs
  useEffect(() => {
    function handleModeSync(e) {
      const nextMode = e.detail || (e.key === "nox_topster_spotlight_mode" ? e.newValue : null);
      if (nextMode && (nextMode === "all_time" || nextMode === "latest")) {
        setSpotlightMode(nextMode);
      }
    }
    window.addEventListener("nox-spotlight-mode-change", handleModeSync);
    window.addEventListener("storage", handleModeSync);
    return () => {
      window.removeEventListener("nox-spotlight-mode-change", handleModeSync);
      window.removeEventListener("storage", handleModeSync);
    };
  }, []);

  function handleSpotlightModeChange(newMode) {
    if (newMode === spotlightMode) return;
    setSpotlightMode(newMode);
    try {
      localStorage.setItem("nox_topster_spotlight_mode", newMode);
    } catch {}
    window.dispatchEvent(new CustomEvent("nox-spotlight-mode-change", { detail: newMode }));
    addToast(newMode === "latest" ? "Spotlight set to Latest Topster" : "Spotlight set to All Time");
  }

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("lastfm_success") === "true") {
      setLastfmConnected(true);
      localStorage.setItem("lastfm_connected", "true");
      addToast("Last.fm account connected");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [addToast]);

  // Social data fetchers
  const loadPosts = useCallback(async () => {
    if (!userId || userId === "guest") return;
    setUserThreadsLoading(true);
    try {
      // include_reposts=true ensures retweets appear in the main posts stream just like Twitter
      const data = await getUserThreads(userId, true);
      setUserThreads(Array.isArray(data) ? data : []);
    } catch {
      setUserThreads([]);
    } finally {
      setUserThreadsLoading(false);
    }
  }, [userId]);

  const loadReplies = useCallback(async () => {
    if (!userId || userId === "guest") return;
    setUserRepliesLoading(true);
    try {
      const data = await getUserReplies(userId);
      setUserReplies(Array.isArray(data) ? data : []);
    } catch {
      setUserReplies([]);
    } finally {
      setUserRepliesLoading(false);
    }
  }, [userId]);

  const loadReposts = useCallback(async () => {
    if (!userId || userId === "guest") return;
    setUserRepostsLoading(true);
    try {
      const data = await getUserReposts(userId);
      setUserReposts(Array.isArray(data) ? data : []);
    } catch {
      setUserReposts([]);
    } finally {
      setUserRepostsLoading(false);
    }
  }, [userId]);

  const loadLikes = useCallback(async () => {
    if (!userId || userId === "guest") return;
    setUserLikesLoading(true);
    try {
      const data = await getUserLikes(userId);
      setUserLikes(Array.isArray(data) ? data : []);
    } catch {
      setUserLikes([]);
    } finally {
      setUserLikesLoading(false);
    }
  }, [userId]);

  const loadBookmarks = useCallback(async () => {
    setUserBookmarksLoading(true);
    try {
      const data = await getUserBookmarks();
      setUserBookmarks(Array.isArray(data) ? data : []);
    } catch {
      setUserBookmarks([]);
    } finally {
      setUserBookmarksLoading(false);
    }
  }, []);

  // Fetch active tab data
  useEffect(() => {
    if (activeTab === "posts") loadPosts();
    else if (activeTab === "replies") loadReplies();
    else if (activeTab === "reposts") loadReposts();
    else if (activeTab === "likes") loadLikes();
    else if (activeTab === "bookmarks") loadBookmarks();
  }, [activeTab, loadPosts, loadReplies, loadReposts, loadLikes, loadBookmarks]);

  // Initial load of counts for tab badges
  useEffect(() => {
    if (userId && userId !== "guest") {
      loadPosts();
      loadReplies();
      loadReposts();
      loadLikes();
      loadBookmarks();
    }
  }, [userId, loadPosts, loadReplies, loadReposts, loadLikes, loadBookmarks]);

  // Listen for real-time social actions dispatched from anywhere in the app
  useEffect(() => {
    function handleSocialUpdate() {
      if (activeTab === "posts") loadPosts();
      else if (activeTab === "replies") loadReplies();
      else if (activeTab === "reposts") loadReposts();
      else if (activeTab === "likes") loadLikes();
      else if (activeTab === "bookmarks") loadBookmarks();
    }
    window.addEventListener("nox-social-action", handleSocialUpdate);
    return () => window.removeEventListener("nox-social-action", handleSocialUpdate);
  }, [activeTab, loadPosts, loadReplies, loadReposts, loadLikes, loadBookmarks]);

  async function handleSaveBio() {
    setBio(bioInput);
    localStorage.setItem(`nox_bio_${userId}`, bioInput);
    setIsEditingBio(false);
    try {
      await updateProfile({ bio: bioInput });
      window.dispatchEvent(new CustomEvent("nox-profile-updated", { detail: { bio: bioInput } }));
    } catch {
      // Bio still saved in localStorage
    }
    addToast("Bio updated");
  }

  async function handleAvatarFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      addToast("Image must be smaller than 5MB", "error");
      return;
    }
    setUploadingAvatar(true);
    try {
      const updatedUser = await uploadAvatar(file);
      const newUrl = updatedUser.avatar_url;
      setAvatarUrl(newUrl);
      localStorage.setItem(`nox_avatar_img_${userId}`, newUrl);
      if (username) localStorage.setItem(`nox_avatar_img_${username}`, newUrl);
      window.dispatchEvent(new CustomEvent("nox-profile-updated", { detail: updatedUser }));
      addToast("Profile picture updated!");
      setShowAvatarPicker(false);
    } catch (err) {
      addToast(err.message || "Failed to upload avatar", "error");
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  }

  async function handleAvatarUrlSubmit(e) {
    e.preventDefault();
    if (!avatarUrlInput.trim()) return;
    setUploadingAvatar(true);
    try {
      const updatedUser = await uploadAvatar(avatarUrlInput.trim());
      const newUrl = updatedUser.avatar_url;
      setAvatarUrl(newUrl);
      localStorage.setItem(`nox_avatar_img_${userId}`, newUrl);
      if (username) localStorage.setItem(`nox_avatar_img_${username}`, newUrl);
      window.dispatchEvent(new CustomEvent("nox-profile-updated", { detail: updatedUser }));
      addToast("Profile picture updated!");
      setAvatarUrlInput("");
      setShowAvatarPicker(false);
    } catch (err) {
      addToast(err.message || "Failed to set avatar URL", "error");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleRemoveAvatar() {
    setUploadingAvatar(true);
    try {
      const updatedUser = await uploadAvatar(null);
      setAvatarUrl("");
      localStorage.removeItem(`nox_avatar_img_${userId}`);
      if (username) localStorage.removeItem(`nox_avatar_img_${username}`);
      window.dispatchEvent(new CustomEvent("nox-profile-updated", { detail: updatedUser }));
      addToast("Profile picture removed");
      setShowAvatarPicker(false);
    } catch (err) {
      addToast(err.message || "Failed to remove avatar", "error");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleBannerFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      addToast("Banner must be smaller than 8MB", "error");
      return;
    }
    setUploadingBanner(true);
    try {
      const updatedUser = await uploadBanner(file);
      const newUrl = updatedUser.banner_url;
      setBannerUrl(newUrl);
      localStorage.setItem(`nox_banner_img_${userId}`, newUrl);
      if (username) localStorage.setItem(`nox_banner_img_${username}`, newUrl);
      window.dispatchEvent(new CustomEvent("nox-profile-updated", { detail: updatedUser }));
      addToast("Banner image updated!");
      setShowBannerModal(false);
    } catch (err) {
      addToast(err.message || "Failed to upload banner", "error");
    } finally {
      setUploadingBanner(false);
      e.target.value = "";
    }
  }

  async function handleBannerUrlSubmit(e) {
    e.preventDefault();
    if (!bannerUrlInput.trim()) return;
    setUploadingBanner(true);
    try {
      const updatedUser = await uploadBanner(bannerUrlInput.trim());
      const newUrl = updatedUser.banner_url;
      setBannerUrl(newUrl);
      localStorage.setItem(`nox_banner_img_${userId}`, newUrl);
      if (username) localStorage.setItem(`nox_banner_img_${username}`, newUrl);
      window.dispatchEvent(new CustomEvent("nox-profile-updated", { detail: updatedUser }));
      addToast("Banner image updated!");
      setBannerUrlInput("");
      setShowBannerModal(false);
    } catch (err) {
      addToast(err.message || "Failed to set banner URL", "error");
    } finally {
      setUploadingBanner(false);
    }
  }

  async function handleRemoveBanner() {
    setUploadingBanner(true);
    try {
      const updatedUser = await uploadBanner(null);
      setBannerUrl("");
      localStorage.removeItem(`nox_banner_img_${userId}`);
      if (username) localStorage.removeItem(`nox_banner_img_${username}`);
      window.dispatchEvent(new CustomEvent("nox-profile-updated", { detail: updatedUser }));
      addToast("Banner removed");
      setShowBannerModal(false);
    } catch (err) {
      addToast(err.message || "Failed to remove banner", "error");
    } finally {
      setUploadingBanner(false);
    }
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
    setAvatarUrl("");
    localStorage.setItem(`nox_avatar_${userId}`, char);
    localStorage.removeItem(`nox_avatar_img_${userId}`);
    if (username) {
      localStorage.setItem(`nox_avatar_symbol_${username}`, char);
      localStorage.removeItem(`nox_avatar_img_${username}`);
    }
    uploadAvatar(null).catch(() => {});
    window.dispatchEvent(new CustomEvent("nox-profile-updated", { detail: { avatar_url: null } }));
    setShowAvatarPicker(false);
    addToast("Avatar symbol updated");
  }

  async function connectLastfm() {
    try {
      const data = await apiRequest("/lastfm/login");
      window.location.href = data.login_url;
    } catch (err) {
      addToast(err.message || "Failed to connect to Last.fm", "error");
    }
  }

  // If a thread is selected, render ThreadView full-width
  if (selectedThread) {
    return (
      <div className="w-full max-w-[960px] mx-auto py-2">
        <ThreadView
          thread={selectedThread}
          onBack={() => setSelectedThread(null)}
          user={user}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[960px] mx-auto w-full">
      {/* Profile Banner */}
      <div
        className="profile-banner rounded-md relative group overflow-hidden border border-border"
        style={
          bannerUrl
            ? {
                backgroundImage: `url("${resolveImageUrl(bannerUrl)}")`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent pointer-events-none" />
        <button
          type="button"
          onClick={() => setShowBannerModal(true)}
          className="absolute top-3 right-3 px-3 py-1.5 rounded-md bg-surface/85 hover:bg-accent hover:text-black text-text border border-border/80 backdrop-blur-md font-heading font-semibold text-xs flex items-center gap-1.5 transition-all shadow-2 cursor-pointer z-10"
          title="Customize Profile Banner"
        >
          <Camera className="w-3.5 h-3.5" />
          <span>{bannerUrl ? "Change Banner" : "Add Banner"}</span>
        </button>
      </div>

      {/* Profile Header Card */}
      <div className="profile-header-card rounded-md border border-border bg-surface-raised p-5 sm:p-6 shadow-2">
        <div className="flex justify-between items-start flex-wrap gap-4">
          {/* Avatar and User Info */}
          <div className="flex gap-4 items-end">
            <div className="relative">
              <Avatar
                username={username}
                src={avatarUrl}
                size={84}
                customIcon={customAvatar}
                onClick={() => setShowAvatarPicker(true)}
                className="cursor-pointer border-2 border-accent shadow-3"
              />
              <button
                type="button"
                onClick={() => setShowAvatarPicker(true)}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-accent text-black flex items-center justify-center shadow-2 border border-surface cursor-pointer hover:scale-110 transition-transform"
                title="Change profile picture"
                aria-label="Change profile picture"
              >
                <Camera className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading font-black text-2xl text-text m-0">{username}</h1>
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
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-accent"
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

      {/* Twitter-style Navigation Tabs Bar */}
      <div className="flex items-center gap-1.5 pb-2 border-b border-border overflow-x-auto select-none no-scrollbar">
        {/* Tab 1: Posts (Includes Retweets, like Twitter) */}
        <button
          className={cn(
            "flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-heading font-semibold transition-all cursor-pointer shrink-0",
            activeTab === "posts"
              ? "bg-accent text-black font-bold shadow-1"
              : "text-text-muted hover:text-text hover:bg-surface-raised"
          )}
          onClick={() => handleTabChange("posts")}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Posts</span>
          {userThreads.length > 0 && (
            <span className={cn("font-mono text-2xs px-1.5 py-0.2 rounded-full", activeTab === "posts" ? "bg-black/20 text-black" : "bg-surface-raised text-text-dim")}>
              {userThreads.length}
            </span>
          )}
        </button>

        {/* Tab 2: Replies */}
        <button
          className={cn(
            "flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-heading font-semibold transition-all cursor-pointer shrink-0",
            activeTab === "replies"
              ? "bg-accent text-black font-bold shadow-1"
              : "text-text-muted hover:text-text hover:bg-surface-raised"
          )}
          onClick={() => handleTabChange("replies")}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Replies</span>
          {userReplies.length > 0 && (
            <span className={cn("font-mono text-2xs px-1.5 py-0.2 rounded-full", activeTab === "replies" ? "bg-black/20 text-black" : "bg-surface-raised text-text-dim")}>
              {userReplies.length}
            </span>
          )}
        </button>

        {/* Tab 3: Reposts / Retweets */}
        <button
          className={cn(
            "flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-heading font-semibold transition-all cursor-pointer shrink-0",
            activeTab === "reposts"
              ? "bg-accent text-black font-bold shadow-1"
              : "text-text-muted hover:text-text hover:bg-surface-raised"
          )}
          onClick={() => handleTabChange("reposts")}
        >
          <Repeat2 className="w-3.5 h-3.5" />
          <span>Reposts</span>
          {userReposts.length > 0 && (
            <span className={cn("font-mono text-2xs px-1.5 py-0.2 rounded-full", activeTab === "reposts" ? "bg-black/20 text-black" : "bg-surface-raised text-text-dim")}>
              {userReposts.length}
            </span>
          )}
        </button>

        {/* Tab 4: Likes */}
        <button
          className={cn(
            "flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-heading font-semibold transition-all cursor-pointer shrink-0",
            activeTab === "likes"
              ? "bg-accent text-black font-bold shadow-1"
              : "text-text-muted hover:text-text hover:bg-surface-raised"
          )}
          onClick={() => handleTabChange("likes")}
        >
          <Heart className="w-3.5 h-3.5" />
          <span>Likes</span>
          {userLikes.length > 0 && (
            <span className={cn("font-mono text-2xs px-1.5 py-0.2 rounded-full", activeTab === "likes" ? "bg-black/20 text-black" : "bg-surface-raised text-text-dim")}>
              {userLikes.length}
            </span>
          )}
        </button>

        {/* Tab 5: Bookmarks */}
        <button
          className={cn(
            "flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-heading font-semibold transition-all cursor-pointer shrink-0",
            activeTab === "bookmarks"
              ? "bg-accent text-black font-bold shadow-1"
              : "text-text-muted hover:text-text hover:bg-surface-raised"
          )}
          onClick={() => handleTabChange("bookmarks")}
        >
          <Bookmark className="w-3.5 h-3.5" />
          <span>Bookmarks</span>
          {userBookmarks.length > 0 && (
            <span className={cn("font-mono text-2xs px-1.5 py-0.2 rounded-full", activeTab === "bookmarks" ? "bg-black/20 text-black" : "bg-surface-raised text-text-dim")}>
              {userBookmarks.length}
            </span>
          )}
        </button>

        {/* Divider separating social stream from music curation & settings */}
        <div className="w-px h-5 bg-border mx-1 shrink-0" />

        {/* Tab 6: Topsters & Quilts */}
        <button
          className={cn(
            "flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-heading font-semibold transition-all cursor-pointer shrink-0",
            activeTab === "quilts"
              ? "bg-accent text-black font-bold shadow-1"
              : "text-text-muted hover:text-text hover:bg-surface-raised"
          )}
          onClick={() => handleTabChange("quilts")}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>Topsters &amp; Quilts</span>
        </button>

        {/* Tab 7: Listening Stats */}
        <button
          className={cn(
            "flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-heading font-semibold transition-all cursor-pointer shrink-0",
            activeTab === "stats"
              ? "bg-accent text-black font-bold shadow-1"
              : "text-text-muted hover:text-text hover:bg-surface-raised"
          )}
          onClick={() => handleTabChange("stats")}
        >
          <BarChart2 className="w-3.5 h-3.5" />
          <span>Listening Stats</span>
        </button>

        {/* Tab 8: Settings */}
        <button
          className={cn(
            "flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-heading font-semibold transition-all cursor-pointer shrink-0",
            activeTab === "settings"
              ? "bg-accent text-black font-bold shadow-1"
              : "text-text-muted hover:text-text hover:bg-surface-raised"
          )}
          onClick={() => handleTabChange("settings")}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Settings</span>
        </button>

        {/* Tab 9: Overview */}
        <button
          className={cn(
            "flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-heading font-semibold transition-all cursor-pointer shrink-0",
            activeTab === "overview"
              ? "bg-accent text-black font-bold shadow-1"
              : "text-text-muted hover:text-text hover:bg-surface-raised"
          )}
          onClick={() => handleTabChange("overview")}
        >
          <User className="w-3.5 h-3.5" />
          <span>Overview</span>
        </button>
      </div>

      {/* CONTENT FOR TAB: POSTS (Includes Retweets, exactly like Twitter) */}
      {activeTab === "posts" && (
        <div className="space-y-4">
          <div className="rounded-md border border-border bg-surface overflow-hidden divide-y divide-border shadow-1">
            {userThreadsLoading ? (
              <LoadingSkeleton count={3} />
            ) : userThreads.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No transmissions yet"
                description="You haven't transmitted any takes or reposted any records yet. Join discussions from the live wire."
                buttonText="Explore The Live Wire"
                buttonLink="/"
              />
            ) : (
              userThreads.map((thread) => (
                <ThreadCard
                  key={`${thread.id}-${thread.is_repost ? "repost" : "orig"}`}
                  thread={thread}
                  onSelect={() => setSelectedThread(thread)}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* CONTENT FOR TAB: REPLIES */}
      {activeTab === "replies" && (
        <div className="space-y-4">
          <div className="rounded-md border border-border bg-surface overflow-hidden divide-y divide-border shadow-1">
            {userRepliesLoading ? (
              <LoadingSkeleton count={3} />
            ) : userReplies.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                title="No replies yet"
                description="When you drop your takes in community discussions, your replies will appear here."
                buttonText="Browse Discussions"
                buttonLink="/"
              />
            ) : (
              userReplies.map((reply) => (
                <article
                  key={reply.id}
                  onClick={() => {
                    if (reply.thread_id) {
                      setSelectedThread({
                        id: reply.thread_id,
                        title: reply.thread_title || "Discussion",
                        body: "",
                        user_id: 0,
                        author_name: reply.thread_author,
                      });
                    }
                  }}
                  className="p-4 hover:bg-surface-raised/60 transition-colors cursor-pointer space-y-2 text-left"
                >
                  <div className="flex items-center justify-between text-xs text-text-dim font-mono">
                    <div className="flex items-center gap-1.5 truncate">
                      <MessageSquare className="w-3.5 h-3.5 text-accent shrink-0" />
                      <span>
                        Replying to <strong className="text-text font-semibold">@{reply.thread_author || "listener"}</strong>
                      </span>
                      {reply.thread_title && (
                        <span className="truncate text-text-muted">&middot; {reply.thread_title}</span>
                      )}
                    </div>
                    <span className="shrink-0">{formatTimeAgo(reply.created_at)}</span>
                  </div>
                  <p className="font-sans text-sm text-text leading-relaxed m-0 pl-3 border-l-2 border-accent/40">
                    {reply.body}
                  </p>
                </article>
              ))
            )}
          </div>
        </div>
      )}

      {/* CONTENT FOR TAB: REPOSTS */}
      {activeTab === "reposts" && (
        <div className="space-y-4">
          <div className="rounded-md border border-border bg-surface overflow-hidden divide-y divide-border shadow-1">
            {userRepostsLoading ? (
              <LoadingSkeleton count={3} />
            ) : userReposts.length === 0 ? (
              <EmptyState
                icon={Repeat2}
                title="No reposts yet"
                description="When you repost discussions or music takes from other listeners, they will show up here."
                buttonText="Find Takes to Repost"
                buttonLink="/"
              />
            ) : (
              userReposts.map((thread) => (
                <ThreadCard
                  key={thread.id}
                  thread={thread}
                  onSelect={() => setSelectedThread(thread)}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* CONTENT FOR TAB: LIKES */}
      {activeTab === "likes" && (
        <div className="space-y-4">
          <div className="rounded-md border border-border bg-surface overflow-hidden divide-y divide-border shadow-1">
            {userLikesLoading ? (
              <LoadingSkeleton count={3} />
            ) : userLikes.length === 0 ? (
              <EmptyState
                icon={Heart}
                title="No liked transmissions yet"
                description="Tap the heart on any take in your feed to save your favorite discussions here."
                buttonText="Explore Feed"
                buttonLink="/"
              />
            ) : (
              userLikes.map((thread) => (
                <ThreadCard
                  key={thread.id}
                  thread={thread}
                  onSelect={() => setSelectedThread(thread)}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* CONTENT FOR TAB: BOOKMARKS */}
      {activeTab === "bookmarks" && (
        <div className="space-y-4">
          <div className="rounded-md border border-border bg-surface overflow-hidden divide-y divide-border shadow-1">
            {userBookmarksLoading ? (
              <LoadingSkeleton count={3} />
            ) : userBookmarks.length === 0 ? (
              <EmptyState
                icon={Bookmark}
                title="No bookmarks yet"
                description="Save transmissions to your private bookmarks to revisit them anytime."
                buttonText="Browse Discussions"
                buttonLink="/"
              />
            ) : (
              userBookmarks.map((thread) => (
                <ThreadCard
                  key={thread.id}
                  thread={thread}
                  onSelect={() => setSelectedThread(thread)}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* CONTENT FOR TAB: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Quick Hub Action Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div
              onClick={() => handleTabChange("quilts")}
              className="p-5 rounded-md border border-border bg-surface-raised hover:border-border-strong transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="w-9 h-9 rounded-md bg-surface border border-border flex items-center justify-center text-accent mb-3 group-hover:scale-105 transition-transform">
                  <LayoutGrid className="w-4 h-4" />
                </div>
                <h3 className="font-heading font-bold text-base text-text group-hover:text-accent transition-colors">
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
              className="p-5 rounded-md border border-border bg-surface-raised hover:border-border-strong transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="w-9 h-9 rounded-md bg-surface border border-border flex items-center justify-center text-accent mb-3 group-hover:scale-105 transition-transform">
                  <BarChart2 className="w-4 h-4" />
                </div>
                <h3 className="font-heading font-bold text-base text-text group-hover:text-accent transition-colors">
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
              className="p-5 rounded-md border border-border bg-surface-raised hover:border-border-strong transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="w-9 h-9 rounded-md bg-surface border border-border flex items-center justify-center text-accent mb-3 group-hover:scale-105 transition-transform">
                  <Settings className="w-4 h-4" />
                </div>
                <h3 className="font-heading font-bold text-base text-text group-hover:text-accent transition-colors">
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
          <div className="p-6 rounded-md border border-border bg-surface-raised space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-heading font-bold text-lg text-text">Recent Top Rotation</h2>
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
            <TopAlbums limit={4} compact />
          </div>
        </div>
      )}

      {/* CONTENT FOR TAB: QUILTS */}
      {activeTab === "quilts" && (
        <div className="space-y-4">
          <QuiltGallery />
        </div>
      )}

      {/* CONTENT FOR TAB: STATS */}
      {activeTab === "stats" && (
        <div className="space-y-8">
          <ErrorBoundary>
            <TopAlbums />
          </ErrorBoundary>
          <ErrorBoundary>
            <TopArtists />
          </ErrorBoundary>
        </div>
      )}

      {/* CONTENT FOR TAB: SETTINGS */}
      {activeTab === "settings" && (
        <div className="space-y-6 max-w-2xl">
          {/* Section 1: Appearance & Themes */}
          <div className="p-6 rounded-md border border-border bg-surface-raised space-y-4">
            <div>
              <h2 className="font-heading font-black text-lg text-text">Theme &amp; Look and Feel</h2>
              <p className="font-sans text-xs text-text-muted mt-0.5">
                Atmospheric studio dark themes with subtle cursor spotlight tracking.
              </p>
            </div>
            <ThemeSelector />
          </div>

          {/* Section 2: Last.fm Integration */}
          <div className="p-6 rounded-md border border-border bg-surface-raised space-y-4">
            <div>
              <h2 className="font-heading font-black text-lg text-text">Integrations</h2>
              <p className="font-sans text-xs text-text-muted mt-0.5">
                Connect external music services to power scrobbles, topsters, and quilts.
              </p>
            </div>

            <div className="p-4 rounded-md bg-surface border border-border flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold text-sm text-text">Last.fm Account</div>
                <div className="flex items-center gap-1.5 font-mono text-xs mt-1">
                  {lastfmConnected ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
                      <span className="text-accent font-semibold">Connected &amp; Syncing</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3.5 h-3.5 text-text-dim" />
                      <span className="text-text-dim">Not Connected</span>
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

          {/* Section 3: Topster Spotlight Preferences */}
          <div className="p-6 rounded-md border border-border bg-surface-raised space-y-4">
            <div>
              <h2 className="font-heading font-black text-lg text-text">Topster Spotlight Display</h2>
              <p className="font-sans text-xs text-text-muted mt-0.5">
                Choose whether the broadcast feed &quot;Topster of the Hour&quot; spotlight features your latest topster or your default all-time favorite rotation.
              </p>
            </div>

            <div
              role="radiogroup"
              aria-label="Topster spotlight mode preference"
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            >
              <button
                type="button"
                role="radio"
                aria-checked={spotlightMode === "all_time"}
                onClick={() => handleSpotlightModeChange("all_time")}
                style={spotlightMode === "all_time" ? { borderColor: "#C7F43D", backgroundColor: "#151815" } : undefined}
                className={cn(
                  "p-4 rounded-md border text-left transition-all cursor-pointer flex flex-col justify-between gap-3",
                  spotlightMode === "all_time"
                    ? "border-accent bg-surface shadow-md ring-1 ring-accent"
                    : "border-border bg-surface hover:border-border-strong hover:bg-surface-hover"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-accent" />
                    <span className="font-heading font-bold text-sm text-text">All Time (Default)</span>
                  </div>
                  {spotlightMode === "all_time" && (
                    <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                  )}
                </div>
                <p className="font-sans text-xs text-text-muted m-0">
                  Feature your all-time favorite albums and classic quilts in the feed spotlight.
                </p>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={spotlightMode === "latest"}
                onClick={() => handleSpotlightModeChange("latest")}
                style={spotlightMode === "latest" ? { borderColor: "#C7F43D", backgroundColor: "#151815" } : undefined}
                className={cn(
                  "p-4 rounded-md border text-left transition-all cursor-pointer flex flex-col justify-between gap-3",
                  spotlightMode === "latest"
                    ? "border-accent bg-surface shadow-md ring-1 ring-accent"
                    : "border-border bg-surface hover:border-border-strong hover:bg-surface-hover"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-accent" />
                    <span className="font-heading font-bold text-sm text-text">Latest Topster</span>
                  </div>
                  {spotlightMode === "latest" && (
                    <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                  )}
                </div>
                <p className="font-sans text-xs text-text-muted m-0">
                  Automatically feature your most recently generated topster or past 7-day high-rotation scrobbles.
                </p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Avatar Customization Modal */}
      {showAvatarPicker && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          onClick={() => setShowAvatarPicker(false)}
        >
          <div
            className="w-full max-w-sm rounded-md border border-border bg-surface-raised p-5 shadow-5 text-left space-y-4 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-2 border-b border-border">
              <div>
                <div className="font-mono text-[9px] uppercase tracking-widest text-accent font-bold">
                  ARCHIVIST IDENTITY
                </div>
                <h3 className="font-heading font-bold text-sm text-text m-0">Profile Picture</h3>
              </div>
              <button
                type="button"
                className="w-6 h-6 rounded flex items-center justify-center text-text-muted hover:text-text cursor-pointer"
                onClick={() => setShowAvatarPicker(false)}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Current Preview */}
            <div className="flex items-center gap-3 p-3 rounded-md bg-surface-sunken border border-border">
              <Avatar
                username={username}
                src={avatarUrl}
                customIcon={customAvatar}
                size={52}
              />
              <div className="min-w-0">
                <div className="font-heading font-bold text-xs text-text truncate">{username}</div>
                <div className="font-mono text-2xs text-text-dim">
                  {avatarUrl ? "Custom image active" : customAvatar ? `Symbol active (${customAvatar})` : "Monogram active"}
                </div>
              </div>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-md bg-surface-sunken border border-border">
              <button
                type="button"
                onClick={() => setAvatarModalTab("photo")}
                className={cn(
                  "flex-1 h-7 rounded text-xs font-heading font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                  avatarModalTab === "photo"
                    ? "bg-accent text-black font-bold shadow-1"
                    : "text-text-muted hover:text-text"
                )}
              >
                <Upload className="w-3 h-3" />
                <span>Photo / URL</span>
              </button>
              <button
                type="button"
                onClick={() => setAvatarModalTab("symbols")}
                className={cn(
                  "flex-1 h-7 rounded text-xs font-heading font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                  avatarModalTab === "symbols"
                    ? "bg-accent text-black font-bold shadow-1"
                    : "text-text-muted hover:text-text"
                )}
              >
                <Sparkles className="w-3 h-3" />
                <span>Symbols</span>
              </button>
            </div>

            {avatarModalTab === "photo" ? (
              <div className="space-y-3">
                {/* File Upload Button */}
                <div>
                  <label className="cursor-pointer flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-md border border-dashed border-border hover:border-accent bg-surface hover:bg-surface-hover text-xs font-heading font-semibold text-text transition-colors">
                    <Upload className="w-4 h-4 text-accent" />
                    <span>{uploadingAvatar ? "Uploading photo..." : "Upload photo from device"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarFileUpload}
                      disabled={uploadingAvatar}
                    />
                  </label>
                  <p className="font-mono text-[10px] text-text-dim text-center mt-1">
                    JPEG, PNG, WEBP, or GIF up to 5MB
                  </p>
                </div>

                {/* Or URL Input */}
                <form onSubmit={handleAvatarUrlSubmit} className="space-y-2 pt-1 border-t border-border/60">
                  <label className="block font-mono text-2xs text-text-dim uppercase tracking-wider">
                    Or paste image link:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://images.example.com/pfp.jpg"
                      value={avatarUrlInput}
                      onChange={(e) => setAvatarUrlInput(e.target.value)}
                      className="flex-1 h-8 rounded-md border border-border bg-surface px-2.5 text-xs text-text placeholder:text-text-dim outline-none focus:border-accent"
                    />
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={uploadingAvatar || !avatarUrlInput.trim()}
                    >
                      Set URL
                    </Button>
                  </div>
                </form>

                {/* Remove Image Action if present */}
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    disabled={uploadingAvatar}
                    className="w-full h-8 flex items-center justify-center gap-1.5 rounded-md text-xs font-medium text-danger hover:bg-danger/10 border border-danger/20 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove Photo</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-2">
                  {["✦", "★", "▲", "◆", "●", "■", "✶", "❖"].map((char) => (
                    <button
                      key={char}
                      type="button"
                      onClick={() => handleSelectAvatar(char)}
                      className={cn(
                        "h-10 rounded-md border border-border bg-surface hover:border-accent hover:bg-accent hover:text-black text-lg font-bold text-text flex items-center justify-center transition-colors cursor-pointer",
                        customAvatar === char && "border-accent bg-accent text-black"
                      )}
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
                    if (username) localStorage.removeItem(`nox_avatar_symbol_${username}`);
                    setShowAvatarPicker(false);
                    addToast("Avatar reset to monogram");
                  }}
                >
                  Reset to Monogram
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Banner Customization Modal */}
      {showBannerModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          onClick={() => setShowBannerModal(false)}
        >
          <div
            className="w-full max-w-md rounded-md border border-border bg-surface-raised p-5 shadow-5 text-left space-y-4 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-2 border-b border-border">
              <div>
                <div className="font-mono text-[9px] uppercase tracking-widest text-accent font-bold">
                  DESK CUSTOMIZATION
                </div>
                <h3 className="font-heading font-bold text-sm text-text m-0">Profile Banner</h3>
              </div>
              <button
                type="button"
                className="w-6 h-6 rounded flex items-center justify-center text-text-muted hover:text-text cursor-pointer"
                onClick={() => setShowBannerModal(false)}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Banner Preview */}
            <div
              className="h-28 rounded-md border border-border overflow-hidden relative"
              style={
                bannerUrl
                  ? {
                      backgroundImage: `url("${resolveImageUrl(bannerUrl)}")`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }
                  : {
                      background: "linear-gradient(135deg, #24201a 0%, #171512 50%, #2b251d 100%)",
                    }
              }
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3">
                <span className="font-mono text-[10px] text-text-muted">
                  {bannerUrl ? "Custom banner preview" : "Default atmospheric desk background"}
                </span>
              </div>
            </div>

            {/* File Upload */}
            <div>
              <label className="cursor-pointer flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-md border border-dashed border-border hover:border-accent bg-surface hover:bg-surface-hover text-xs font-heading font-semibold text-text transition-colors">
                <Upload className="w-4 h-4 text-accent" />
                <span>{uploadingBanner ? "Uploading banner..." : "Upload banner image"}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleBannerFileUpload}
                  disabled={uploadingBanner}
                />
              </label>
              <p className="font-mono text-[10px] text-text-dim text-center mt-1">
                Recommended: 1200x300 or wide panorama (up to 8MB)
              </p>
            </div>

            {/* URL Input */}
            <form onSubmit={handleBannerUrlSubmit} className="space-y-2 pt-2 border-t border-border/60">
              <label className="block font-mono text-2xs text-text-dim uppercase tracking-wider">
                Or paste image link:
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://images.example.com/banner.jpg"
                  value={bannerUrlInput}
                  onChange={(e) => setBannerUrlInput(e.target.value)}
                  className="flex-1 h-8 rounded-md border border-border bg-surface px-2.5 text-xs text-text placeholder:text-text-dim outline-none focus:border-accent"
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={uploadingBanner || !bannerUrlInput.trim()}
                >
                  Set URL
                </Button>
              </div>
            </form>

            {/* Remove Banner if present */}
            {bannerUrl && (
              <button
                type="button"
                onClick={handleRemoveBanner}
                disabled={uploadingBanner}
                className="w-full h-8 flex items-center justify-center gap-1.5 rounded-md text-xs font-medium text-danger hover:bg-danger/10 border border-danger/20 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset to Default Banner</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}