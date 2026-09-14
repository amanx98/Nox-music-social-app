import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { MessageSquare, LayoutGrid, LogOut, Menu } from "lucide-react";
import Avatar from "../Avatar";
import { cn } from "../../lib/cn";

export default function Header({ user, onLogout, onOpenDrawer, isDrawerOpen }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const lastScrollY = useRef(0);
  const location = useLocation();

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
          ? "h-14 bg-surface/90 backdrop-blur-md border-border shadow-1"
          : "h-14 bg-surface/75 backdrop-blur-sm border-border/50",
        isHidden ? "-translate-y-full" : "translate-y-0"
      )}
    >
      <div className="max-w-[1240px] h-full mx-auto px-4 flex items-center justify-between gap-4">
        {/* Left: Mobile Burger Trigger & Brand */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenDrawer}
            aria-expanded={isDrawerOpen}
            aria-controls="mobile-drawer"
            aria-label={isDrawerOpen ? "Close menu" : "Open menu"}
            className="md:hidden min-h-[40px] min-w-[40px] flex items-center justify-center p-2 rounded-lg text-text-muted hover:text-text hover:bg-surface-raised transition-colors focus-visible:outline-2"
          >
            <Menu className="w-5 h-5 stroke-[1.75]" />
          </button>

          {/* Brand Logo with Syne Heading */}
          <Link
            to="/"
            className="flex items-center gap-2 group focus-visible:outline-2 rounded-sm"
          >
            <span className="font-heading font-extrabold text-xl tracking-tight text-text group-hover:text-accent transition-colors">
              NOX<span className="text-accent">.</span>
            </span>
          </Link>
        </div>

        {/* Center: Desktop Navigation Tabs */}
        <nav aria-label="Main Navigation" className="hidden md:flex items-center gap-1">
          <NavLinkItem
            to="/"
            label="Feed"
            icon={<MessageSquare className="w-4 h-4 stroke-[1.75]" />}
            active={location.pathname === "/"}
          />
          <NavLinkItem
            to="/profile"
            label="Topsters & Quilts"
            icon={<LayoutGrid className="w-4 h-4 stroke-[1.75]" />}
            active={location.pathname === "/profile"}
          />
        </nav>

        {/* Right: User Avatar & Quick Actions */}
        <div className="flex items-center gap-2">
          {user && (
            <Link
              to="/profile"
              className="flex items-center gap-2 py-1 px-2 rounded-full hover:bg-surface-raised border border-transparent hover:border-border transition-colors focus-visible:outline-2"
              title="Open profile"
            >
              <Avatar username={user.username} size={28} />
              <span className="hidden sm:inline-block font-sans text-xs font-semibold text-text max-w-[110px] truncate">
                {user.username}
              </span>
            </Link>
          )}

          {/* Sign Out Button */}
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors focus-visible:outline-2 cursor-pointer"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4 stroke-[1.75]" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

function NavLinkItem({ to, label, icon, active }) {
  return (
    <Link
      to={to}
      className={cn(
        "h-9 px-3.5 flex items-center gap-2 rounded-lg text-xs font-semibold transition-colors focus-visible:outline-2",
        active
          ? "bg-surface-raised text-accent border border-border/80 shadow-1"
          : "text-text-muted hover:text-text hover:bg-surface-raised/60"
      )}
    >
      <span aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}
