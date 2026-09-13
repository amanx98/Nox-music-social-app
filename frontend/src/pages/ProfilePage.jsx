import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { apiRequest } from "../api/client";
import { useToast } from "../components/Toast";
import Avatar from "../components/Avatar";
import TopAlbums from "../TopAlbums";
import TopArtists from "../TopArtists";
import QuiltGallery from "../QuiltGallery";
import ThemeSelector from "../components/ThemeSelector";

const MUSIC_ICONS = ["💽", "📻", "🎧", "🎹", "🎸", "🎙️", "🎷", "🔊", "🥁", "🎺"];

export default function ProfilePage() {
  const context = useOutletContext();
  const user = context?.user || { username: "musicfan", id: 1, email: "fan@nox.fm" };
  const onLogout = context?.onLogout || (() => {});
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState("quilts");
  const [lastfmConnected, setLastfmConnected] = useState(false);
  const [customAvatar, setCustomAvatar] = useState(() => {
    return localStorage.getItem(`nox_avatar_${user.id}`) || null;
  });
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  // Bio state
  const [bio, setBio] = useState(() => {
    return (
      localStorage.getItem(`nox_bio_${user.id}`) ||
      "Crate digger, sound curator, and album archivist. Constantly rotating vinyl."
    );
  });
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState(bio);

  // Music tags
  const [tags, setTags] = useState(() => {
    const saved = localStorage.getItem(`nox_tags_${user.id}`);
    return saved ? JSON.parse(saved) : ["#VinylJunkie", "#IndieRock", "#Ambient", "#JazzFusion"];
  });
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    // Check if Last.fm profile is connected
    async function checkLastfm() {
      try {
        const profile = await apiRequest("/lastfm/top-albums?period=7day");
        if (profile && !profile.detail) setLastfmConnected(true);
      } catch {
        setLastfmConnected(false);
      }
    }
    checkLastfm();
  }, []);

  async function connectLastfm() {
    try {
      const data = await apiRequest("/lastfm/login");
      window.location.href = data.login_url;
    } catch (err) {
      addToast(err.message || "Failed to start Last.fm login");
    }
  }

  function handleSaveBio() {
    setBio(bioInput);
    localStorage.setItem(`nox_bio_${user.id}`, bioInput);
    setIsEditingBio(false);
    addToast("Profile bio updated");
  }

  function handleSelectAvatar(icon) {
    setCustomAvatar(icon);
    localStorage.setItem(`nox_avatar_${user.id}`, icon);
    setShowAvatarPicker(false);
    addToast("Avatar icon updated!");
  }

  function handleAddTag(e) {
    e.preventDefault();
    if (!newTag.trim()) return;
    const formatted = newTag.startsWith("#") ? newTag.trim() : `#${newTag.trim()}`;
    if (!tags.includes(formatted)) {
      const updated = [...tags, formatted];
      setTags(updated);
      localStorage.setItem(`nox_tags_${user.id}`, JSON.stringify(updated));
      setNewTag("");
      addToast(`Added genre tag ${formatted}`);
    }
  }

  function handleRemoveTag(tagToRemove) {
    const updated = tags.filter((t) => t !== tagToRemove);
    setTags(updated);
    localStorage.setItem(`nox_tags_${user.id}`, JSON.stringify(updated));
  }

  return (
    <div>
      {/* Profile Banner */}
      <div className="profile-banner" />

      {/* Profile Header Card */}
      <div className="profile-header-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          {/* Avatar and User Identification */}
          <div style={{ display: "flex", gap: "20px", alignItems: "flex-end" }}>
            <div style={{ position: "relative" }}>
              <Avatar
                username={user.username}
                size={84}
                customIcon={customAvatar}
                onClick={() => setShowAvatarPicker(true)}
                className="quilt-frame"
              />
              <button
                onClick={() => setShowAvatarPicker(true)}
                style={{
                  position: "absolute",
                  bottom: "-4px",
                  right: "-4px",
                  borderRadius: "50%",
                  width: "26px",
                  height: "26px",
                  padding: 0,
                  fontSize: "12px",
                  background: "var(--mustard)",
                  color: "var(--ink)",
                }}
                title="Change Avatar Icon"
              >
                ✎
              </button>
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <h1 style={{ margin: 0, fontSize: "30px" }}>{user.username}</h1>
                <span className="badge badge-mustard">PRO ARCHIVIST</span>
              </div>
              <div className="meta" style={{ marginTop: "2px" }}>
                @{user.username?.toLowerCase()} &middot; Joined 2024
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              onClick={connectLastfm}
              className={lastfmConnected ? "btn-secondary" : "btn-primary"}
              style={{ padding: "8px 14px", fontSize: "12px" }}
            >
              {lastfmConnected ? "✓ Last.fm Synced" : "⚡ Connect Last.fm"}
            </button>
            <button
              onClick={() => setIsEditingBio(!isEditingBio)}
              className="btn-outline"
              style={{ padding: "8px 14px", fontSize: "12px" }}
            >
              ✎ Edit Bio
            </button>
          </div>
        </div>

        {/* Bio Section */}
        <div style={{ marginTop: "20px", maxWidth: "680px" }}>
          {isEditingBio ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <textarea
                value={bioInput}
                onChange={(e) => setBioInput(e.target.value)}
                placeholder="Share your taste, favourite music eras, or audio gear..."
              />
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={handleSaveBio} className="btn-primary" style={{ padding: "6px 14px" }}>
                  Save
                </button>
                <button onClick={() => setIsEditingBio(false)} className="btn-secondary" style={{ padding: "6px 14px" }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: "15px", color: "var(--cream-text-dim)", lineHeight: "1.6" }}>
              {bio}
            </p>
          )}
        </div>

        {/* Music Tags & Badges */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginTop: "16px" }}>
          {tags.map((t) => (
            <span key={t} className="badge badge-teal" style={{ cursor: "pointer" }} onClick={() => handleRemoveTag(t)} title="Click to remove">
              {t} <span style={{ opacity: 0.6, marginLeft: "2px" }}>×</span>
            </span>
          ))}

          <form onSubmit={handleAddTag} style={{ display: "inline-flex" }}>
            <input
              type="text"
              placeholder="+ add genre tag"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              style={{
                background: "transparent",
                border: "1px dashed var(--border-strong)",
                padding: "3px 8px",
                fontSize: "11px",
                borderRadius: "4px",
                width: "120px",
              }}
            />
          </form>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="profile-tabs">
        <button
          className={`profile-tab ${activeTab === "quilts" ? "active" : ""}`}
          onClick={() => setActiveTab("quilts")}
        >
          💽 Quilts &amp; Crates
        </button>
        <button
          className={`profile-tab ${activeTab === "stats" ? "active" : ""}`}
          onClick={() => setActiveTab("stats")}
        >
          📊 Listening Stats
        </button>
        <button
          className={`profile-tab ${activeTab === "themes" ? "active" : ""}`}
          onClick={() => setActiveTab("themes")}
        >
          🎨 Theme &amp; Atmosphere
        </button>
        <button
          className={`profile-tab ${activeTab === "settings" ? "active" : ""}`}
          onClick={() => setActiveTab("settings")}
        >
          ⚙️ Account &amp; Integrations
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "quilts" && <QuiltGallery />}

      {activeTab === "stats" && (
        <div>
          <TopAlbums />
          <TopArtists />
        </div>
      )}

      {activeTab === "themes" && (
        <div className="card" style={{ maxWidth: "800px" }}>
          <div style={{ marginBottom: "16px" }}>
            <h3 style={{ margin: "0 0 6px" }}>🎨 Color Themes & Atmosphere</h3>
            <p className="meta" style={{ margin: 0 }}>
              Customize Nox with ultra-deep OLED blacks, subtle ambient glows, and rich gradient palettes.
            </p>
          </div>
          <ThemeSelector />
        </div>
      )}

      {activeTab === "settings" && (
        <div className="card" style={{ maxWidth: "600px" }}>
          <h3 style={{ marginBottom: "16px" }}>Account Preferences</h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <div style={{ paddingBottom: "14px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontWeight: 600, marginBottom: "4px" }}>Last.fm Integration</div>
              <p className="meta" style={{ margin: "0 0 10px" }}>
                Status: {lastfmConnected ? "🟢 Connected & Syncing" : "⚪ Not Connected"}
              </p>
              <button onClick={connectLastfm} className="btn-secondary">
                {lastfmConnected ? "Re-authorize Last.fm" : "Connect Last.fm Account"}
              </button>
            </div>

            <div style={{ paddingBottom: "14px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontWeight: 600, marginBottom: "4px" }}>Spotify Connect</div>
              <p className="meta" style={{ margin: "0 0 8px" }}>
                Spotify Web API sync is coming in the next release.
              </p>
              <button disabled className="btn-outline">
                Connect Spotify (Coming Soon)
              </button>
            </div>

            <div style={{ paddingTop: "6px" }}>
              <div style={{ fontWeight: 600, marginBottom: "4px", color: "var(--coral)" }}>Session</div>
              <p className="meta" style={{ margin: "0 0 10px" }}>
                Signed in as <strong>{user.email || user.username}</strong>
              </p>
              <button onClick={onLogout} className="btn-danger">
                Sign Out of Nox
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Avatar Picker Modal */}
      {showAvatarPicker && (
        <div className="modal-overlay" onClick={() => setShowAvatarPicker(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "420px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0 }}>Choose Avatar Music Icon</h3>
              <button className="btn-ghost" onClick={() => setShowAvatarPicker(false)}>✕</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px", margin: "16px 0" }}>
              {MUSIC_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => handleSelectAvatar(icon)}
                  style={{
                    fontSize: "26px",
                    padding: "14px 8px",
                    background: "var(--bg-subtle)",
                    borderRadius: "8px",
                    border: customAvatar === icon ? "2px solid var(--mustard)" : "1px solid var(--border)",
                  }}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}