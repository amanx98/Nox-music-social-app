import { useState } from "react";
import { login, getMe } from "./api/client";

export default function Login({ onLoginSuccess, onSwitchToRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      const user = await getMe();
      onLoginSuccess(user);
    } catch (err) {
      setError(err.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
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
          <label className="meta" style={{ fontSize: "11px" }}>EMAIL ADDRESS</label>
          <input
            type="email"
            placeholder="you@frequency.fm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
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