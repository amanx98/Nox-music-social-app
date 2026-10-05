export const API_BASE = import.meta.env?.VITE_API_URL || import.meta.env?.VITE_API_BASE || "";

export function resolveImageUrl(url) {
  if (!url) return "";
  const normalized = url.replace(/\\/g, "/");
  if (normalized.startsWith("http://") || normalized.startsWith("https://") || normalized.startsWith("data:") || normalized.startsWith("blob:")) {
    return normalized;
  }
  if (normalized.startsWith("/")) {
    return `${API_BASE}${normalized}`;
  }
  return `${API_BASE}/${normalized}`;
}

export async function apiRequest(path, options = {}) {
  const token = localStorage.getItem("access_token");

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const timeoutMs = options.timeout ?? 10000;
  const controller = new AbortController();
  
  let timeoutId;
  if (timeoutMs !== false) {
    timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  }

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const err = new Error(errorBody.detail || `Request failed: ${response.status}`);
      err.status = response.status;
      throw err;
    }

    return response.json();
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      const timeoutErr = new Error(`Request to ${path} timed out. Please retry.`);
      timeoutErr.isTimeout = true;
      timeoutErr.status = 408;
      throw timeoutErr;
    }
    throw err;
  }
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

export async function createThread(tagId, title, body, imageUrl = null, mediaType = null) {
  return apiRequest("/threads/", {
    method: "POST",
    body: JSON.stringify({
      tag_id: tagId,
      title,
      body,
      image_url: imageUrl || null,
      media_type: mediaType || null,
    }),
  });
}

export async function uploadThreadMedia(file) {
  const token = localStorage.getItem("access_token");
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/threads/upload-media`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to upload media");
  }

  return response.json();
}

export async function resolveMusicArt(text, tag = "") {
  const params = new URLSearchParams();
  if (text) params.append("text", text);
  if (tag) params.append("tag", tag);
  return apiRequest(`/threads/resolve-music-art?${params.toString()}`);
}

export async function updateThread(threadId, { title, body, imageUrl, mediaType, tagId } = {}) {
  const payload = {};
  if (title !== undefined) payload.title = title;
  if (body !== undefined) payload.body = body;
  if (imageUrl !== undefined) payload.image_url = imageUrl;
  if (mediaType !== undefined) payload.media_type = mediaType;
  if (tagId !== undefined) payload.tag_id = tagId;

  return apiRequest(`/threads/${threadId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
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

export async function updatePost(postId, body) {
  return apiRequest(`/posts/${postId}`, {
    method: "PATCH",
    body: JSON.stringify({ body }),
  });
}

export async function connectLastfm() {
  const data = await apiRequest("/lastfm/login");
  if (data?.login_url) {
    window.location.href = data.login_url;
  }
  return data;
}

export async function getLastfmStatus() {
  return apiRequest("/lastfm/status");
}

export async function getTopAlbums(period = "overall", username = null) {
  const url = username
    ? `/lastfm/top-albums?period=${period}&username=${encodeURIComponent(username)}`
    : `/lastfm/top-albums?period=${period}`;
  return apiRequest(url, { timeout: 30000 });
}

export async function generateQuilt(period = "overall", quiltType = "albums", gridSize = 3) {
  return apiRequest(
    `/quilts/generate?period=${period}&quilt_type=${quiltType}&grid_size=${gridSize}`,
    { method: "POST", timeout: false }
  );
}

export async function getTopArtists(period = "overall", username = null) {
  const url = username
    ? `/lastfm/top-artists?period=${period}&username=${encodeURIComponent(username)}`
    : `/lastfm/top-artists?period=${period}`;
  return apiRequest(url, { timeout: 30000 });
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

export async function getNowPlaying(username) {
  try {
    const url = username
      ? `/lastfm/now-playing?username=${encodeURIComponent(username)}`
      : `/lastfm/now-playing`;
    return await apiRequest(url, { timeout: 10000 });
  } catch {
    return {
      name: null,
      artist: null,
      album: null,
      is_now_playing: false,
      album_art: null,
      landscape_art: null,
      preview_url: null,
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
  return apiRequest(`/curation/taste-vector${refresh ? "?refresh=true" : ""}`, { timeout: 30000 });
}

/** Get NOX's content-based recommendations (cosine similarity scored) */
export async function getRecommendations(limit = 30) {
  return apiRequest(`/curation/recommendations?limit=${limit}`, { timeout: 30000 });
}

/**
 * Side-by-side comparison: our engine vs Last.fm's collaborative filter.
 * Returns overlap, nox_only, lastfm_only, overlap_pct, taste_vector, top_tags.
 */
export async function getEngineComparison() {
  return apiRequest("/curation/compare", { timeout: 60000 });
}

/**
 * Generate a playlist (not saved yet).
 * @param {Object} options - { mood?, seed_artist?, name?, length? }
 */
export async function generatePlaylist(options = {}) {
  return apiRequest("/curation/playlist/generate", {
    method: "POST",
    body: JSON.stringify(options),
    timeout: 30000,
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
    timeout: 30000,
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

// ---------------------------------------------------------------------------
// User Profiles & Social Graph API (Follows & Friendships)
// ---------------------------------------------------------------------------

/** Get public profile for a user by username */
export async function getUserProfile(username) {
  return apiRequest(`/users/${encodeURIComponent(username)}`);
}

/** Get followers of a user */
export async function getUserFollowers(username) {
  return apiRequest(`/users/${encodeURIComponent(username)}/followers`);
}

/** Get accounts followed by a user */
export async function getUserFollowing(username) {
  return apiRequest(`/users/${encodeURIComponent(username)}/following`);
}

/** Get accepted friends of a user */
export async function getUserFriends(username) {
  return apiRequest(`/users/${encodeURIComponent(username)}/friends`);
}

/** Search users by query string */
export async function searchUsers(query) {
  return apiRequest(`/users/search?q=${encodeURIComponent(query)}`);
}

/** Follow a user by user_id */
export async function followUser(userId) {
  return apiRequest(`/users/${userId}/follow`, { method: "POST" });
}

/** Unfollow a user by user_id */
export async function unfollowUser(userId) {
  return apiRequest(`/users/${userId}/unfollow`, { method: "POST" });
}

/** Send a friend request to user_id */
export async function sendFriendRequest(userId) {
  return apiRequest(`/friends/request/${userId}`, { method: "POST" });
}

/** Accept an incoming friend request by request_id */
export async function acceptFriendRequest(requestId) {
  return apiRequest(`/friends/accept/${requestId}`, { method: "POST" });
}

/** Decline an incoming friend request by request_id */
export async function declineFriendRequest(requestId) {
  return apiRequest(`/friends/decline/${requestId}`, { method: "POST" });
}

/** Cancel a pending outgoing friend request by request_id */
export async function cancelFriendRequest(requestId) {
  return apiRequest(`/friends/cancel/${requestId}`, { method: "POST" });
}

/** Remove an existing friend (unfriend) by user_id */
export async function removeFriend(userId) {
  return apiRequest(`/friends/${userId}`, { method: "DELETE" });
}

/** Get all pending friend requests for current user (incoming & outgoing) */
export async function getFriendRequests() {
  return apiRequest("/friends/requests");
}
