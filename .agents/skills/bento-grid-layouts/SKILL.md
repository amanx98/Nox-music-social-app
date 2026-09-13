---
name: bento-grid-layouts
description: "Use when building bento/mosaic grid layouts: grid-template-areas composition, cell size hierarchy tied to content importance, responsive collapse order, per-cell treatments, and avoiding the generic 2024-2026 bento cliche."
---

# Bento Grid Layouts

## When to use this
- You are building a feature showcase, dashboard overview, or portfolio grid with mixed-size cells.
- You need cell size to communicate content importance (larger = more important).
- You want responsive collapse that preserves hierarchy rather than linearizing everything.
- You need distinct interior treatments per cell (some have images, some have stats, some have interactive elements).
- Do NOT use this when you need a Swiss/International editorial grid with asymmetric columns and baseline alignment; use `swiss-editorial-grid` instead.

## Mental model
A bento grid (named after the compartmentalized Japanese lunchbox) is a mosaic of unequal-sized cells arranged on a grid. Unlike a uniform card grid, bento cells vary in size and shape. The size variation is the design: the largest cell is the most important content, and size diminishes with importance.

The grid is defined with `grid-template-areas`, which lets you name regions and span them across rows and columns. This is more readable than numeric grid placement for complex layouts and makes responsive variants easier to reason about.

The generic bento cliche (2024-2026) is a 4x4 grid with gradient-filled cells, uniform padding, identical border-radius, and no real content. It looks like a design tool screenshot, not a designed layout. To avoid this: every cell must have distinct interior treatment, sizes must reflect content hierarchy (not just visual balance), and the grid must respond to its content rather than being a container for decorative tiles.

Three rules separate a designed bento from a cliche:
1. **Size = importance.** The largest cell contains the most important content or the content that needs the most space (a visualization, a hero image, a primary feature). Small cells contain supporting details.
2. **Interior variety.** Cells should not all have the same padding, typography, and background treatment. A stats cell should look different from an image cell, which should look different from a feature description cell.
3. **Responsive collapse preserves hierarchy.** On narrow screens, the grid linearizes, but the primary cell stays largest (full-width) while secondary cells stack below it. The collapse order matches the importance order.

## Setup
No dependencies. CSS Grid with `grid-template-areas`.
```css
/* Supported in all modern browsers. No polyfill needed. */
```

## Core API
| Property | Purpose | Notes |
|---|---|---|
| `grid-template-areas` | Name grid regions with ASCII art syntax. | Each row is a string. Cell names span multiple positions to create larger cells. |
| `grid-template-columns` | Define column widths. | Use `fr` units for proportional sizing. |
| `grid-template-rows` | Define row heights. | Use `auto` for content-driven or fixed values for visual consistency. |
| `grid-area` | Assign an element to a named region. | Matches a name from `grid-template-areas`. |
| `aspect-ratio` | Control cell proportions. | Useful for image cells: `aspect-ratio: 16/9`. |
| `container-type: inline-size` | Enable container queries per cell. | Interior layout adapts to the cell's own width. |
| `subgrid` | Inherit parent grid lines for nested content. | Aligns interior content across cells. |

## Recipes

### 1. Feature showcase bento (primary + 4 secondary)
A marketing-page feature grid with one dominant cell.
```css
.bento {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: auto auto;
  grid-template-areas:
    "primary primary secondary-1 secondary-2"
    "primary primary secondary-3 secondary-4";
  gap: 1rem;
  padding: 1rem;
}

.bento-primary    { grid-area: primary; }
.bento-secondary-1 { grid-area: secondary-1; }
.bento-secondary-2 { grid-area: secondary-2; }
.bento-secondary-3 { grid-area: secondary-3; }
.bento-secondary-4 { grid-area: secondary-4; }

/* Interior treatments vary by cell role */
.bento-primary {
  background: var(--color-surface-raised, #f5f5f5);
  padding: 3rem;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.bento-primary h2 {
  font-size: clamp(1.5rem, 3vw, 2.5rem);
  font-weight: 700;
  line-height: 1.1;
  max-width: 20ch;
}

.bento [class*="secondary"] {
  padding: 1.5rem;
  border: 1px solid var(--color-border, #e5e5e5);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.bento [class*="secondary"] h3 {
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
```

