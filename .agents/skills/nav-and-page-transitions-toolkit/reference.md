# Navigation and Page Architecture -- Reference

## Timing tokens quick-reference

| Token | Duration | Easing | Use cases |
|---|---|---|---|
| `--nav-open` | 350ms | `cubic-bezier(0.32, 0.72, 0, 1)` | Overlay open, drawer slide in, panel appear |
| `--nav-close` | 280ms | `cubic-bezier(0.32, 0.72, 0, 1)` | All close animations (faster than open) |
| `--nav-hover` | 200ms | `ease` | Mega menu appear, hover state transitions |
| `--nav-indicator` | 300ms | `cubic-bezier(0.65, 0, 0.35, 1)` | Tab underline/pill slide, scrollspy highlight |
| `--nav-header` | 200ms | `ease` | Sticky header shrink/grow, show/hide |
| `--nav-stagger` | 40ms | -- | Per-item delay in menu lists (max 8 items) |
| `--page-transition` | 400ms | `cubic-bezier(0.65, 0, 0.35, 1)` | Route cross-fade, page enter/exit |

## Z-index scale

| z-index | Layer | Elements |
|---|---|---|
| 0 | Base | Page content, sections |
| 100 | Sticky header | `<header>` |
| 200 | Dropdown / mega menu | Menu panels, tooltips |
| 300 | Sidebar backdrop | Mobile sidebar scrim |
| 310 | Sidebar panel | The sidebar itself |
| 400 | Fullscreen overlay | Overlay menu, search overlay |
| 500 | Command palette backdrop | Palette scrim |
| 510 | Command palette | The palette itself |
| 9999 | Skip link (focused) | Accessibility skip link |
| 10000 | Preloader | Site preloader (removed after load) |

## ARIA pattern reference

### Menubar (horizontal nav with submenus)

```
nav[aria-label="Main"]
  ul[role="menubar"]
    li[role="none"]
      button[role="menuitem"][aria-haspopup="true"][aria-expanded="false/true"]
      div[role="menu"][aria-labelledby="trigger-id"]
        a[role="menuitem"]
        a[role="menuitem"]
    li[role="none"]
      a[role="menuitem"]
```

Keyboard: ArrowRight/Left between items, ArrowDown/Enter opens submenu, Escape closes.

### Tabs

```
div[role="tablist"][aria-label="Content tabs"]
  button[role="tab"][aria-selected="true"][aria-controls="panel-1"][id="tab-1"]
  button[role="tab"][aria-selected="false"][aria-controls="panel-2"][id="tab-2"][tabindex="-1"]

div[role="tabpanel"][aria-labelledby="tab-1"][id="panel-1"]
div[role="tabpanel"][aria-labelledby="tab-2"][id="panel-2"][hidden]
```

Keyboard: ArrowRight/Left between tabs, Home/End to first/last. Active tab has `tabindex="0"`, others `-1`.

### Tree (collapsible sidebar)

```
nav[aria-label="Sidebar"]
  ul[role="tree"]
    li[role="treeitem"][aria-expanded="false"]
      button  -- group toggle
      ul[role="group"][hidden]
        li[role="treeitem"]
          a  -- leaf link
```

Keyboard: ArrowDown/Up between visible items, ArrowRight expands, ArrowLeft collapses, Enter activates.

### Dialog (overlay, drawer, palette)

```
div[role="dialog"][aria-modal="true"][aria-label="Navigation menu"]
  -- content --
  button[aria-label="Close menu"]
```

When closed: `[inert]` attribute on the dialog element. Focus trapped inside when open.

### Combobox (command palette input)

```
input[role="combobox"][aria-expanded="true"][aria-controls="results-list"]
      [aria-autocomplete="list"][aria-activedescendant="item-0"]
div[role="listbox"][id="results-list"]
  div[role="option"][id="item-0"][aria-selected="true"]
  div[role="option"][id="item-1"]
```

### Breadcrumb

```
nav[aria-label="Breadcrumb"]
  ol
    li  a[href="/"]  Home
    li  a[href="/docs"]  Docs
    li  span[aria-current="page"]  Current Page
```

Current page: `<span>` not `<a>`, with `aria-current="page"`.

## Header pattern decision tree

```
Start
  |
  How many top-level nav items?
  |
  <= 6 items
  |   -> Simple sticky header
  |      Flat links, logo left, CTA right
  |      On mobile: hamburger -> drawer
  |
  7-15 items
  |   -> Group into 3-5 categories
  |      -> Mega menu header
  |         Hover panels with columns
  |         On mobile: accordion in drawer
  |
  15+ items (dashboard/docs)
  |   -> Sidebar navigation
  |      Collapsible groups, sticky
  |      Header for branding + search only
  |      On mobile: sidebar becomes drawer
  |
  App with actions (not just pages)?
  |   -> Add command palette (Cmd+K)
  |      Supplement, do not replace, visible nav
```

## Gesture velocity reference

| Gesture | Threshold | Unit | Behavior below threshold | Behavior above threshold |
|---|---|---|---|---|
| Drawer swipe close | 0.5 | px/ms | Snap back to open | Animate closed |
| Drawer swipe close (alt) | 80 | px displacement | Snap back to open | Animate closed |
| Edge swipe open | 20 | px from left edge (start zone) | Ignore | Begin tracking |
| Edge swipe open | 80 | px displacement | Ignore | Open drawer |
| Pull-to-refresh (if implemented) | 60 | px displacement | Snap back | Trigger refresh |

Velocity = `Math.abs(endX - startX) / (endTime - startTime)`. Always measure in px/ms.

## Scroll direction detection thresholds

