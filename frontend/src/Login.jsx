import { useState } from "react";
import { login, getMe } from "./api/client";

export default function Login({ onLoginSuccess, onSwitchToRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e, overrideEmail, overridePassword) {
    if (e) e.preventDefault();
    setError("");
    setLoading(true);
    const targetEmail = overrideEmail !== undefined ? overrideEmail : email;
    const targetPassword = overridePassword !== undefined ? overridePassword : password;
    try {
      const loginRes = await login(targetEmail, targetPassword);
      let user = loginRes?.user;
      if (!user) {
        try {
          user = await getMe();
        } catch {
          await new Promise((r) => setTimeout(r, 400));
          user = await getMe();
        }
      }
      onLoginSuccess(user);
    } catch (err) {
      setError(err.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleQuickLogin(accountUsername) {
    setEmail(accountUsername);
    setPassword("password123");
    handleSubmit(null, accountUsername, "password123");
  }

  return (
    <div style={{ width: "100%", maxWidth: "400px" }}>
      {/* Brand Header */}
      <div style={{ textAlign: "center", marginBottom: "28px" }}>
        <div className="vinyl-disc animate-spin-slow" style={{ width: "52px", height: "52px", margin: "0 auto 12px" }} />
        <h1 className="brand-title" style={{ fontSize: "40px", letterSpacing: "0.08em" }}>
          NOX<span className="brand-dot">.</span>
        </h1>
        <p className="meta" style={{ color: "var(--cream-text-dim)", marginTop: "4px" }}>
          The social network for music obsessives
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="card"
        style={{ padding: "32px 28px", display: "flex", flexDirection: "column", gap: "16px", boxShadow: "var(--shadow-lg)" }}
      >
        <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: "12px", marginBottom: "4px" }}>
          <h2 style={{ margin: 0, fontSize: "20px" }}>Sign In</h2>
          <span className="meta" style={{ fontSize: "12px" }}>Access your listening archives and discussions</span>
        </div>

        {error && (
          <div style={{ padding: "10px 14px", background: "rgba(224, 109, 83, 0.15)", border: "1px solid var(--coral)", borderRadius: "var(--radius)", color: "#fca5a5", fontSize: "13px" }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label className="meta" style={{ fontSize: "11px" }}>EMAIL OR USERNAME</label>
          <input
            type="text"
            placeholder="amanx98 or you@frequency.fm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label className="meta" style={{ fontSize: "11px" }}>PASSWORD</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="btn-primary" disabled={loading} style={{ height: "42px", marginTop: "8px" }}>
          {loading ? "Signing in..." : "Enter Nox →"}
        </button>

        {/* Quick Demo Personas */}
        <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px dashed var(--border)", display: "flex", flexDirection: "column", gap: "8px" }}>
          <span className="meta" style={{ fontSize: "10px", letterSpacing: "0.06em", color: "var(--cream-text-dim)", textAlign: "center" }}>
            QUICK SIGN-IN (PASSWORD: password123)
          </span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
            <button
              type="button"
              className="btn-ghost"
              style={{ fontSize: "11px", padding: "6px 8px", border: "1px solid var(--border)", borderRadius: "var(--radius)", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
              onClick={() => handleQuickLogin("amanx98")}
              disabled={loading}
            >
              <span>✦</span> <span>@amanx98</span>
            </button>
            <button
              type="button"
              className="btn-ghost"
              style={{ fontSize: "11px", padding: "6px 8px", border: "1px solid var(--border)", borderRadius: "var(--radius)", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
              onClick={() => handleQuickLogin("miles_ahead")}
              disabled={loading}
            >
              <span>🎷</span> <span>@miles_ahead</span>
            </button>
            <button
              type="button"
              className="btn-ghost"
              style={{ fontSize: "11px", padding: "6px 8px", border: "1px solid var(--border)", borderRadius: "var(--radius)", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
              onClick={() => handleQuickLogin("shoegaze_queen")}
              disabled={loading}
            >
              <span>🎸</span> <span>@shoegaze_queen</span>
            </button>
            <button
              type="button"
              className="btn-ghost"
              style={{ fontSize: "11px", padding: "6px 8px", border: "1px solid var(--border)", borderRadius: "var(--radius)", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
              onClick={() => handleQuickLogin("audiophile_dan")}
              disabled={loading}
            >
              <span>🎧</span> <span>@audiophile_dan</span>
            </button>
          </div>
        </div>
      </form>

      <div style={{ textAlign: "center", marginTop: "20px" }}>
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="btn-ghost"
          style={{ fontSize: "13px" }}
        >
          Need an account? <span style={{ color: "var(--mustard)", textDecoration: "underline", marginLeft: "4px" }}>Register here</span>
        </button>
      </div>
    </div>
  );
}