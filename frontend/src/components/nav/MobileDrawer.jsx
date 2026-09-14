import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Avatar from "../Avatar";
import { cn } from "../../lib/cn";

export default function MobileDrawer({ isOpen, onClose, user, onLogout, triggerRef }) {
  const location = useLocation();
  const drawerRef = useRef(null);
  const touchStartX = useRef(0);
  const touchCurrentX = useRef(0);
  const touchStartTime = useRef(0);
  const [dragOffset, setDragOffset] = useState(0);

  // Close drawer automatically on route change
  useEffect(() => {
    if (isOpen) onClose();
  }, [location.pathname]);

  // Focus trap & Escape key listener
  useEffect(() => {
    if (!isOpen) return;

    // Save previous focus & focus first focusable in drawer
    const previouslyFocused = document.activeElement;
    const focusables = drawerRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusables && focusables.length > 0) {
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

    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden"; // Scroll lock

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      if (triggerRef?.current) {
        triggerRef.current.focus();
      } else if (previouslyFocused && previouslyFocused.focus) {
        previouslyFocused.focus();
      }
    };
  }, [isOpen]);

  // Touch gesture swipe dismissal
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchCurrentX.current = e.touches[0].clientX;
    touchStartTime.current = Date.now();
  };

  const handleTouchMove = (e) => {
    touchCurrentX.current = e.touches[0].clientX;
    const diff = touchCurrentX.current - touchStartX.current;
    // Only allow dragging to the left (negative diff) to close
    if (diff < 0) {
      setDragOffset(diff);
    }
  };

  const handleTouchEnd = () => {
    const distance = touchCurrentX.current - touchStartX.current;
    const duration = Date.now() - touchStartTime.current;
    const velocity = Math.abs(distance) / (duration || 1);

    // Dismiss if dragged more than 80px or velocity exceeds threshold
    if (distance < -80 || (distance < -30 && velocity > 0.35)) {
      onClose();
    }
    setDragOffset(0);
  };

  if (!isOpen && dragOffset === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[300] md:hidden"
      aria-hidden={!isOpen}
    >
      {/* Backdrop Scrim */}
      <div
        className={cn(
          "fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200",
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
          {/* Header with Close Button */}
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-border">
            <Link to="/" onClick={onClose} className="flex items-center gap-2">
              <div className="vinyl-disc animate-spin-slow w-6 h-6" aria-hidden="true" />
              <span className="font-graffiti text-xl tracking-wide text-text">
                NOX<span className="text-accent">.</span>
              </span>
            </Link>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close navigation drawer"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-md text-text-muted hover:text-text hover:bg-surface transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Navigation Links (44px min touch targets) */}
          <div className="flex flex-col gap-1.5">
            <DrawerLink
              to="/"
              label="Discussions & Feed"
              icon="💬"
              active={location.pathname === "/"}
              onClick={onClose}
            />
            <DrawerLink
              to="/profile"
              label="Profile & Quilts"
              icon="💽"
              active={location.pathname === "/profile"}
              onClick={onClose}
            />
          </div>
        </div>

        {/* User Footer Card */}
        {user && (
          <div className="pt-4 border-t border-border flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar username={user.username} size={36} />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-text truncate">
                  {user.username}
                </div>
                <div className="text-2xs font-mono text-text-muted">
                  @{user.username.toLowerCase()}
                </div>
              </div>
            </div>

            {onLogout && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 text-danger hover:bg-danger/10 rounded-md transition-colors"
                title="Sign Out"
                aria-label="Sign out"
              >
                🚪
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
      className={cn(
        "min-h-[44px] px-3.5 flex items-center gap-3 rounded-md text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
        active
          ? "bg-accent/15 text-accent border border-accent/30 font-semibold"
          : "text-text-muted hover:text-text hover:bg-surface"
      )}
    >
      <span className="text-base" aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}
