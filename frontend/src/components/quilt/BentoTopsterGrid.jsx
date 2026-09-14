import { Crown, Disc, User } from "lucide-react";
import { cn } from "../../lib/cn";

const PERIOD_LABELS = {
  overall: "All Time",
  "7day": "Last 7 Days",
  "1month": "Last Month",
  "3month": "Last 3 Months",
  "6month": "Last 6 Months",
  "12month": "Past Year",
};

function getItemName(obj) {
  if (!obj) return "";
  if (typeof obj.name === "string") return obj.name;
  if (obj.name?.["#text"]) return obj.name["#text"];
  return "Unknown";
}

function getItemArtist(obj) {
  if (!obj) return "";
  if (typeof obj.artist === "string") return obj.artist;
  if (obj.artist?.name) return obj.artist.name;
  if (obj.artist?.["#text"]) return obj.artist["#text"];
  return typeof obj.name === "string" ? obj.name : "Unknown Artist";
}

export default function BentoTopsterGrid({
  items,
  albums = [],
  type = "albums",
  period = "overall",
  isLoading = false,
  onSelectItem,
  onSelectAlbum,
}) {
  const dataList = items || albums || [];
  const handleSelect = onSelectItem || onSelectAlbum;
  const isArtists = type === "artists";

  if (isLoading) {
    return (
      <div className="bento-topster-grid" aria-busy="true" aria-label={`Loading Top ${isArtists ? "Artists" : "Albums"}`}>
        <div className="bento-cell bento-featured aspect-square bg-surface-raised animate-pulse rounded-lg" />
        {[2, 3, 4, 5, 6, 7, 8, 9].map((rank) => (
          <div
            key={rank}
            className={`bento-cell bento-top-${rank} aspect-square bg-surface-raised animate-pulse rounded-lg`}
          />
        ))}
      </div>
    );
  }

  if (!dataList || dataList.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface-raised p-8 text-center">
        <div className="w-10 h-10 rounded-full bg-surface-sunken border border-border flex items-center justify-center mx-auto mb-3 text-text-dim">
          {isArtists ? (
            <User className="w-5 h-5 stroke-[1.75]" />
          ) : (
            <Disc className="w-5 h-5 stroke-[1.75]" />
          )}
        </div>
        <h3 className="font-heading font-bold text-base text-text mb-1">
          {isArtists ? "No artists yet" : "No scrobbles yet"}
        </h3>
        <p className="font-sans text-xs text-text-muted max-w-sm mx-auto">
          Connect your Last.fm account in settings to populate your topster with your listening history.
        </p>
      </div>
    );
  }

  const featured = dataList[0];
  const secondary = [
    { item: dataList[1], rank: 2, areaClass: "bento-top-2" },
    { item: dataList[2], rank: 3, areaClass: "bento-top-3" },
    { item: dataList[3], rank: 4, areaClass: "bento-top-4" },
    { item: dataList[4], rank: 5, areaClass: "bento-top-5" },
    { item: dataList[5], rank: 6, areaClass: "bento-top-6" },
    { item: dataList[6], rank: 7, areaClass: "bento-top-7" },
    { item: dataList[7], rank: 8, areaClass: "bento-top-8" },
    { item: dataList[8], rank: 9, areaClass: "bento-top-9" },
  ];

  // Calculate cumulative stats across the bento topster
  const totalScrobbles = dataList.slice(0, 9).reduce((acc, curr) => {
    return acc + (parseInt(curr?.playcount, 10) || 0);
  }, 0);

  return (
    <div className="space-y-3">
      {/* Topster Summary Bar */}
      <div className="flex items-center justify-between px-1 text-xs font-mono text-text-dim">
        <span>
          <strong className="text-text font-semibold">{PERIOD_LABELS[period] || period}</strong> &middot; {isArtists ? "Top Artists" : "Top Albums"}
        </span>
        <span className="tabular-nums">
          {totalScrobbles.toLocaleString()} plays recorded
        </span>
      </div>

      {/* 1:1 Uncropped Bento Mosaic */}
      <section aria-label="Topster Grid" className="w-full">
        <div className="bento-topster-grid">
          {/* ====================================================================
              1. Primary Cell: Featured #1 (Dominant 2x2 Square Tile)
             ==================================================================== */}
          {featured && (
            <button
              type="button"
              onClick={() => handleSelect?.(featured, 1)}
              className="bento-cell bento-featured aspect-square relative group cursor-pointer text-left focus-visible:ring-2 focus-visible:ring-accent focus:outline-none overflow-hidden"
            >
              {/* Uncropped 1:1 Cover Art / Photography */}
              {featured.image_url ? (
                <img
                  src={featured.image_url}
                  alt={isArtists ? featured.name : `${featured.name} by ${featured.artist}`}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-surface-sunken text-text-dim">
                  {isArtists ? (
                    <User className="w-12 h-12 stroke-[1.5]" />
                  ) : (
                    <Disc className="w-12 h-12 stroke-[1.5]" />
                  )}
                  <span className="mt-2 font-mono text-2xs">
                    {isArtists ? "No Photo" : "No Artwork"}
                  </span>
                </div>
              )}

              {/* Top Badges */}
              <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5">
                <span className="font-mono text-2xs font-black uppercase tracking-wider px-2 py-0.5 rounded bg-accent text-surface shadow-1 flex items-center gap-1">
                  <Crown className="w-3 h-3 stroke-[2.5]" />
                  <span>#1</span>
                </span>
              </div>

              {/* Bottom Information Vignette */}
              <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-3.5 sm:p-5 pt-12 flex flex-col justify-end">
                <h3 className="font-heading text-sm sm:text-lg font-bold text-white tracking-tight line-clamp-1 group-hover:text-accent transition-colors">
                  {getItemName(featured)}
                </h3>
                <p className="text-xs text-white/80 font-medium truncate mt-0.5">
                  {isArtists ? (featured.fans ? `${Number(featured.fans).toLocaleString()} fans` : "Featured Artist") : getItemArtist(featured)}
                </p>
                <div className="mt-1.5 flex items-center justify-between font-mono text-2xs text-white/60">
                  <span className="tabular-nums font-semibold text-accent">
                    {Number(featured.playcount || 0).toLocaleString()} plays
                  </span>
                  <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                    View &rarr;
                  </span>
                </div>
              </div>
            </button>
          )}

          {/* ====================================================================
              2. Secondary Cells: Ranks #02 to #09 (1x1 Square Tiles)
             ==================================================================== */}
          {secondary.map(({ item, rank, areaClass }) => {
            if (!item) {
              return (
                <div
                  key={rank}
                  className={`bento-cell ${areaClass} aspect-square flex flex-col items-center justify-center text-center text-text-dim border-dashed bg-surface-sunken`}
                >
                  <span className="font-mono text-2xs">#{String(rank).padStart(2, "0")}</span>
                  <span className="font-mono text-[10px] mt-0.5">Empty</span>
                </div>
              );
            }

            const sName = getItemName(item);
            const sArtist = getItemArtist(item);

            return (
              <button
                key={rank}
                type="button"
                onClick={() => handleSelect?.(item, rank)}
                className={cn(
                  "bento-cell aspect-square relative group cursor-pointer text-left focus-visible:ring-2 focus-visible:ring-accent focus:outline-none overflow-hidden",
                  areaClass
                )}
              >
                {/* Uncropped 1:1 Cover Art / Photo */}
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={isArtists ? sName : `${sName} by ${sArtist}`}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover transition-transform duration-400 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-surface-sunken text-text-dim">
                    {isArtists ? (
                      <User className="w-6 h-6 stroke-[1.5]" />
                    ) : (
                      <Disc className="w-6 h-6 stroke-[1.5]" />
                    )}
                  </div>
                )}

                {/* Rank Badge */}
                <div className="absolute top-2 left-2 z-10">
                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/75 text-white backdrop-blur-xs">
                    #{String(rank).padStart(2, "0")}
                  </span>
                </div>

                {/* Bottom Information Vignette */}
                <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/90 via-black/55 to-transparent p-2.5 pt-8 flex flex-col justify-end">
                  <h4 className="font-heading text-xs font-bold text-white truncate group-hover:text-accent transition-colors">
                    {sName}
                  </h4>
                  <p className="text-[11px] text-white/70 truncate mt-0.5">
                    {isArtists ? "Artist" : sArtist}
                  </p>
                  <span className="font-mono text-[10px] text-white/50 tabular-nums mt-0.5">
                    {Number(item.playcount || 0).toLocaleString()} plays
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
