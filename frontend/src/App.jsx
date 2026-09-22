import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { getMe } from "./api/client";
import { ToastProvider } from "./components/Toast";
import CursorSpotlight from "./components/CursorSpotlight";
import Login from "./Login";
import Register from "./Register";
import Layout from "./Layout";
import FeedPage from "./pages/FeedPage";
import ProfilePage from "./pages/ProfilePage";
import TopstersPage from "./pages/TopstersPage";
import DiscoverPage from "./pages/DiscoverPage";
import ErrorBoundary from "./components/ErrorBoundary";

function App() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [showRegister, setShowRegister] = useState(false);

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
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <div style={{ textAlign: "center" }}>
          <div className="vinyl-disc animate-spin-slow" style={{ width: "56px", height: "56px", marginBottom: "16px" }} />
          <div className="brand-title" style={{ fontSize: "28px" }}>NOX<span className="brand-dot">.</span></div>
          <p className="meta" style={{ marginTop: "6px" }}>Tuning frequencies...</p>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <CursorSpotlight />
      {!user ? (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          {showRegister ? (
            <Register
              onRegisterSuccess={() => setShowRegister(false)}
              onSwitchToLogin={() => setShowRegister(false)}
            />
          ) : (
            <Login
              onLoginSuccess={setUser}
              onSwitchToRegister={() => setShowRegister(true)}
            />
          )}
        </div>
      ) : (
        <BrowserRouter>
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Layout user={user} onLogout={handleLogout} />}>
                <Route index element={<FeedPage user={user} />} />
                <Route path="topsters" element={<TopstersPage />} />
                <Route path="discover" element={<DiscoverPage />} />
                <Route path="profile" element={<ProfilePage user={user} initialTab="overview" onLogout={handleLogout} />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </ErrorBoundary>
        </BrowserRouter>
      )}
    </ToastProvider>
  );
}

export default App;