# Bento Grid Layouts -- Reference

## Common bento compositions

| Layout | Grid | Best for |
|---|---|---|
| 1+4 (L-shape) | `"hero hero side-a side-b" "hero hero side-c side-d"` | Feature showcase, product page |
| 1+2+1 (stacked) | `"main main" "left right" "full full"` | Blog overview, project summary |
| 2+2 (checkerboard) | `"a a b" "c d d"` | Portfolio, image gallery |
| 1+3 (top-heavy) | `"hero hero hero" "a b c"` | Landing page features |
| Dashboard 6-cell | `"chart chart stats-1 stats-2" "chart chart stats-3 stats-4" "list list activity activity"` | Analytics, admin overview |

## Gotchas

1. **`grid-template-areas` must form a rectangle.** Every row must have the same number of names, and each named area must form a rectangle (no L-shapes or T-shapes for a single name). `"a a b" "a c c"` is invalid because `a` is an L-shape. Split it into two named areas.
2. **Empty cells use `.` (dot) in `grid-template-areas`.** `"hero hero ." ". sidebar sidebar"` leaves two cells empty. Each `.` represents one grid cell.
3. **`grid-template-rows: auto auto` with content-driven heights can produce cells of wildly different heights in the same row.** Cells in the same row share a row height. If one cell has a 600px image and another has two lines of text, both are 600px tall. Use explicit row heights or `minmax()`.
4. **Container queries on bento cells require `container-type: inline-size` on each cell, not the grid parent.** The cell is the container, not the grid.
5. **Images with `object-fit: cover` inside grid cells can have their aspect ratio distorted if the cell is smaller than the image's natural ratio.** Set an explicit `min-height` or `aspect-ratio` on the cell to prevent over-compression.
6. **`subgrid` on a bento cell only works if the cell itself is `display: grid`.** Setting `grid-template-columns: subgrid` on a flex container does nothing.

## Additional recipes

### Staggered bento (alternating row alignment)
A bento where the second row is offset by half a column.
```css
.staggered-bento {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  grid-template-rows: 250px 250px;
  gap: 1rem;
}

.stagger-a { grid-column: 1 / 5; grid-row: 1; }
.stagger-b { grid-column: 5 / 9; grid-row: 1; }
.stagger-c { grid-column: 2 / 5; grid-row: 2; }
.stagger-d { grid-column: 5 / 8; grid-row: 2; }
/* Columns 1 and 8 in row 2 are empty, creating the offset */
```

### Bento with one cell breakout (full-bleed)
One cell escapes the grid's padding.
```css
.bento-breakout {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: 250px 300px;
  grid-template-areas:
    "a b c"
    "full full full";
  gap: 1rem;
  padding: 1rem;
}

.cell-full {
  grid-area: full;
  margin-inline: -1rem; /* negate parent padding */
  padding: 0;
}
```

### Animated cell hover (expand on focus)
A bento cell that grows slightly on hover, pushing others.
```css
.bento-hover {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: 200px 200px;
  gap: 0.75rem;
  transition: grid-template-columns 0.3s ease, grid-template-rows 0.3s ease;
}

/* When a cell in the first column is hovered, grow that column */
.bento-hover:has(.col-1:hover) {
  grid-template-columns: 1.4fr 0.8fr 0.8fr;
}

.bento-hover:has(.col-2:hover) {
  grid-template-columns: 0.8fr 1.4fr 0.8fr;
}

.bento-hover:has(.col-3:hover) {
  grid-template-columns: 0.8fr 0.8fr 1.4fr;
}

@media (prefers-reduced-motion: reduce) {
  .bento-hover { transition: none; }
}
```

### Dark mode bento treatment
Cell borders and backgrounds adapt for dark surfaces.
```css
[data-theme="dark"] .bento-cell {
  border-color: oklch(0.28 0.005 250);
}

[data-theme="dark"] .cell-text {
  background: oklch(0.18 0.005 250);
}

[data-theme="dark"] .cell-stat {
  background: oklch(0.16 0.005 250);
}

[data-theme="dark"] .cell-image-overlay .overlay {
  background: linear-gradient(to top, oklch(0 0 0 / 0.8), transparent);
}
```