### 2. Dashboard overview bento
A data-driven bento with stats, charts, and status indicators.
```css
.dashboard-bento {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  grid-template-rows: 180px 180px 200px;
  grid-template-areas:
    "chart chart chart chart stats-1 stats-2"
    "chart chart chart chart stats-3 stats-4"
    "list  list  list  activity activity activity";
  gap: 0.75rem;
}

.cell-chart    { grid-area: chart; }
.cell-stats-1  { grid-area: stats-1; }
.cell-stats-2  { grid-area: stats-2; }
.cell-stats-3  { grid-area: stats-3; }
.cell-stats-4  { grid-area: stats-4; }
.cell-list     { grid-area: list; }
.cell-activity { grid-area: activity; }

/* Chart cell: full interior, no padding */
.cell-chart {
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border);
  overflow: hidden;
}

/* Stats cells: centered large number */
.cell-stats-1, .cell-stats-2, .cell-stats-3, .cell-stats-4 {
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 1rem;
}

.stat-number {
  font-size: 2rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  margin-top: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* List cell: scrollable content */
.cell-list, .cell-activity {
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border);
  padding: 1rem;
  overflow-y: auto;
}
```

### 3. Responsive collapse (mobile-first)
The bento linearizes on mobile, preserving hierarchy.
```css
.bento {
  display: grid;
  gap: 1rem;

  /* Mobile: single column, primary first */
  grid-template-columns: 1fr;
  grid-template-areas:
    "primary"
    "secondary-1"
    "secondary-2"
    "secondary-3"
    "secondary-4";
}

.bento-primary {
  grid-area: primary;
  min-height: 300px;
}

/* Tablet: 2 columns, primary still spans full width */
@media (min-width: 640px) {
  .bento {
    grid-template-columns: 1fr 1fr;
    grid-template-areas:
      "primary primary"
      "secondary-1 secondary-2"
      "secondary-3 secondary-4";
  }
}

/* Desktop: full bento */
@media (min-width: 1024px) {
  .bento {
    grid-template-columns: repeat(4, 1fr);
    grid-template-areas:
      "primary primary secondary-1 secondary-2"
      "primary primary secondary-3 secondary-4";
  }
}
```

### 4. Image bento with aspect-ratio control
A portfolio/gallery bento where images fill cells at controlled proportions.
```css
.gallery-bento {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: 250px 250px 250px;
  grid-template-areas:
    "hero hero    side-1"
    "hero hero    side-2"
    "wide wide    small";
  gap: 0.5rem;
}

.gallery-bento > * {
  overflow: hidden;
}

.gallery-bento img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease-out;
}

.gallery-bento > *:hover img {
  transform: scale(1.05);
}

.cell-hero   { grid-area: hero; }
.cell-side-1 { grid-area: side-1; }
.cell-side-2 { grid-area: side-2; }
.cell-wide   { grid-area: wide; }
.cell-small  { grid-area: small; }
```

### 5. Per-cell interior treatments
Different internal layouts per cell type.
```css
/* Text-heavy cell: left-aligned, stacked */
.cell-text {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.cell-text h3 {
  font-size: 1.25rem;
  font-weight: 700;
}

.cell-text p {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
  max-width: 35ch;
}

/* Stat cell: centered, minimal */
.cell-stat {
  display: grid;
  place-items: center;
  padding: 1.5rem;
  text-align: center;
}

/* Image + overlay cell */
.cell-image-overlay {
  position: relative;
  overflow: hidden;
}

.cell-image-overlay img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cell-image-overlay .overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, oklch(0 0 0 / 0.7), transparent);
  display: flex;
  align-items: flex-end;
  padding: 1.5rem;
  color: #fff;
}

/* Interactive cell: contains a mini-widget */
.cell-interactive {
  padding: 1.5rem;
  background: var(--color-surface-raised);
  container-type: inline-size;
}

.cell-interactive .mini-chart {
  width: 100%;
  height: 120px;
}
```

