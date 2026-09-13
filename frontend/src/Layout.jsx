import { NavLink, Outlet } from "react-router-dom";
import Avatar from "./components/Avatar";

export default function Layout({ user, onLogout }) {
  return (
    <div className="app-shell">
      <nav className="sidebar">
        {/* Brand Header */}
        <div className="sidebar-brand">
          <div className="vinyl-disc animate-spin-slow" style={{ width: "36px", height: "36px" }} />
          <div>
            <h1 className="brand-title" style={{ fontSize: "26px", margin: 0 }}>
              NOX<span className="brand-dot">.</span>
            </h1>
            <span className="meta" style={{ fontSize: "10px", letterSpacing: "0.08em" }}>
              MUSIC ARCHIVES
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="sidebar-nav">
          <SidebarLink to="/" label="Discussions & Feed" icon="💬" end />
          <SidebarLink to="/profile" label="Profile & Quilts" icon="💽" />
        </div>

        {/* User Card & Logout Footer */}
        <div className="sidebar-footer">
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: 1 }}>
            <Avatar username={user?.username || "user"} size={36} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: "13.5px", color: "var(--cream-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user?.username}
              </div>
              <div className="meta" style={{ fontSize: "11px" }}>
                @{user?.username?.toLowerCase()}
              </div>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="btn-icon"
            title="Sign Out"
            style={{ flexShrink: 0, padding: "6px 8px", fontSize: "14px" }}
          >
            🚪
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="main-content">
        <Outlet context={{ user, onLogout }} />
      </main>
    </div>
  );
}

function SidebarLink({ to, label, icon, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
    >
      <span style={{ fontSize: "16px" }}>{icon}</span>
      <span>{label}</span>
    </NavLink>
  );
}