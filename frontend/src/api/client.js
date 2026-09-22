export const API_BASE = import.meta.env?.VITE_API_URL || import.meta.env?.VITE_API_BASE || "http://localhost:8000";

export function resolveImageUrl(url) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:") || url.startsWith("blob:")) {
    return url;
  }
  if (url.startsWith("/")) {
    return `${API_BASE}${url}`;
  }
  return `${API_BASE}/${url}`;
}

export async function apiRequest(path, options = {}) {
  const token = localStorage.getItem("access_token");

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Request failed: ${response.status}`);
  }

  return response.json();
}

export async function login(email, password) {
  const body = new URLSearchParams();
  body.append("username", email); // OAuth2 spec quirk — same as in Swagger
  body.append("password", password);

  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) throw new Error("Login failed");

  const data = await response.json();
  localStorage.setItem("access_token", data.access_token);
  return data;
}

export async function register(username, email, password) {
  return apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, email, password }),
  });
}

export async function getMe() {
  return apiRequest("/auth/me");
}

export async function updateProfile(data) {
  return apiRequest("/auth/me", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function uploadAvatar(fileOrUrl) {
  const token = localStorage.getItem("access_token");
  const formData = new FormData();
  if (fileOrUrl && (fileOrUrl instanceof File || fileOrUrl instanceof Blob)) {
    formData.append("file", fileOrUrl);
  } else if (typeof fileOrUrl === "string" && fileOrUrl.trim()) {
    formData.append("image_url", fileOrUrl.trim());
  } else {
    formData.append("image_url", "");
  }

  const response = await fetch(`${API_BASE}/auth/avatar`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to update avatar");
  }

  return response.json();
}

export async function uploadBanner(fileOrUrl) {
  const token = localStorage.getItem("access_token");
  const formData = new FormData();
  if (fileOrUrl && (fileOrUrl instanceof File || fileOrUrl instanceof Blob)) {
    formData.append("file", fileOrUrl);
  } else if (typeof fileOrUrl === "string" && fileOrUrl.trim()) {
    formData.append("image_url", fileOrUrl.trim());
  } else {
    formData.append("image_url", "");
  }

  const response = await fetch(`${API_BASE}/auth/banner`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to update banner");
  }

  return response.json();
}

export async function getTags() {
  return apiRequest("/tags/");
}

export async function createTag(name, type) {
  return apiRequest("/tags/", {
    method: "POST",
    body: JSON.stringify({ name, type }),
  });
}

export async function getThreads(tagId = null) {
  const query = tagId ? `?tag_id=${tagId}` : "";
  return apiRequest(`/threads/${query}`);
}

export async function createThread(tagId, title, body) {
  return apiRequest("/threads/", {
    method: "POST",
    body: JSON.stringify({ tag_id: tagId, title, body }),
  });
}

export async function getPosts(threadId) {
  return apiRequest(`/posts/?thread_id=${threadId}`);
}

export async function createPost(threadId, body) {
  return apiRequest("/posts/", {
    method: "POST",
    body: JSON.stringify({ thread_id: threadId, body }),
  });
}

export async function getTopAlbums(period = "overall") {
  return apiRequest(`/lastfm/top-albums?period=${period}`);
}

export async function generateQuilt(period = "overall", quiltType = "albums", gridSize = 3) {
  return apiRequest(
    `/quilts/generate?period=${period}&quilt_type=${quiltType}&grid_size=${gridSize}`,
    { method: "POST" }
  );
}

export async function getTopArtists(period = "overall") {
  return apiRequest(`/lastfm/top-artists?period=${period}`);
}

export async function getQuilts() {
  return apiRequest("/quilts/");
}

export async function deleteQuilt(quiltId) {
  return apiRequest(`/quilts/${quiltId}`, {
    method: "DELETE",
  });
}

export async function getArtistDetails(artistName) {
  try {
    return await apiRequest(`/lastfm/artist-details?artist=${encodeURIComponent(artistName)}`);
  } catch {
    // Graceful fallback with artist name
    return {
      name: artistName,
      image: null,
      images: [],
      fans: null,
      top_tracks: [],
    };
  }
}

export async function likeThread(threadId) {
  return apiRequest(`/threads/${threadId}/like`, { method: "POST" });
}

export async function repostThread(threadId) {
  return apiRequest(`/threads/${threadId}/repost`, { method: "POST" });
}

export async function bookmarkThread(threadId) {
  return apiRequest(`/threads/${threadId}/bookmark`, { method: "POST" });
}

export async function getUserThreads(userId, includeReposts = true) {
  return apiRequest(`/threads/?user_id=${userId}&include_reposts=${includeReposts}`);
}

export async function getUserLikes(userId) {
  return apiRequest(`/threads/user/${userId}/likes`);
}

export async function getUserReposts(userId) {
  return apiRequest(`/threads/user/${userId}/reposts`);
}

export async function getUserBookmarks() {
  return apiRequest("/threads/me/bookmarks");
}

export async function getUserReplies(userId) {
  return apiRequest(`/posts/?user_id=${userId}`);
}

// ---------------------------------------------------------------------------
// Curation Engine API
// ---------------------------------------------------------------------------

/** Get (or rebuild) the current user's taste vector + top tags */
export async function getTasteVector(refresh = false) {
  return apiRequest(`/curation/taste-vector${refresh ? "?refresh=true" : ""}`);
}

/** Get NOX's content-based recommendations (cosine similarity scored) */
export async function getRecommendations(limit = 30) {
  return apiRequest(`/curation/recommendations?limit=${limit}`);
}

/**
 * Side-by-side comparison: our engine vs Last.fm's collaborative filter.
 * Returns overlap, nox_only, lastfm_only, overlap_pct, taste_vector, top_tags.
 */
export async function getEngineComparison() {
  return apiRequest("/curation/compare");
}

/**
 * Generate a playlist (not saved yet).
 * @param {Object} options - { mood?, seed_artist?, name?, length? }
 */
export async function generatePlaylist(options = {}) {
  return apiRequest("/curation/playlist/generate", {
    method: "POST",
    body: JSON.stringify(options),
  });
}

/**
 * Generate and immediately save a playlist to the user's library.
 * @param {Object} options - { mood?, seed_artist?, name?, length? }
 */
export async function saveGeneratedPlaylist(options = {}) {
  return apiRequest("/curation/playlist/save", {
    method: "POST",
    body: JSON.stringify(options),
  });
}

/** Get all saved playlists for the current user */
export async function getPlaylists() {
  return apiRequest("/curation/playlists");
}

/** Delete a saved playlist */
export async function deletePlaylist(playlistId) {
  return apiRequest(`/curation/playlists/${playlistId}`, { method: "DELETE" });
}