| Parameter | Value | Why |
|---|---|---|
| Delta threshold | 5px | Prevents jitter from sub-pixel scroll events and trackpad momentum |
| Minimum scrollY for hide | 100px | Do not hide header when user is at the top of the page |
| Debounce (if used) | 0ms | Use rAF throttle, not debounce, for direction detection |
| IntersectionObserver rootMargin | `-8px 0px 0px 0px` | Shrink triggers 8px after sentinel exits viewport |

## Hover intent delay reference

| Parameter | Value | Why |
|---|---|---|
| Enter delay | 150ms | Prevents accidental trigger from fast cursor movement |
| Leave delay | 300ms | Allows diagonal cursor travel from trigger to panel |
| Enter + leave timer clear | Both timers cleared on both events | Prevents state machine races |

## Preloader asset collection patterns

| Asset type | Detection method | Completion signal |
|---|---|---|
| Fonts | `document.fonts.ready` | Promise resolves |
| Above-fold images | `document.querySelectorAll('img')` + `img.complete` check | `load` or `error` event |
| Critical CSS | Already loaded by time JS runs | N/A (always complete) |
| Critical JS | Script that creates the preloader is itself the critical JS | N/A |
| Failsafe | `setTimeout(5000)` | Always fires, kills preloader regardless |

## Cross-reference to primitives

| Topic | Primitive skill slug | What it covers |
|---|---|---|
| Exit/enter timing, element continuity | `page-transition-choreography` | FLIP technique, overlap vs sequence model, framework patterns |
| Barba.js v2 lifecycle | `barba-spa-transitions` | Namespace transitions, ScrollTrigger cleanup, script reinit |
| `document.startViewTransition()` | `view-transitions-api` | Same-doc and cross-doc transitions, `view-transition-name`, pseudo-elements |
| Smooth scroll proxy | `lenis-smooth-scroll` | Lenis setup, GSAP ticker integration, `scrollerProxy` |

When implementing page transitions, read the relevant primitive for API details. This toolkit covers integration with nav architecture (persistent header, active state, scroll restoration) but does not re-document those APIs.

## Mobile breakpoint strategy

| Breakpoint | Nav behavior |
|---|---|
| >= 1440px | Full mega menu, sidebar expanded |
| 1024-1439px | Mega menu, sidebar collapsed (icon-only) |
| 768-1023px | Hamburger + drawer replaces mega menu, sidebar hidden |
| < 768px | Hamburger + drawer, simplified footer (stacked columns) |
| < 480px | Single-column footer, full-width search |

## Footer column count by site complexity

| Site type | Columns | Typical groups |
|---|---|---|
| Landing page | 0 (minimal footer) | Copyright + legal links only |
| Small SaaS (< 5 pages) | 2 | Product, Company |
| Medium SaaS | 3-4 | Product, Resources, Company, Legal |
| Large SaaS / Enterprise | 4-5 | Product, Solutions, Resources, Company, Legal |
| E-commerce | 4-5 | Shop, Support, Company, Legal, Newsletter |
| Docs site | 2-3 | Docs, Community, Company |

## Troubleshooting

### Header shrink causes content jump
**Symptom:** Content below the header shifts up/down when the header height changes.
**Cause:** Header wrapper height is not constant; CSS height transition causes reflow.
**Fix:** Use a wrapper element with constant height (`height: 80px`). Only the inner bar shrinks. The wrapper absorbs the difference.

### Mega menu panel appears behind hero section
**Symptom:** Panel is positioned correctly but visually behind a section with a transform or will-change.
**Cause:** Any element with `transform`, `filter`, `will-change`, or `contain: paint` creates a new stacking context.
**Fix:** Ensure no ancestor of the mega menu (other than the header) creates a stacking context, or move the panel to a portal outside the header DOM.

### Mobile drawer scroll fights page scroll
**Symptom:** Scrolling inside the drawer also scrolls the page behind it.
**Cause:** Missing `overscroll-behavior: contain` on the drawer, or `overflow: hidden` not set on `<body>`.
**Fix:** Set `overscroll-behavior: contain` on the drawer AND `overflow: hidden` on `<body>` while the drawer is open.

### Command palette opens but search is empty
**Symptom:** Typing in the palette shows no results even for valid queries.
**Cause:** Search index is lazy-loaded but the fetch has not completed when the user types.
**Fix:** Show a "Loading..." state in results while the index loads, or pre-fetch the index on first page interaction (mousemove/keydown) rather than on palette open.

### Tab indicator jumps instead of sliding on initial render
**Symptom:** First render shows indicator at position 0 or the wrong tab, then it snaps to the correct position.
**Cause:** Indicator position is set before layout is complete (fonts not loaded, container not measured).
**Fix:** Measure after `document.fonts.ready` resolves, and set `transition: none` on the initial position set, then re-enable transitions.

### View Transitions API flashes white between pages
**Symptom:** Brief white flash during the cross-fade.
**Cause:** Old page captures include the background, but new page has not painted its background yet.
**Fix:** Set `background-color` on `<html>` (not `<body>`), so the background is present in both snapshots.

### Breadcrumb JSON-LD validation fails
**Symptom:** Google Search Console reports structured data errors.
**Cause:** Last item (current page) includes an `item` URL, which is deprecated for the final item.
**Fix:** Omit `item` from the last `ListItem` in the JSON-LD array. Google infers it from the page URL.

### Scroll restoration fires before page transition completes
**Symptom:** Page scrolls to restored position while the exit animation is still running.
**Cause:** `popstate` listener restores immediately instead of waiting for transition.
**Fix:** Restore scroll position after `transition.finished` promise resolves (View Transitions) or after the enter animation callback completes (Barba/Framer Motion).
