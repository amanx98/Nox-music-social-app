import { useState, useRef, useEffect } from "react";
import { Bell, Flame, MessageSquare, Sparkles, CheckCheck, Radio } from "lucide-react";

export default function NotificationsPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(2);
  const panelRef = useRef(null);

  const [notifications, setNotifications] = useState([
    {
      id: "notif-1",
      type: "reaction",
      icon: Flame,
      title: "Active Reaction Wave",
      detail: "Your take in #shoegaze received 12 new reactions.",
      time: "14m ago",
      read: false,
    },
    {
      id: "notif-2",
      type: "topster",
      icon: Sparkles,
      title: "New Station Topster",
      detail: "@resonant posted 'Sub-Bass & Broken Beats 1996'.",
      time: "1h ago",
      read: false,
    },
    {
      id: "notif-3",
      type: "session",
      icon: Radio,
      title: "Broadcast Scheduled",
      detail: "Pirate Radio Control Room live transmission at 02:00.",
      time: "4h ago",
      read: true,
    },
  ]);

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

  function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`Notifications (${unreadCount} unread)`}
        className="relative min-h-[38px] min-w-[38px] flex items-center justify-center p-2 rounded-md text-text-muted hover:text-text hover:bg-surface-raised transition-colors focus-visible:outline-2 focus-visible:outline-accent cursor-pointer"
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
                <span className="font-mono text-[9px] px-1.5 py-0.2 rounded-full bg-accent text-accent-text font-bold">
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

          {notifications.length === 0 ? (
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
                const Icon = item.icon || MessageSquare;
                return (
                  <div
                    key={item.id}
                    className={`p-2.5 rounded-sm border transition-colors flex gap-2.5 ${
                      !item.read
                        ? "bg-surface border-accent/30 hover:border-accent"
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
                          {item.time}
                        </span>
                      </div>
                      <p className="font-sans text-xs text-text-muted mt-0.5 leading-snug">
                        {item.detail}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
