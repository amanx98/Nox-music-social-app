import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { getMe } from "./api/client";
import { ToastProvider } from "./components/Toast";
import { AudioProvider } from "./context/AudioContext";
import Layout from "./Layout";
import FeedPage from "./pages/FeedPage";
import ThreadViewPage from "./pages/ThreadViewPage";
import ProfilePage from "./pages/ProfilePage";
import TopstersPage from "./pages/TopstersPage";
import DiscoverPage from "./pages/DiscoverPage";
import CommunityPage from "./pages/CommunityPage";
import ErrorBoundary from "./components/ErrorBoundary";

function App() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function checkAuth() {
      const token = localStorage.getItem("access_token");
      if (!token) {
        if (mounted) setLoadingUser(false);
        return;
      }
      try {
        let me = null;
        try {
          me = await getMe();
        } catch (firstErr) {
          if (
            firstErr.status === 401 ||
            firstErr.message?.toLowerCase().includes("token") ||
            firstErr.message?.includes("401") ||
            firstErr.message?.toLowerCase().includes("unauthorized")
          ) {
            throw firstErr;
          }
          // Retry once on transient network/timeout error before falling back to login
          await new Promise((r) => setTimeout(r, 500));
          me = await getMe();
        }
        if (mounted && me) setUser(me);
      } catch (err) {
        console.warn("Auth check failed:", err);
        if (
          err.status === 401 ||
          err.message?.toLowerCase().includes("token") ||
          err.message?.includes("401") ||
          err.message?.toLowerCase().includes("unauthorized")
        ) {
          localStorage.removeItem("access_token");
        }
      } finally {
        if (mounted) setLoadingUser(false);
      }
    }
    checkAuth();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    async function refreshUser(e) {
      if (e?.detail && typeof e.detail === "object") {
        setUser((prev) => (prev ? { ...prev, ...e.detail } : e.detail));
      } else {
        try {
          const me = await getMe();
          setUser(me);
        } catch {
          // keep existing user state if refresh request fails
        }
      }
    }
    window.addEventListener("nox-profile-updated", refreshUser);
    return () => window.removeEventListener("nox-profile-updated", refreshUser);
  }, []);

  function handleLogout() {
    localStorage.removeItem("access_token");
    setUser(null);
  }

  if (loadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="brand-title text-[28px] animate-pulse" aria-label="Loading">
          NOX<span className="brand-dot">.</span>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <AudioProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <Routes>
              <Route
                path="/"
                element={
                  <Layout
                    user={user}
                    onLogout={handleLogout}
                    onLoginSuccess={setUser}
                  />
                }
              >
                <Route index element={<FeedPage user={user} />} />
                <Route path="threads/:threadId" element={<ThreadViewPage user={user} />} />
                <Route path="topsters" element={<TopstersPage user={user} />} />
                <Route path="discover" element={<DiscoverPage />} />
                <Route path="c/:tagName" element={<CommunityPage user={user} />} />
                <Route path="community/:tagName" element={<CommunityPage user={user} />} />
                <Route
                  path="profile"
                  element={
                    user ? (
                      <ProfilePage user={user} initialTab="overview" onLogout={handleLogout} />
                    ) : (
                      <Navigate to="/" replace />
                    )
                  }
                />
                <Route
                  path="profile/:username"
                  element={<ProfilePage user={user} onLogout={handleLogout} />}
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </ErrorBoundary>
        </BrowserRouter>
      </AudioProvider>
    </ToastProvider>
  );
}

export default App;