import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Menu,
  Plus,
  User as UserIcon,
  LayoutGrid,
  Settings,
  LogOut,
} from "lucide-react";
import Avatar from "../Avatar";
import HeaderSearch from "./HeaderSearch";
import NotificationsPanel from "./NotificationsPanel";
import { cn } from "../../lib/cn";

const NAV_ITEMS = [
  { to: "/", label: "Feed", match: (p) => p === "/" },
  { to: "/topsters", label: "Topsters", match: (p) => p.startsWith("/topsters") },
  { to: "/discover", label: "Discover", match: (p) => p.startsWith("/discover") },
];

export default function Header({
  user,
  onLogout,
  onOpenDrawer,
  isDrawerOpen,
  onOpenComposer,
  onSelectThread,
  onSelectTag,
  drawerTriggerRef,
}) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);
  const location = useLocation();

  // Close profile menu when clicking outside or pressing Escape
  useEffect(() => {
    function handleGlobalEvents(e) {
      if (e.key === "Escape") {
        setIsProfileMenuOpen(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setIsProfileMenuOpen(false);
      }
    }
    if (isProfileMenuOpen) {
      document.addEventListener("mousedown", handleGlobalEvents);
      document.addEventListener("keydown", handleGlobalEvents);
    }
    return () => {
      document.removeEventListener("mousedown", handleGlobalEvents);
      document.removeEventListener("keydown", handleGlobalEvents);
    };
  }, [isProfileMenuOpen]);

  // Close profile menu on route change
  useEffect(() => {
    setIsProfileMenuOpen(false);
  }, [location.pathname]);

  return (
    <header className="sticky top-0 z-[100] w-full h-14 bg-surface/95 backdrop-blur-sm border-b border-border select-none">
      <div className="max-w-[1200px] h-full mx-auto px-4 flex items-center justify-between gap-4">
        {/* Left: mobile menu + wordmark + primary nav */}
        <div className="flex items-center gap-6 min-w-0">
          <div className="flex items-center gap-2">
            <button
              ref={drawerTriggerRef}
              type="button"
              onClick={onOpenDrawer}
              aria-expanded={isDrawerOpen}
              aria-controls="mobile-drawer"
              aria-label={isDrawerOpen ? "Close menu" : "Open menu"}
              className="md:hidden h-9 w-9 -ml-2 flex items-center justify-center rounded-md text-text-muted hover:text-text hover:bg-surface-hover transition-colors cursor-pointer"
            >
              <Menu className="w-5 h-5 stroke-[1.75]" />
            </button>

            <Link to="/" className="rounded-sm" aria-label="Nox home">
              <span className="font-heading font-bold text-xl tracking-tighter text-text">
                NOX<span className="text-accent">.</span>
              </span>
            </Link>
          </div>

          <nav aria-label="Main" className="hidden md:flex items-center gap-1 h-14">
            {NAV_ITEMS.map((item) => (
              <NavLinkItem
                key={item.to}
                to={item.to}
                label={item.label}
                active={item.match(location.pathname)}
              />
            ))}
          </nav>
        </div>

        {/* Right: search, notifications, post, profile */}
        <div className="flex items-center gap-1">
          <HeaderSearch onSelectThread={onSelectThread} onSelectTag={onSelectTag} />
          <NotificationsPanel />

          <button
            type="button"
            onClick={onOpenComposer}
            className="hidden sm:inline-flex items-center gap-1.5 h-8 px-3 ml-2 rounded-md bg-accent text-accent-text hover:bg-accent-hover text-sm font-medium transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.25]" />
            <span>Post</span>
          </button>

          {/* Profile menu */}
          <div ref={profileMenuRef} className="relative ml-2">
            <button
              type="button"
              onClick={() => setIsProfileMenuOpen((prev) => !prev)}
              aria-expanded={isProfileMenuOpen}
              aria-haspopup="menu"
              aria-label="Open profile menu"
              className="flex items-center rounded-full ring-offset-2 ring-offset-surface hover:ring-2 hover:ring-border-strong transition-shadow cursor-pointer"
            >
              <Avatar username={user?.username || "me"} src={user?.avatar_url} size={30} />
            </button>

            {isProfileMenuOpen && (
              <div
                role="menu"
                aria-label="Account"
                className="absolute right-0 top-11 w-56 rounded-lg bg-surface-raised border border-border p-1 shadow-3 z-50 animate-slide-up text-left"
              >
                <div className="px-3 py-2.5 mb-1 border-b border-border">
                  <div className="text-sm font-medium text-text truncate">{user?.username}</div>
                  <div className="text-xs text-text-dim truncate">@{user?.username?.toLowerCase()}</div>
                </div>

                <MenuLink to="/profile" icon={UserIcon} label="Profile" />
                <MenuLink to="/topsters" icon={LayoutGrid} label="Topsters" />
                <MenuLink to="/profile?tab=settings" icon={Settings} label="Settings" />

                <div className="my-1 border-t border-border" />

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    onLogout?.();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-text-muted hover:text-text hover:bg-surface-hover transition-colors cursor-pointer text-left"
                >
                  <LogOut className="w-4 h-4 text-text-dim" />
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function NavLinkItem({ to, label, active }) {
  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative h-full px-3 flex items-center text-sm transition-colors",
        active ? "text-text font-medium" : "text-text-dim hover:text-text-muted"
      )}
    >
      {label}
      {active && (
        <span className="absolute left-3 right-3 -bottom-px h-[2px] rounded-full bg-text" aria-hidden="true" />
      )}
    </Link>
  );
}

function MenuLink({ to, icon: Icon, label }) {
  return (
    <Link
      to={to}
      role="menuitem"
      className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
    >
      <Icon className="w-4 h-4 text-text-dim" />
      <span>{label}</span>
    </Link>
  );
}
