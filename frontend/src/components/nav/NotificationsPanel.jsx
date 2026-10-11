import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Bell, Flame, MessageSquare, Sparkles, CheckCheck, Radio, Heart, Repeat, UserPlus, Loader2 } from "lucide-react";
import { getNotifications } from "../../api/client";

function formatTimeAgo(dateString) {
  if (!dateString) return "just now";
  const date = new Date(dateString);
  const now = new Date();
  const diffInSecs = Math.floor((now - date) / 1000);

  if (diffInSecs < 60) return "just now";
  if (diffInSecs < 3600) return `${Math.floor(diffInSecs / 60)}m ago`;
  if (diffInSecs < 86400) return `${Math.floor(diffInSecs / 3600)}h ago`;
  if (diffInSecs < 604800) return `${Math.floor(diffInSecs / 86400)}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getIconForType(type) {
  switch (type) {
    case "reply":
      return MessageSquare;
    case "like":
      return Flame;
    case "repost":
      return Repeat;
    case "friend_request":
      return UserPlus;
    default:
      return Radio;
  }
}

export default function NotificationsPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [readIds, setReadIds] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem("nox_read_notifs") || "[]"));
    } catch {
      return new Set();
    }
  });
  const panelRef = useRef(null);

  const fetchNotifs = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setNotifications([]);
      return;
    }
    setLoading(true);
    try {
      const data = await getNotifications();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      // quiet fail on network issues
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 45000); // refresh every 45s
    return () => clearInterval(interval);
  }, [fetchNotifs]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  function handleMarkAllRead() {
    const allIds = new Set([...readIds, ...notifications.map((n) => n.id)]);
    setReadIds(allIds);
    localStorage.setItem("nox_read_notifs", JSON.stringify([...allIds]));
  }

  function handleItemClick(id) {
    const updated = new Set(readIds);
    updated.add(id);
    setReadIds(updated);
    localStorage.setItem("nox_read_notifs", JSON.stringify([...updated]));
    setIsOpen(false);
  }

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`Notifications (${unreadCount} unread)`}
        className="notifications-trigger relative min-h-[38px] min-w-[38px] flex items-center justify-center p-2 rounded-md text-text-muted hover:text-black hover:bg-accent transition-colors focus-visible:outline-2 focus-visible:outline-accent cursor-pointer"
      >
        <Bell className="w-4 h-4 stroke-[2]" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent ring-2 ring-surface animate-pulse" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-11 w-80 sm:w-96 rounded-md bg-surface-raised border border-border p-3 shadow-5 z-50 animate-slide-up text-left">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-border">
            <div className="flex items-center gap-1.5">
              <span className="font-heading font-bold text-xs uppercase tracking-wider text-text">
                Transmissions &amp; Signals
              </span>
              {unreadCount > 0 && (
                <span className="font-mono text-[9px] px-1.5 py-0.2 rounded-full bg-accent text-black font-bold">
                  {unreadCount}
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-1 font-mono text-2xs text-text-dim hover:text-accent transition-colors cursor-pointer"
              >
                <CheckCheck className="w-3 h-3" />
                <span>Mark read</span>
              </button>
            )}
          </div>

          {loading && notifications.length === 0 ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-accent" />
              <span className="font-mono text-2xs text-text-dim">Scanning signals...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-8 text-center">
              <p className="font-heading font-bold text-xs text-text mb-0.5">
                All quiet on frequencies
              </p>
              <p className="font-mono text-2xs text-text-dim">
                No active notifications or signals at this time.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[340px] overflow-y-auto no-scrollbar">
              {notifications.map((item) => {
                const Icon = getIconForType(item.type);
                const isRead = readIds.has(item.id);
                const Content = (
                  <div
                    onClick={() => handleItemClick(item.id)}
                    className={`p-2.5 rounded-sm border transition-colors flex gap-2.5 cursor-pointer ${
                      !isRead
                        ? "bg-surface border-accent/40 hover:border-accent"
                        : "bg-surface-sunken/60 border-border hover:border-border-strong"
                    }`}
                  >
                    <div className="shrink-0 mt-0.5 w-6 h-6 rounded flex items-center justify-center bg-surface-raised border border-border text-accent">
                      <Icon className="w-3 h-3 stroke-[2]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-heading font-bold text-xs text-text truncate">
                          {item.title}
                        </span>
                        <span className="font-mono text-[10px] text-text-dim shrink-0">
                          {formatTimeAgo(item.created_at)}
                        </span>
                      </div>
                      <p className="font-sans text-xs text-text-muted mt-0.5 leading-snug">
                        {item.detail}
                      </p>
                    </div>
                  </div>
                );

                return item.link ? (
                  <Link key={item.id} to={item.link} className="block no-underline">
                    {Content}
                  </Link>
                ) : (
                  <div key={item.id}>{Content}</div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
