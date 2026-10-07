import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { Headphones, ChevronDown, Disc3 } from "lucide-react";
import { getUserFriends, getUserFollowing, getNowPlaying } from "../../api/client";
import Avatar from "../Avatar";
import { cn } from "../../lib/cn";

const ROTATE_MS = 9000; // slow, deliberate pace — one friend at a time
const POLL_MS = 90000; // refresh the circle's listening every 90s
const MAX_PEOPLE = 12;

/**
 * CircleNowPlaying
 * A quiet strip under the header showing what people in your circle
 * (friends + people you follow) are listening to. One person at a time,
 * gently cross-fading. Click "Circle" to see everyone at once.
 */
export default function CircleNowPlaying({ user }) {
  const [entries, setEntries] = useState([]);
  const [circleSize, setCircleSize] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const loadCircle = useCallback(async () => {
    if (!user?.username) return;
    try {
      const [friends, following] = await Promise.all([
        getUserFriends(user.username).catch(() => []),
        getUserFollowing(user.username).catch(() => []),
      ]);

      // Friends first, then follows; de-duplicated
      const seen = new Set();
      const people = [...(friends || []), ...(following || [])].filter((p) => {
        if (!p?.username || p.username === user.username || seen.has(p.username)) return false;
        seen.add(p.username);
        return true;
      }).slice(0, MAX_PEOPLE);

      setCircleSize(people.length);

      const results = await Promise.allSettled(
        people.map(async (p) => {
          const np = await getNowPlaying(p.username, { linkedOnly: true });
          return np?.name && np?.artist ? { person: p, track: np } : null;
        })
      );

      const next = results
        .map((r) => (r.status === "fulfilled" ? r.value : null))
        .filter(Boolean)
        // Live listeners first
        .sort((a, b) => Number(b.track.is_now_playing) - Number(a.track.is_now_playing));

      setEntries(next);
      setIndex((i) => (next.length ? i % next.length : 0));
    } finally {
      setLoaded(true);
    }
  }, [user?.username]);

  useEffect(() => {
    loadCircle();
    const id = setInterval(loadCircle, POLL_MS);
    return () => clearInterval(id);
  }, [loadCircle]);

  // Slow rotation, paused on hover/focus or while the list is open
  useEffect(() => {
    if (paused || open || entries.length < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % entries.length), ROTATE_MS);
    return () => clearInterval(id);
  }, [paused, open, entries.length]);

  // Close list on outside click / Escape
  useEffect(() => {
    if (!open) return;
    function onEvent(e) {
      if (e.key === "Escape") setOpen(false);
      if (e.type === "mousedown" && rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onEvent);
    document.addEventListener("keydown", onEvent);
    return () => {
      document.removeEventListener("mousedown", onEvent);
      document.removeEventListener("keydown", onEvent);
    };
  }, [open]);

  const liveCount = entries.filter((e) => e.track.is_now_playing).length;
  const current = entries[index];

  return (
    <div
      ref={rootRef}
      role="region"
      aria-label="What your circle is listening to"
      className="relative z-30 w-full border-b border-border bg-surface"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="max-w-[1200px] mx-auto h-10 px-4 flex items-center gap-3">
        {/* Circle toggle */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="circle-list"
          disabled={entries.length === 0}
          className="shrink-0 inline-flex items-center gap-1.5 h-7 px-2 -ml-2 rounded-md text-xs text-text-muted hover:text-text hover:bg-surface-hover transition-colors cursor-pointer disabled:opacity-100 disabled:cursor-default"
        >
          <Headphones className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="font-medium">Circle</span>
          {liveCount > 0 && (
            <span className="inline-flex items-center gap-1 text-text-dim">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" aria-hidden="true" />
              <span className="tabular-nums">{liveCount} listening</span>
            </span>
          )}
          {entries.length > 0 && (
            <ChevronDown className={cn("w-3 h-3 text-text-dim transition-transform", open && "rotate-180")} aria-hidden="true" />
          )}
        </button>

        <span className="w-px h-4 bg-border shrink-0" aria-hidden="true" />

        {/* Current listener */}
        <div className="flex-1 min-w-0" aria-live="polite">
          {!loaded ? (
            <div className="h-3 w-48 rounded bg-surface-hover animate-pulse" />
          ) : current ? (
            <NowPlayingLine key={`${current.person.username}-${index}`} entry={current} />
          ) : (
            <p className="m-0 text-xs text-text-dim truncate">
              {circleSize === 0
                ? "Follow people to see what they're listening to."
                : "Your circle is quiet right now."}
            </p>
          )}
        </div>

        {/* Position indicator */}
        {entries.length > 1 && (
          <div className="hidden sm:flex items-center gap-1 shrink-0" aria-hidden="true">
            {entries.map((e, i) => (
              <span
                key={e.person.username}
                className={cn(
                  "h-1 rounded-full transition-all duration-500",
                  i === index ? "w-3 bg-text-muted" : "w-1 bg-border-strong"
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* Full circle list */}
      {open && entries.length > 0 && (
        <div
          id="circle-list"
          className="absolute left-0 right-0 top-full z-40 animate-slide-up"
        >
          <div className="max-w-[1200px] mx-auto px-4">
            <ul className="w-full sm:w-96 m-0 p-1.5 list-none rounded-lg border border-border bg-surface-raised shadow-3 max-h-[60vh] overflow-y-auto">
              {entries.map((e, i) => (
                <li key={e.person.username}>
                  <Link
                    to={`/profile/${encodeURIComponent(e.person.username)}`}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-md hover:bg-surface-hover transition-colors",
                      i === index && "bg-surface-hover/60"
                    )}
                  >
                    <AlbumArt src={e.track.album_art} size={36} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-text truncate">{e.track.name}</div>
                      <div className="text-xs text-text-dim truncate">{e.track.artist}</div>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-0.5">
                      <span className="text-xs text-text-muted">{e.person.username}</span>
                      <span className="text-[11px] text-text-dim">
                        {e.track.is_now_playing ? "Listening now" : "Recently"}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function NowPlayingLine({ entry }) {
  const { person, track } = entry;
  return (
    <div className="flex items-center gap-2 min-w-0 animate-circle-in">
      <Link
        to={`/profile/${encodeURIComponent(person.username)}`}
        className="shrink-0 flex items-center gap-1.5 text-xs text-text-muted hover:text-text transition-colors"
      >
        <Avatar username={person.username} src={person.avatar_url} size={18} />
        <span className="font-medium max-w-[120px] truncate">{person.username}</span>
      </Link>
      {track.is_now_playing ? <EqBars /> : <span className="text-xs text-text-dim shrink-0">played</span>}
      <AlbumArt src={track.album_art} size={18} />
      <span className="text-xs truncate min-w-0">
        <span className="text-text">{track.name}</span>
        <span className="text-text-dim"> — {track.artist}</span>
      </span>
    </div>
  );
}

function AlbumArt({ src, size }) {
  if (!src) {
    return (
      <span
        className="shrink-0 rounded-sm bg-surface-hover flex items-center justify-center text-text-dim"
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        <Disc3 style={{ width: size * 0.55, height: size * 0.55 }} />
      </span>
    );
  }
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      className="shrink-0 rounded-sm object-cover"
      style={{ width: size, height: size }}
    />
  );
}

function EqBars() {
  return (
    <span className="shrink-0 inline-flex items-end gap-[2px] h-3" aria-label="Listening now" role="img">
      <span className="w-[2px] bg-accent rounded-full animate-eq-1" />
      <span className="w-[2px] bg-accent rounded-full animate-eq-2" />
      <span className="w-[2px] bg-accent rounded-full animate-eq-3" />
    </span>
  );
}
