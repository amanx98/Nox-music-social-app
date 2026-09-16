import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Menu,
  MessageSquare,
  LayoutGrid,
  Radio,
  Plus,
  User as UserIcon,
  Settings,
  LogOut,
  ChevronDown,
} from "lucide-react";
import Avatar from "../Avatar";
import HeaderSearch from "./HeaderSearch";
import NotificationsPanel from "./NotificationsPanel";
import { cn } from "../../lib/cn";

export default function Header({
  user,
  onLogout,
  onOpenDrawer,
  isDrawerOpen,
  onOpenComposer,
  onSelectThread,
  onSelectTag,
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
    <header className="sticky top-0 z-[100] w-full h-14 bg-surface/90 backdrop-blur-md border-b border-border shadow-1 select-none">
      <div className="max-w-[1440px] h-full mx-auto px-4 flex items-center justify-between gap-3">
        {/* Left: Mobile Drawer Trigger & NOX Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenDrawer}
            aria-expanded={isDrawerOpen}
            aria-controls="mobile-drawer"
            aria-label={isDrawerOpen ? "Close menu" : "Open menu"}
            className="md:hidden min-h-[38px] min-w-[38px] flex items-center justify-center p-2 rounded-md text-text-muted hover:text-black hover:bg-accent transition-colors focus-visible:outline-2 focus-visible:outline-accent cursor-pointer"
          >
            <Menu className="w-5 h-5 stroke-[1.75]" />
          </button>

          {/* Wordmark with acid lime period */}
          <Link
            to="/"
            className="flex items-center gap-1 group focus-visible:outline-2 focus-visible:outline-accent rounded-sm"
            aria-label="Nox Home"
          >
            <span className="font-heading font-extrabold text-2xl tracking-tighter text-text group-hover:text-accent transition-colors">
              NOX<span className="text-accent">.</span>
            </span>
            <span className="hidden sm:inline-block font-mono text-[9px] uppercase tracking-widest text-text-dim px-1.5 py-0.5 ml-1 border border-border rounded-[3px] bg-surface-sunken">
              RADIO-DESK
            </span>
          </Link>
        </div>

        {/* Center: Primary Destinations (Feed, Topsters, Discover) */}
        <nav aria-label="Main Navigation" className="hidden md:flex items-center gap-1">
          <NavLinkItem
            to="/"
            label="Feed"
            icon={<MessageSquare className="w-3.5 h-3.5" />}
            active={location.pathname === "/"}
          />
          <NavLinkItem
            to="/topsters"
            label="Topsters"
            icon={<LayoutGrid className="w-3.5 h-3.5" />}
            active={location.pathname.startsWith("/topsters")}
          />
          <NavLinkItem
            to="/discover"
            label="Discover"
            icon={<Radio className="w-3.5 h-3.5" />}
            active={location.pathname.startsWith("/discover")}
          />
        </nav>

        {/* Right: Search, Notifications, Compose, Profile Menu */}
        <div className="flex items-center gap-2">
          {/* Desktop Search Input with Debounced Querying */}
          <HeaderSearch onSelectThread={onSelectThread} onSelectTag={onSelectTag} />

          {/* Notifications Panel */}
          <NotificationsPanel />

          {/* Primary Transmit / Compose Action */}
          <button
            type="button"
            onClick={onOpenComposer}
            className="transmit-btn hidden sm:inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-accent text-black hover:bg-accent-hover hover:text-black font-heading font-bold text-xs tracking-tight transition-all active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent cursor-pointer shadow-1"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Transmit</span>
          </button>

          {/* Current User Avatar & Profile Dropdown */}
          <div ref={profileMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setIsProfileMenuOpen((prev) => !prev)}
              aria-expanded={isProfileMenuOpen}
              aria-haspopup="true"
              aria-label="Open profile menu"
              className="profile-trigger flex items-center gap-1.5 p-1 rounded-md hover:bg-accent hover:text-black border border-transparent hover:border-accent transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-accent group"
            >
              <Avatar username={user?.username || "me"} size={28} />
              <span className="hidden lg:inline text-xs font-heading font-semibold text-text group-hover:text-black max-w-[100px] truncate transition-colors">
                {user?.username}
              </span>
              <ChevronDown
                className={cn(
                  "w-3 h-3 text-text-dim group-hover:text-black transition-all duration-150",
                  isProfileMenuOpen && "rotate-180 text-text"
                )}
              />
            </button>

            {/* Accessible Profile Menu Dropdown */}
            {isProfileMenuOpen && (
              <div
                role="menu"
                aria-label="User account actions"
                className="absolute right-0 top-11 w-56 rounded-md bg-surface-raised border border-border p-1.5 shadow-5 z-50 animate-slide-up text-left divide-y divide-border/60"
              >
                {/* User Info Header */}
                <div className="px-3 py-2">
                  <div className="font-heading font-bold text-xs text-text truncate">
                    {user?.username}
                  </div>
                  <div className="font-mono text-[11px] text-text-dim truncate">
                    @{user?.username?.toLowerCase()}
                  </div>
                </div>

                {/* Navigation Links */}
                <div className="py-1">
                  <Link
                    to="/profile"
                    role="menuitem"
                    className="profile-menu-item flex items-center gap-2 px-3 py-2 rounded-sm text-xs font-medium text-text-muted hover:text-black hover:bg-accent transition-colors group"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-accent group-hover:text-black transition-colors" />
                    <span>Archivist Profile</span>
                  </Link>

                  <Link
                    to="/topsters"
                    role="menuitem"
                    className="profile-menu-item flex items-center gap-2 px-3 py-2 rounded-sm text-xs font-medium text-text-muted hover:text-black hover:bg-accent transition-colors group"
                  >
                    <LayoutGrid className="w-3.5 h-3.5 text-accent group-hover:text-black transition-colors" />
                    <span>Topsters &amp; Quilts</span>
                  </Link>

                  <Link
                    to="/profile?tab=settings"
                    role="menuitem"
                    className="profile-menu-item flex items-center gap-2 px-3 py-2 rounded-sm text-xs font-medium text-text-muted hover:text-black hover:bg-accent transition-colors group"
                  >
                    <Settings className="w-3.5 h-3.5 text-text-dim group-hover:text-black transition-colors" />
                    <span>Desk Settings</span>
                  </Link>
                </div>

                {/* Sign Out Action */}
                <div className="pt-1">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      onLogout?.();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-sm text-xs font-medium text-danger hover:bg-danger/20 transition-colors cursor-pointer text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function NavLinkItem({ to, label, icon, active }) {
  return (
    <Link
      to={to}
      style={active ? { color: "#0A0B0A", backgroundColor: "var(--color-accent)" } : undefined}
      className={cn(
        "nav-link-item h-8 px-3.5 flex items-center gap-2 rounded-md font-heading text-xs font-semibold tracking-tight transition-all focus-visible:outline-2 focus-visible:outline-accent",
        active
          ? "active-nav-link bg-accent text-black font-bold shadow-1"
          : "text-text hover:bg-accent hover:text-black"
      )}
    >
      <span aria-hidden="true" className="transition-colors pointer-events-none flex items-center">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}