### 6. Container-query-aware cell interior
Cell content adapts to its own size, not the viewport.
```css
.bento-cell {
  container-type: inline-size;
  container-name: cell;
}

/* Narrow cell: stack vertically, small text */
.bento-cell .cell-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
}

.bento-cell .cell-content h3 {
  font-size: 0.875rem;
}

/* Wide cell: side by side, larger text */
@container cell (min-width: 400px) {
  .bento-cell .cell-content {
    flex-direction: row;
    align-items: center;
    gap: 2rem;
    padding: 2rem;
  }

  .bento-cell .cell-content h3 {
    font-size: 1.5rem;
  }
}
```

### 7. Avoiding the bento cliche: real content example
A product features bento where each cell has genuinely different content and treatment.
```html
<div class="features-bento">
  <div class="cell-demo">
    <!-- Primary: live code demo -->
    <div class="demo-header">
      <span class="demo-dot"></span>
      <span class="demo-dot"></span>
      <span class="demo-dot"></span>
    </div>
    <pre><code>const result = await query({
  model: "gpt-4",
  prompt: userInput,
  maxTokens: 500
});</code></pre>
  </div>

  <div class="cell-metric">
    <!-- Secondary: single stat -->
    <span class="stat-number">47ms</span>
    <span class="stat-label">p95 latency</span>
  </div>

  <div class="cell-comparison">
    <!-- Secondary: comparison bars -->
    <div class="bar-row"><span class="bar-label">Ours</span><div class="bar" style="width: 30%"></div></div>
    <div class="bar-row"><span class="bar-label">GPT-4</span><div class="bar" style="width: 100%"></div></div>
  </div>

  <div class="cell-logos">
    <!-- Tertiary: integration logos -->
    <p class="cell-logos-title">Works with</p>
    <div class="logo-row">
      <img src="/logos/openai.svg" alt="OpenAI" width="32" height="32">
      <img src="/logos/anthropic.svg" alt="Anthropic" width="32" height="32">
      <img src="/logos/google.svg" alt="Google" width="32" height="32">
    </div>
  </div>

  <div class="cell-quote">
    <!-- Tertiary: testimonial -->
    <blockquote>"Cut our inference costs by 60%"</blockquote>
    <cite>CTO, Series B startup</cite>
  </div>
</div>
```
```css
.features-bento {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: 300px 200px;
  grid-template-areas:
    "demo demo     metric   comparison"
    "demo demo     logos    quote";
  gap: 1rem;
}

.cell-demo       { grid-area: demo; background: #0d0d0d; color: #e0e0e0; padding: 1.5rem; font-family: monospace; overflow: hidden; }
.cell-metric     { grid-area: metric; display: grid; place-items: center; background: #f5f5f5; }
.cell-comparison { grid-area: comparison; padding: 1.5rem; border: 1px solid #e5e5e5; display: flex; flex-direction: column; justify-content: center; gap: 0.75rem; }
.cell-logos      { grid-area: logos; padding: 1.5rem; border: 1px solid #e5e5e5; }
.cell-quote      { grid-area: quote; padding: 1.5rem; background: #fafafa; display: flex; flex-direction: column; justify-content: center; }

.demo-header { display: flex; gap: 6px; margin-bottom: 1rem; }
.demo-dot { width: 10px; height: 10px; border-radius: 50%; background: #333; }

.bar-row { display: flex; align-items: center; gap: 0.5rem; }
.bar-label { font-size: 0.75rem; width: 4ch; }
.bar { height: 8px; background: #000; }
```

