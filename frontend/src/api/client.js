const API_BASE = "http://localhost:8000";

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