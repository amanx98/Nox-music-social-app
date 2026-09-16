import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { X, MessageSquare, LayoutGrid, Radio, LogOut, User } from "lucide-react";
import Avatar from "../Avatar";
import { cn } from "../../lib/cn";

export default function MobileDrawer({ isOpen, onClose, user, onLogout, triggerRef }) {
  const location = useLocation();
  const drawerRef = useRef(null);
  const [dragOffset, setDragOffset] = useState(0);
  const touchStartX = useRef(0);
  const touchCurrentX = useRef(0);
  const touchStartTime = useRef(0);

  const prevPathRef = useRef(location.pathname);

  // Close only on actual route change (do not close immediately when opening)
  useEffect(() => {
    if (prevPathRef.current !== location.pathname) {
      prevPathRef.current = location.pathname;
      if (isOpen) onClose();
    }
  }, [location.pathname, isOpen, onClose]);

  // Focus trap & Escape key listener
  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement;
    const drawerElement = drawerRef.current;

    const getFocusables = () => {
      if (!drawerElement) return [];
      return drawerElement.querySelectorAll(
        'a[href], button:not([disabled]), textarea:not([disabled]), input[type="text"]:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
    };

    const focusables = getFocusables();
    if (focusables.length > 0) {
      focusables[0].focus();
    }

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "Tab") {
        if (!focusables || focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    const triggerEl = triggerRef?.current;
    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden"; // Scroll lock

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      if (triggerEl) {
        triggerEl.focus();
      } else if (previouslyFocused && previouslyFocused.focus) {
        previouslyFocused.focus();
      }
    };
  }, [isOpen, onClose, triggerRef]);

  // Touch Swipe Gesture Dismissal
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchCurrentX.current = e.touches[0].clientX;
    touchStartTime.current = Date.now();
  };

  const handleTouchMove = (e) => {
    touchCurrentX.current = e.touches[0].clientX;
    const diff = touchCurrentX.current - touchStartX.current;
    if (diff < 0) {
      setDragOffset(diff);
    }
  };

  const handleTouchEnd = () => {
    const distance = touchCurrentX.current - touchStartX.current;
    const duration = Date.now() - touchStartTime.current;
    const velocity = Math.abs(distance) / (duration || 1);

    if (distance < -80 || (distance < -30 && velocity > 0.35)) {
      onClose();
    }
    setDragOffset(0);
  };

  if (!isOpen && dragOffset === 0) return null;

  return (
    <div className="fixed inset-0 z-[300]" aria-hidden={!isOpen}>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/65 backdrop-blur-sm transition-opacity duration-200",
          isOpen ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <nav
        ref={drawerRef}
        id="mobile-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation drawer"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: dragOffset ? `translateX(${dragOffset}px)` : undefined,
        }}
        className={cn(
          "fixed top-0 bottom-0 left-0 z-[310] w-[280px] max-w-[85vw] bg-surface-raised border-r border-border p-5 flex flex-col justify-between shadow-5 transition-transform ease-out",
          isOpen ? "translate-x-0 duration-300" : "-translate-x-full duration-250"
        )}
      >
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-border">
            <Link to="/" onClick={onClose} className="flex items-center gap-2">
              <span className="font-heading font-extrabold text-xl tracking-tight text-text">
                NOX<span className="text-accent">.</span>
              </span>
            </Link>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-black hover:bg-accent transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Links */}
          <div className="flex flex-col gap-1.5">
            <DrawerLink
              to="/"
              label="Feed"
              icon={<MessageSquare className="w-4 h-4 stroke-[1.75]" />}
              active={location.pathname === "/"}
              onClick={onClose}
            />
            <DrawerLink
              to="/topsters"
              label="Topsters"
              icon={<LayoutGrid className="w-4 h-4 stroke-[1.75]" />}
              active={location.pathname === "/topsters"}
              onClick={onClose}
            />
            <DrawerLink
              to="/discover"
              label="Discover"
              icon={<Radio className="w-4 h-4 stroke-[1.75]" />}
              active={location.pathname.startsWith("/discover")}
              onClick={onClose}
            />
            <DrawerLink
              to="/profile"
              label="Profile"
              icon={<User className="w-4 h-4 stroke-[1.75]" />}
              active={location.pathname === "/profile"}
              onClick={onClose}
            />
          </div>
        </div>

        {/* User Footer Card */}
        {user && (
          <div className="pt-4 border-t border-border flex items-center justify-between gap-3">
            <Link
              to="/profile"
              onClick={onClose}
              className="flex items-center gap-2.5 min-w-0 group hover:opacity-85 transition-opacity"
            >
              <Avatar username={user.username} size={34} />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-text group-hover:text-accent transition-colors truncate">
                  {user.username}
                </div>
                <div className="font-mono text-2xs text-text-muted truncate">
                  @{user.username.toLowerCase()}
                </div>
              </div>
            </Link>

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </nav>
    </div>
  );
}

function DrawerLink({ to, label, icon, active, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      style={active ? { color: "#0A0B0A", backgroundColor: "var(--color-accent)" } : undefined}
      className={cn(
        "drawer-link-item h-9 px-3.5 flex items-center gap-3 rounded-md text-xs font-heading font-semibold transition-all focus-visible:outline-2 focus-visible:outline-accent",
        active
          ? "active-drawer-link bg-accent text-black shadow-1 font-bold"
          : "text-text hover:bg-accent hover:text-black"
      )}
    >
      <span aria-hidden="true" className="transition-colors pointer-events-none flex items-center">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}
