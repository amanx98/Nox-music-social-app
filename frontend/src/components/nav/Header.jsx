import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import Avatar from "../Avatar";
import { cn } from "../../lib/cn";

export default function Header({ user, onLogout, onOpenDrawer, isDrawerOpen }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (!ticking) {
        window.requestAnimationFrame(() => {
          setIsScrolled(currentScrollY > 16);

          // Hide on scroll down past 80px, show immediately on scroll up
          if (currentScrollY > 80 && currentScrollY > lastScrollY.current + 6) {
            setIsHidden(true);
          } else if (currentScrollY < lastScrollY.current - 6 || currentScrollY <= 80) {
            setIsHidden(false);
          }

          lastScrollY.current = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-[100] w-full transition-all duration-200 ease-out border-b",
        isScrolled
          ? "h-14 bg-surface/85 backdrop-blur-md border-border shadow-1"
          : "h-16 bg-surface/50 backdrop-blur-sm border-border/50",
        isHidden ? "-translate-y-full" : "translate-y-0"
      )}
    >
      <div className="max-w-[1240px] h-full mx-auto px-4 flex items-center justify-between gap-4">
        {/* Left: Mobile Burger Trigger & Brand */}
        <div className="flex items-center gap-3">
          {/* 44px Accessible Mobile Menu Trigger */}
          <button
            type="button"
            onClick={onOpenDrawer}
            aria-expanded={isDrawerOpen}
            aria-controls="mobile-drawer"
            aria-label={isDrawerOpen ? "Close navigation drawer" : "Open navigation drawer"}
            className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-md text-text-muted hover:text-text hover:bg-surface-raised transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          {/* Brand Logo with Graffiti Script */}
          <Link
            to="/"
            className="flex items-center gap-2.5 group focus-visible:outline-2 focus-visible:outline-offset-2 rounded-sm"
          >
            <div className="vinyl-disc animate-spin-slow w-7 h-7 flex-shrink-0" aria-hidden="true" />
            <div className="flex items-baseline gap-1">
              <span className="font-graffiti text-2xl tracking-wide text-text group-hover:text-accent transition-colors">
                NOX<span className="text-accent">.</span>
              </span>
              <span className="hidden sm:inline-block font-mono text-2xs uppercase tracking-widest text-text-dim">
                SOUND ARCHIVES
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Desktop Navigation Links */}
        <nav aria-label="Main Navigation" className="hidden md:flex items-center gap-1">
          <NavLinkItem to="/" label="Discussions & Feed" icon="💬" />
          <NavLinkItem to="/profile" label="Profile & Quilts" icon="💽" />
        </nav>

        {/* Right: User Avatar & Quick Actions */}
        <div className="flex items-center gap-3">
          {user && (
            <Link
              to="/profile"
              className="flex items-center gap-2.5 p-1 pr-2 rounded-full hover:bg-surface-raised transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
              title="Open profile"
            >
              <Avatar username={user.username} size={30} />
              <span className="hidden sm:inline-block text-xs font-medium text-text max-w-[120px] truncate">
                {user.username}
              </span>
            </Link>
          )}

          {/* Quick Logout Button */}
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="min-h-[44px] min-w-[44px] md:min-h-[36px] md:min-w-[36px] flex items-center justify-center p-2 rounded-md text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
              title="Sign Out"
              aria-label="Sign out of Nox"
            >
              🚪
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

function NavLinkItem({ to, label, icon }) {
  return (
    <Link
      to={to}
      className="min-h-[44px] md:min-h-[36px] px-3 flex items-center gap-2 rounded-md text-sm font-medium text-text-muted hover:text-text hover:bg-surface-raised transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <span aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}
