import Badge from "../ui/Badge";

const PERIOD_LABELS = {
  overall: "All-Time Canon",
  "7day": "Last 7 Days (Heavy Rotation)",
  "1month": "Last Month",
  "3month": "Last 3 Months",
  "6month": "Last 6 Months",
  "12month": "Past Year",
};

export default function BentoTopsterGrid({
  albums = [],
  period = "overall",
  isLoading = false,
  onSelectAlbum,
}) {

  if (isLoading) {
    return (
      <div className="bento-topster-grid" aria-busy="true" aria-label="Loading Bento Topster">
        <div className="bento-cell bento-featured p-6 flex flex-col justify-between bg-surface-raised animate-pulse">
          <div className="w-24 h-5 bg-border rounded" />
          <div className="w-3/4 h-8 bg-border rounded my-4" />
          <div className="w-1/2 h-4 bg-border rounded" />
        </div>
        {[2, 3, 4, 5].map((rank) => (
          <div
            key={rank}
            className={`bento-cell bento-top-${rank} p-4 flex flex-col justify-end bg-surface-raised animate-pulse`}
          >
            <div className="w-16 h-4 bg-border rounded mb-2" />
            <div className="w-full h-4 bg-border rounded" />
          </div>
        ))}
        <div className="bento-cell bento-stat-highlight p-4 bg-surface-raised animate-pulse" />
        {[6, 7, 8].map((rank) => (
          <div
            key={rank}
            className={`bento-cell bento-rank-${rank} p-3 bg-surface-raised animate-pulse`}
          />
        ))}
      </div>
    );
  }

  if (!albums || albums.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface-raised p-8 text-center">
        <div className="text-4xl mb-3">💿</div>
        <h3 className="text-lg font-bold text-text mb-1">No Album Scrobbles Recorded</h3>
        <p className="text-sm text-muted max-w-md mx-auto">
          Connect your Last.fm profile in settings or listen to more music to populate your personal
          Bento Topster collage.
        </p>
      </div>
    );
  }

  const featured = albums[0];
  const top2 = albums[1];
  const top3 = albums[2];
  const top4 = albums[3];
  const top5 = albums[4];
  const rank6 = albums[5];
  const rank7 = albums[6];
  const rank8 = albums[7];

  // Calculate cumulative stats across the bento topster
  const totalScrobbles = albums.slice(0, 8).reduce((acc, curr) => {
    return acc + (parseInt(curr?.playcount, 10) || 0);
  }, 0);

  return (
    <section aria-label="Bento Topster Album Grid" className="w-full">
      <div className="bento-topster-grid">
        {/* ====================================================================
            1. Primary Cell: Featured #1 Album (Dominant 2x2 Area = 4x Area)
           ==================================================================== */}
        {featured && (
          <button
            type="button"
            onClick={() => onSelectAlbum?.(featured, 1)}
            onMouseEnter={() => setHoveredRank(1)}
            onMouseLeave={() => setHoveredRank(null)}
            className="bento-cell bento-featured text-left p-5 sm:p-7 flex flex-col justify-between group cursor-pointer focus-visible:ring-2 focus-visible:ring-accent focus:outline-none"
          >
            {/* Top Bar: Rank & Badge */}
            <div className="flex items-center justify-between gap-2 z-10 w-full">
              <div className="flex items-center gap-2">
                <span className="font-mono text-2xs font-bold uppercase tracking-widest px-2.5 py-1 rounded bg-accent text-surface font-black">
                  #01 TOPSTER
                </span>
                <span className="text-2xs uppercase tracking-wider text-muted font-mono hidden sm:inline">
                  Rotation Anchor
                </span>
              </div>
              <Badge variant="accent" size="sm">
                ✦ Crown
              </Badge>
            </div>

            {/* Middle: Vinyl Graphic + Cover Art Showcase */}
            <div className="my-4 sm:my-6 flex items-center justify-center relative py-2">
              <div className="relative flex items-center justify-center">
                {/* Vinyl Record Peeking Out Behind Cover */}
                <div
                  className="vinyl-disc absolute w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-obsidian-950 border-4 border-obsidian-700 shadow-5 flex items-center justify-center"
                  style={{ right: "-12px", zIndex: 0 }}
                  aria-hidden="true"
                >
                  <div className="w-14 h-14 rounded-full border border-obsidian-600 bg-obsidian-850 flex items-center justify-center">
                    <div className="w-4 h-4 rounded-full bg-accent" />
                  </div>
                </div>

                {/* Album Cover */}
                <div className="relative z-10 w-36 h-36 sm:w-44 sm:h-44 rounded-lg overflow-hidden border border-border-strong shadow-4 bg-surface-sunken">
                  {featured.image_url ? (
                    <img
                      src={featured.image_url}
                      alt={`${featured.name} by ${featured.artist}`}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted p-2 text-center text-xs">
                      <span>💿</span>
                      <span className="mt-1 font-mono text-2xs">No Artwork</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Bar: Typography & Stats */}
            <div className="z-10 w-full pt-2 border-t border-border/60">
              <h3 className="font-heading text-lg sm:text-2xl font-black text-text tracking-tight line-clamp-1 group-hover:text-accent transition-colors">
                {featured.name}
              </h3>
              <p className="text-sm font-medium text-muted mt-0.5 flex items-center gap-1.5">
                <span>{featured.artist}</span>
                <span className="text-accent text-xs">●</span>
              </p>

              <div className="mt-3 flex items-center justify-between">
                <dl className="flex items-baseline gap-2">
                  <dt className="font-mono text-2xs uppercase text-muted tracking-wider">Recorded Plays:</dt>
                  <dd className="font-mono text-base font-bold text-accent tabular-nums">
                    {Number(featured.playcount || 0).toLocaleString()}
                  </dd>
                </dl>
                <span className="text-xs text-muted group-hover:text-accent font-medium flex items-center gap-1">
                  Details <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </span>
              </div>
            </div>
          </button>
        )}

        {/* ====================================================================
            2. Secondary Cells: Ranks #02 to #05 (1x1 Cells with Image Overlays)
           ==================================================================== */}
        {[
          { item: top2, rank: 2, areaClass: "bento-top-2" },
          { item: top3, rank: 3, areaClass: "bento-top-3" },
          { item: top4, rank: 4, areaClass: "bento-top-4" },
          { item: top5, rank: 5, areaClass: "bento-top-5" },
        ].map(({ item, rank, areaClass }) => {
          if (!item) {
            return (
              <div
                key={rank}
                className={`bento-cell ${areaClass} p-4 flex flex-col items-center justify-center text-center text-muted border-dashed`}
              >
                <span className="font-mono text-xs text-muted">#{String(rank).padStart(2, "0")}</span>
                <span className="text-2xs text-muted mt-1">Empty Slot</span>
              </div>
            );
          }

          return (
            <button
              key={rank}
              type="button"
              onClick={() => onSelectAlbum?.(item, rank)}
              onMouseEnter={() => setHoveredRank(rank)}
              onMouseLeave={() => setHoveredRank(null)}
              className={`bento-cell ${areaClass} p-4 flex flex-col justify-between text-left group cursor-pointer focus-visible:ring-2 focus-visible:ring-accent focus:outline-none`}
            >
              {/* Top Header */}
              <div className="flex items-center justify-between z-10 w-full mb-2">
                <span className="font-mono text-2xs font-bold px-1.5 py-0.5 rounded bg-surface-sunken border border-border text-text">
                  #{String(rank).padStart(2, "0")}
                </span>
                <dl className="flex items-center gap-1">
                  <dt className="sr-only">Scrobbles</dt>
                  <dd className="font-mono text-2xs text-muted tabular-nums">
                    {Number(item.playcount || 0).toLocaleString()} plays
                  </dd>
                </dl>
              </div>

              {/* Artwork Center */}
              <div className="relative w-full aspect-square max-h-28 my-auto rounded-md overflow-hidden bg-surface-sunken border border-border/80">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={`${item.name} by ${item.artist}`}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover transition-transform duration-400 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted text-xs">
                    💿
                  </div>
                )}
              </div>

              {/* Metadata Footer */}
              <div className="mt-2 z-10 w-full">
                <h4 className="font-heading text-sm font-bold text-text truncate group-hover:text-accent transition-colors">
                  {item.name}
                </h4>
                <p className="text-xs text-muted truncate mt-0.5">{item.artist}</p>
              </div>
            </button>
          );
        })}

        {/* ====================================================================
            3. Editorial Stat Highlight Cell: Analytical Summary
           ==================================================================== */}
        <div className="bento-cell bento-stat-highlight p-4 sm:p-5 flex flex-col justify-between bg-surface-raised border border-border">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xs font-mono font-bold uppercase tracking-wider text-secondary">
                ✦ Bento Analytics
              </span>
              <span className="text-xs">📊</span>
            </div>
            <dl className="space-y-2">
              <div>
                <dt className="text-2xs font-mono uppercase text-muted">Active Window</dt>
                <dd className="text-xs font-semibold text-text mt-0.5">
                  {PERIOD_LABELS[period] || period}
                </dd>
              </div>
              <div className="pt-2 border-t border-border/60">
                <dt className="text-2xs font-mono uppercase text-muted">Top 8 Cumulative Plays</dt>
                <dd className="text-lg sm:text-xl font-mono font-black text-secondary tabular-nums">
                  {totalScrobbles.toLocaleString()}
                </dd>
              </div>
            </dl>
          </div>
          <p className="text-2xs text-muted italic mt-3 pt-2 border-t border-border/40">
            Ranked hierarchically from your verified Last.fm scrobble history.
          </p>
        </div>

        {/* ====================================================================
            4. Tertiary Supporting Cells: Ranks #06 to #08 (Compact Cards)
           ==================================================================== */}
        {[
          { item: rank6, rank: 6, areaClass: "bento-rank-6" },
          { item: rank7, rank: 7, areaClass: "bento-rank-7" },
          { item: rank8, rank: 8, areaClass: "bento-rank-8" },
        ].map(({ item, rank, areaClass }) => {
          if (!item) {
            return (
              <div
                key={rank}
                className={`bento-cell ${areaClass} p-3 flex items-center justify-center text-muted border-dashed`}
              >
                <span className="font-mono text-2xs">#{String(rank).padStart(2, "0")} Empty</span>
              </div>
            );
          }

          return (
            <button
              key={rank}
              type="button"
              onClick={() => onSelectAlbum?.(item, rank)}
              onMouseEnter={() => setHoveredRank(rank)}
              onMouseLeave={() => setHoveredRank(null)}
              className={`bento-cell ${areaClass} p-3 flex items-center gap-3 text-left group cursor-pointer focus-visible:ring-2 focus-visible:ring-accent focus:outline-none`}
            >
              {/* Compact Thumbnail */}
              <div className="relative w-12 h-12 flex-shrink-0 rounded overflow-hidden bg-surface-sunken border border-border">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={`${item.name} by ${item.artist}`}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs">💿</div>
                )}
                <span className="absolute top-0.5 left-0.5 bg-obsidian-950/80 text-text font-mono text-[9px] px-1 rounded">
                  #{rank}
                </span>
              </div>

              {/* Text Info */}
              <div className="min-w-0 flex-1">
                <h5 className="font-heading text-xs font-bold text-text truncate group-hover:text-accent transition-colors">
                  {item.name}
                </h5>
                <p className="text-2xs text-muted truncate">{item.artist}</p>
                <dl className="mt-0.5">
                  <dt className="sr-only">Plays</dt>
                  <dd className="font-mono text-[10px] text-muted tabular-nums">
                    {Number(item.playcount || 0).toLocaleString()} plays
                  </dd>
                </dl>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