## Tuning the feel
Cell count: 4-8 cells is the sweet spot. Under 4, it is just a grid. Over 8, visual hierarchy becomes unclear and the grid starts to feel like a dashboard rather than a curated layout.

Row height: fixed row heights (e.g. `200px 200px`) create visual consistency. Content-driven heights (`auto`) create a more organic feel but can produce awkward whitespace in cells that do not fill their row.

Gap size: 0.5rem-1rem is typical. Tighter gaps (0.25rem) create a tiled, mosaic look. Larger gaps (1.5rem+) let cells breathe but weaken the grid cohesion. The gap should be smaller than the smallest cell's padding so cells read as a group, not isolated elements.

Primary cell size: the primary cell should be at least 2x the area of any secondary cell. If the primary is only 1.5x a secondary, the hierarchy is too flat. 4x area (spanning 2 cols and 2 rows in a 4-col grid) is the common choice.

## Performance
CSS Grid with `grid-template-areas` is resolved in a single layout pass. Performance is identical to numeric grid placement. The number of cells (under ~50) has negligible layout cost.

Container queries on cells add a containment layout cost, but it is per-cell and typically under 0.1ms each. This is fine for 4-8 bento cells.

Large images in bento cells should use `loading="lazy"` and `decoding="async"`. Image cells with `object-fit: cover` decode the full image and then crop; use appropriately sized source images to avoid decoding a 4000px image for a 400px cell.

## Accessibility
- Grid areas define visual placement, not reading order. Source order in the HTML should match the logical reading order (primary content first, secondary after).
- Image cells must have `alt` text. If the image is decorative (a gradient tile, an abstract pattern), use `alt=""`.
- Stats cells should use `<dl>` (description list) markup for the number + label pattern, not just styled `<span>` elements.
- Interactive cells (containing charts, widgets) need keyboard accessibility within the cell. Ensure focus is not trapped.

```html
<!-- Accessible stat cell -->
<div class="cell-stat">
  <dl>
    <dt class="stat-label">p95 latency</dt>
    <dd class="stat-number">47ms</dd>
  </dl>
</div>
```

## Anti-slop rules
- Never make all cells the same size. Equal-size cells are a card grid, not a bento. The whole point of bento is size variation.
- Never fill cells with gradient backgrounds as decoration. Every cell must contain real content. A gradient tile with no content is padding, not design.
- Never use the same border-radius on every cell. Vary it by content: image cells might be 0, text cells might be 4px, avatar cells might be full circle.
- Never linearize the grid to a single column without preserving the primary cell's dominance. On mobile, the primary cell should be full-width and taller; secondary cells should be half-height or stacked.
- Never exceed 8 cells without a very clear information architecture. 9+ cells requires a dashboard mindset with established conventions, not a marketing-page bento.
- Never give every cell the same padding. Large cells need more padding (2-3rem). Small cells need less (1-1.5rem). Padding should be proportional to cell area.
- Never use `grid-template-areas` with single-character names. `"a a b c"` is unreadable. Use descriptive names: `"hero hero stats sidebar"`.
- Never animate the grid layout itself (cell sizes, positions) on scroll. Bento grids are structural; animating the structure creates confusion about what is a cell boundary vs what is content.

## Checklist
- [ ] Primary cell is at least 2x the area of any secondary cell.
- [ ] Every cell contains real content, not decorative fills.
- [ ] Cell sizes reflect content importance hierarchy.
- [ ] Interior treatment varies per cell role (text, image, stat, interactive).
- [ ] Responsive collapse preserves the primary cell as full-width.
- [ ] Source order in HTML matches logical reading order.
- [ ] `grid-template-areas` uses descriptive region names.
- [ ] Gap is smaller than the smallest cell's padding.
- [ ] Image cells use `loading="lazy"` and appropriately sized sources.
- [ ] Grid tested at 320px, 768px, and 1280px+ viewports.
