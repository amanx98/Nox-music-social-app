---
name: nav-and-page-transitions-toolkit
description: "Use when building site navigation, page architecture, or route transitions. Covers fullscreen overlay menus, mega menus with hover intent, mobile drawers with gesture dismissal, sticky/shrinking headers, app shell sidebars, command palettes, breadcrumbs, animated tab indicators, anchor scrollspy, search overlays, multi-level mobile nav, footer architecture, page transitions (Barba, View Transitions, Next.js App Router, Astro), route loading choreography, site preloaders, scroll restoration, and keyboard/screen-reader models."
category: nav
pairs_with: nav-and-page-transitions-toolkit-eval
---

# Navigation and Page Architecture Toolkit

## Scope

What this covers:
- Fullscreen overlay menus with focus trapping and enter/exit choreography
- Mega menus with hover intent delay and keyboard grid navigation
- Mobile drawers with touch gesture velocity dismissal
- Sticky headers that shrink on scroll and hide/show on scroll direction
- App shell sidebars (collapsible, hover-expand, responsive breakpoint swap)
- Command palettes with fuzzy search (cmdk pattern)
- Breadcrumbs with overflow handling and structured data
- Animated tab indicators (underline slide, background pill)
- Anchor scrollspy (highlighting nav items based on scroll position)
- Search overlays (fullscreen, inline expanding)
- Multi-level mobile navigation (accordion, drill-down)
- Footer architecture (column grid, minimal, mega footer)
- Page transitions: cross-referenced to `page-transition-choreography`, `barba-spa-transitions`, `view-transitions-api` primitives. This toolkit covers integration, not re-documenting those APIs.
- Route loading choreography (progress bars, skeleton reveals)
- Site preloaders (counter, progress bar, curtain reveal)
- Scroll restoration across route changes
- Full keyboard and screen-reader navigation model

What this does NOT cover:
- Scroll-linked animation (see scroll category toolkits)
- Smooth scroll libraries (see `lenis-smooth-scroll` primitive)
- Modal/dialog content (this covers nav overlays, not confirmation modals)
- E-commerce product filters or data table navigation
- CMS-specific nav builders (WordPress menus, Sanity portable text)

## Decision matrix

| Situation | Use this pattern | Avoid | Why |
|---|---|---|---|
| Marketing site, 4-6 links | Simple sticky header | Mega menu, hamburger on desktop | Under 7 items, flat nav outperforms dropdowns |
| SaaS with 15+ features | Mega menu with columns | Single dropdown, deep nesting | Users need to scan categories, not drill |
| Mobile any site | Drawer or fullscreen overlay | Hover dropdowns, desktop mega menu | No hover on touch; need full-viewport tap targets |
| Docs/dashboard | Persistent sidebar | Top nav only | Sidebar scales to 50+ items with collapsible groups |
| Power-user app | Command palette (Cmd+K) | Visible search bar alone | Keyboard users expect it; reduces nav time 3-5x |
| Deep hierarchy (5+ levels) | Breadcrumbs + sidebar | Breadcrumbs alone | Breadcrumbs show position; sidebar shows siblings |
| SPA route changes | View Transitions API or Barba | Hard cut | Visual continuity reduces perceived load time |
| MPA static site (Astro) | Cross-document View Transitions | Barba | Native API, zero JS for basic cross-fade |
| Next.js App Router | `loading.tsx` + View Transitions | Full-page spinner | Streaming lets above-fold render while below loads |
| Content-heavy footer | 4-5 column grid footer | Single-line footer | Footer is a second chance at navigation for scrollers |
| Tab interface | Animated indicator (sliding underline/pill) | Static highlight | Motion connects the old and new selection visually |
| Long single page | Scrollspy + anchor nav | Pagination | Single-page with scrollspy gives context without page loads |
| Initial page load | Preloader with progress | Blank white screen | Perceived performance; masks font/asset loading |

## Shared foundations

### Timing tokens
Use consistent timing across all nav components on a site. These are the defaults:

| Token | Value | Use |
|---|---|---|
| `--nav-open` | `350ms cubic-bezier(0.32, 0.72, 0, 1)` | Menu open, drawer slide in, overlay fade in |
| `--nav-close` | `280ms cubic-bezier(0.32, 0.72, 0, 1)` | Close is always faster than open |
| `--nav-hover` | `200ms ease` | Dropdown appear, mega menu, hover intent |
| `--nav-indicator` | `300ms cubic-bezier(0.65, 0, 0.35, 1)` | Tab indicator slide, scrollspy highlight |
| `--nav-header` | `200ms ease` | Header shrink/grow, show/hide |
| `--nav-stagger` | `40ms` | Per-item stagger in menu lists |
| `--page-transition` | `400ms cubic-bezier(0.65, 0, 0.35, 1)` | Route transition duration |

```css
:root {
  --nav-open: 350ms cubic-bezier(0.32, 0.72, 0, 1);
  --nav-close: 280ms cubic-bezier(0.32, 0.72, 0, 1);
  --nav-hover: 200ms ease;
  --nav-indicator: 300ms cubic-bezier(0.65, 0, 0.35, 1);
  --nav-header: 200ms ease;
  --nav-stagger: 40ms;
  --page-transition: 400ms cubic-bezier(0.65, 0, 0.35, 1);
}
```

### Z-index scale
All nav elements use a shared z-index scale. Never use arbitrary z values.

| Layer | z-index | Element |
|---|---|---|
| Base content | 0 | Page body |
| Sticky header | 100 | `<header>` |
| Dropdown/mega menu | 200 | Menu panels |
| Sidebar overlay backdrop | 300 | Mobile sidebar scrim |
| Sidebar panel | 310 | The sidebar itself |
| Fullscreen overlay | 400 | Overlay menu, search overlay |
| Command palette backdrop | 500 | Palette scrim |
| Command palette | 510 | The palette itself |
| Skip link (focused) | 9999 | Accessibility skip link |

### Focus management rules
These apply to every nav component in this toolkit:

1. When a nav surface opens (menu, overlay, drawer, palette), move focus to the first focusable element inside it.
2. When it closes, return focus to the trigger that opened it.
3. Trap focus inside modal overlays (fullscreen menu, command palette, search overlay). Tab past the last item wraps to the first.
4. `Escape` always closes the topmost open surface.
5. Never remove the focus ring. Use `:focus-visible` to hide it on mouse click, show it on keyboard.

```css
:focus-visible {
  outline: 2px solid var(--focus-ring, #2563eb);
  outline-offset: 2px;
}
:focus:not(:focus-visible) {
  outline: none;
}
```

### Touch target minimums
- 44x44px minimum for all interactive nav elements on mobile (WCAG 2.5.8)
- 8px minimum spacing between adjacent touch targets
- Padding counts toward the target; the visible element can be smaller

### Reduced motion
Every animated nav pattern in this toolkit must degrade:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

Individual components can be more selective (e.g., keeping opacity transitions while removing transforms), but the above is the floor.


## Fullscreen overlay menus

Use for mobile-first sites or when the menu deserves theatrical presence (portfolios, agencies, editorial). The menu covers the entire viewport.

### Key numbers
- Backdrop opacity: 1 (fully opaque, not a scrim over content)
- Open duration: 350ms
- Close duration: 280ms
- Item stagger: 40ms per item, start after 80ms of the backdrop animation
- Item animation: translate Y 24px + opacity 0 to final position

### Complete implementation (vanilla)

```html
<button id="menu-toggle" aria-expanded="false" aria-controls="overlay-menu">
  <span class="sr-only">Menu</span>
  <span class="hamburger-icon" aria-hidden="true"></span>
</button>

<div id="overlay-menu" role="dialog" aria-modal="true" aria-label="Site navigation"
     class="overlay-menu" inert>
  <nav>
    <ul class="overlay-menu__list" role="list">
      <li><a href="/" class="overlay-menu__link">Home</a></li>
      <li><a href="/work" class="overlay-menu__link">Work</a></li>
      <li><a href="/about" class="overlay-menu__link">About</a></li>
      <li><a href="/contact" class="overlay-menu__link">Contact</a></li>
    </ul>
  </nav>
  <button class="overlay-menu__close" aria-label="Close menu">&times;</button>
</div>
```

```css
.overlay-menu {
  position: fixed;
  inset: 0;
  z-index: 400;
  background: var(--color-bg, #0a0a0a);
  color: var(--color-fg, #fafafa);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  visibility: hidden;
  transition: opacity 280ms cubic-bezier(0.32, 0.72, 0, 1),
              visibility 0ms 280ms;
}

.overlay-menu[data-open="true"] {
  opacity: 1;
  visibility: visible;
  transition: opacity 350ms cubic-bezier(0.32, 0.72, 0, 1),
              visibility 0ms 0ms;
}

.overlay-menu__link {
  display: block;
  font-size: clamp(2rem, 6vw, 4.5rem);
  font-weight: 500;
  padding: 0.25em 0;
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 350ms cubic-bezier(0.32, 0.72, 0, 1),
              transform 350ms cubic-bezier(0.32, 0.72, 0, 1);
}

.overlay-menu[data-open="true"] .overlay-menu__link {
  opacity: 1;
  transform: translateY(0);
}

/* Stagger each item */
.overlay-menu__list li:nth-child(1) .overlay-menu__link { transition-delay: 80ms; }
.overlay-menu__list li:nth-child(2) .overlay-menu__link { transition-delay: 120ms; }
.overlay-menu__list li:nth-child(3) .overlay-menu__link { transition-delay: 160ms; }
.overlay-menu__list li:nth-child(4) .overlay-menu__link { transition-delay: 200ms; }
.overlay-menu__list li:nth-child(5) .overlay-menu__link { transition-delay: 240ms; }

/* Remove stagger delay on close so everything exits together */
.overlay-menu:not([data-open="true"]) .overlay-menu__link {
  transition-delay: 0ms;
}

.overlay-menu__close {
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  background: none;
  border: none;
  color: inherit;
  font-size: 2rem;
  cursor: pointer;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

```js
const toggle = document.getElementById('menu-toggle');
const menu = document.getElementById('overlay-menu');
const closeBtn = menu.querySelector('.overlay-menu__close');
const focusableEls = menu.querySelectorAll('a, button');
const firstFocusable = focusableEls[0];
const lastFocusable = focusableEls[focusableEls.length - 1];
let previousFocus = null;

function openMenu() {
  previousFocus = document.activeElement;
  menu.dataset.open = 'true';
  menu.removeAttribute('inert');
  toggle.setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
  // Delay focus until transition starts
  requestAnimationFrame(() => firstFocusable.focus());
}

function closeMenu() {
  menu.dataset.open = 'false';
  toggle.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
  // Wait for close transition before adding inert
  menu.addEventListener('transitionend', function handler(e) {
    if (e.propertyName === 'opacity') {
      menu.setAttribute('inert', '');
      menu.removeEventListener('transitionend', handler);
    }
  });
  previousFocus?.focus();
}

toggle.addEventListener('click', () => {
  const isOpen = menu.dataset.open === 'true';
  isOpen ? closeMenu() : openMenu();
});

closeBtn.addEventListener('click', closeMenu);

// Focus trap
menu.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { closeMenu(); return; }
  if (e.key !== 'Tab') return;

  if (e.shiftKey) {
    if (document.activeElement === firstFocusable) {
      e.preventDefault();
      lastFocusable.focus();
    }
  } else {
    if (document.activeElement === lastFocusable) {
      e.preventDefault();
      firstFocusable.focus();
    }
  }
});

// Close on link click (SPA navigation)
menu.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', closeMenu);
});
```

### Failure mode
Menu opens but focus stays on the trigger behind the overlay. Screen readers read content behind the menu. Fix: use `inert` on the menu when closed, remove it on open, and move focus explicitly.

## Mega menus with hover intent

Use for SaaS/e-commerce sites with 10+ nav items organized into categories. The panel appears on hover with a delay to prevent accidental triggers.

### Key numbers
- Hover intent delay: 150ms (enter), 300ms (leave). Users moving diagonally toward the panel should not lose it.
- Panel animation: 200ms ease, opacity + translateY -8px
- Max columns: 4
- Max items per column: 8 (use "See all" link beyond that)

### Complete implementation (vanilla)

```html
<nav class="mega-nav" aria-label="Main">
  <ul class="mega-nav__list" role="menubar">
    <li class="mega-nav__item" role="none">
      <button role="menuitem" aria-haspopup="true" aria-expanded="false"
              class="mega-nav__trigger">
        Products <span class="mega-nav__chevron" aria-hidden="true"></span>
      </button>
      <div class="mega-nav__panel" role="menu" id="panel-products">
        <div class="mega-nav__columns">
          <div class="mega-nav__column">
            <span class="mega-nav__heading" role="presentation">Platform</span>
            <a href="/analytics" role="menuitem" class="mega-nav__link">Analytics</a>
            <a href="/automation" role="menuitem" class="mega-nav__link">Automation</a>
            <a href="/reporting" role="menuitem" class="mega-nav__link">Reporting</a>
          </div>
          <div class="mega-nav__column">
            <span class="mega-nav__heading" role="presentation">Security</span>
            <a href="/sso" role="menuitem" class="mega-nav__link">SSO</a>
            <a href="/audit" role="menuitem" class="mega-nav__link">Audit logs</a>
            <a href="/compliance" role="menuitem" class="mega-nav__link">Compliance</a>
          </div>
        </div>
        <div class="mega-nav__footer">
          <a href="/products" class="mega-nav__see-all">See all products</a>
        </div>
      </div>
    </li>
    <li class="mega-nav__item" role="none">
      <a href="/pricing" role="menuitem" class="mega-nav__trigger">Pricing</a>
    </li>
    <li class="mega-nav__item" role="none">
      <a href="/docs" role="menuitem" class="mega-nav__trigger">Docs</a>
    </li>
  </ul>
</nav>
```

```css
.mega-nav__list {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.mega-nav__trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  background: none;
  border: none;
  cursor: pointer;
  border-radius: 0.375rem;
  color: var(--nav-text, #374151);
  transition: background-color 150ms ease, color 150ms ease;
}

.mega-nav__trigger:hover,
.mega-nav__trigger[aria-expanded="true"] {
  background: var(--nav-hover-bg, #f3f4f6);
  color: var(--nav-text-active, #111827);
}

.mega-nav__chevron {
  display: inline-block;
  width: 0;
  height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 4px solid currentColor;
  transition: transform 200ms ease;
}

.mega-nav__trigger[aria-expanded="true"] .mega-nav__chevron {
  transform: rotate(180deg);
}

.mega-nav__panel {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%) translateY(-8px);
  min-width: 480px;
  max-width: 720px;
  background: var(--nav-panel-bg, #fff);
  border: 1px solid var(--nav-panel-border, #e5e7eb);
  border-radius: 0.75rem;
  box-shadow: 0 10px 40px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04);
  padding: 1.5rem;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 200ms ease, transform 200ms ease, visibility 0ms 200ms;
}

.mega-nav__item[data-open="true"] .mega-nav__panel {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transform: translateX(-50%) translateY(0);
  transition: opacity 200ms ease, transform 200ms ease, visibility 0ms 0ms;
}

.mega-nav__columns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 1.5rem;
}

.mega-nav__heading {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--nav-heading, #6b7280);
  margin-bottom: 0.75rem;
}

.mega-nav__link {
  display: block;
  padding: 0.375rem 0;
  font-size: 0.875rem;
  color: var(--nav-text, #374151);
  text-decoration: none;
  border-radius: 0.25rem;
  transition: color 150ms ease;
}

.mega-nav__link:hover {
  color: var(--nav-text-active, #111827);
}

.mega-nav__footer {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--nav-panel-border, #e5e7eb);
}

.mega-nav__see-all {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--nav-accent, #2563eb);
  text-decoration: none;
}
```

```js
class MegaMenu {
  constructor(nav) {
    this.nav = nav;
    this.items = nav.querySelectorAll('.mega-nav__item');
    this.enterTimer = null;
    this.leaveTimer = null;
    this.activeItem = null;

    this.items.forEach(item => {
      const trigger = item.querySelector('.mega-nav__trigger');
      const panel = item.querySelector('.mega-nav__panel');
      if (!panel) return;

      // Hover intent: 150ms enter delay, 300ms leave delay
      item.addEventListener('mouseenter', () => {
        clearTimeout(this.leaveTimer);
        this.enterTimer = setTimeout(() => this.open(item), 150);
      });

      item.addEventListener('mouseleave', () => {
        clearTimeout(this.enterTimer);
        this.leaveTimer = setTimeout(() => this.close(item), 300);
      });

      // Click toggle for touch devices
      trigger.addEventListener('click', (e) => {
        if (panel) {
          e.preventDefault();
          const isOpen = item.dataset.open === 'true';
          this.closeAll();
          if (!isOpen) this.open(item);
        }
      });

      // Keyboard: Enter/Space opens, Escape closes
      trigger.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.open(item);
          const firstLink = panel.querySelector('a');
          firstLink?.focus();
        }
        if (e.key === 'Escape') {
          this.close(item);
          trigger.focus();
        }
        // Arrow key navigation between top-level items
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          const next = item.nextElementSibling;
          next?.querySelector('.mega-nav__trigger')?.focus();
        }
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          const prev = item.previousElementSibling;
          prev?.querySelector('.mega-nav__trigger')?.focus();
        }
      });

      // Keyboard navigation inside panel
      panel.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.close(item);
          trigger.focus();
        }
        const links = [...panel.querySelectorAll('a')];
        const idx = links.indexOf(document.activeElement);
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          links[(idx + 1) % links.length]?.focus();
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          links[(idx - 1 + links.length) % links.length]?.focus();
        }
      });
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!nav.contains(e.target)) this.closeAll();
    });
  }

  open(item) {
    this.closeAll();
    item.dataset.open = 'true';
    const trigger = item.querySelector('.mega-nav__trigger');
    trigger?.setAttribute('aria-expanded', 'true');
    this.activeItem = item;
  }

  close(item) {
    item.dataset.open = 'false';
    const trigger = item.querySelector('.mega-nav__trigger');
    trigger?.setAttribute('aria-expanded', 'false');
    if (this.activeItem === item) this.activeItem = null;
  }

  closeAll() {
    this.items.forEach(item => this.close(item));
  }
}

// Init
document.querySelectorAll('.mega-nav').forEach(nav => new MegaMenu(nav));
```

### Hover intent: the diagonal problem
When a user moves from the trigger to the panel, their cursor often moves diagonally through other menu items. Without a leave delay, the panel closes mid-travel. The 300ms leave delay solves this. For a more precise approach (Amazon-style triangle tracking), compute the angle between the cursor's entry point and the panel's corners, keeping the panel open as long as the cursor is heading toward the panel.

### Failure mode
Panel flickers on fast mouse movement between triggers. Fix: clear both enter and leave timers on every mouseenter/mouseleave event, and use a single active-item tracker so only one panel is open at a time.


## Mobile drawers with gesture velocity dismissal

Use for mobile nav, filters, settings panels. Slides in from the side (usually left for nav, right for filters). Dismissible by swiping in the close direction with velocity detection.

### Key numbers
- Slide-in duration: 350ms cubic-bezier(0.32, 0.72, 0, 1)
- Slide-out duration: 280ms
- Backdrop: rgba(0,0,0,0.5)
- Swipe threshold: 80px displacement OR velocity > 0.5px/ms (whichever hits first)
- Width: min(320px, 85vw)

### Complete implementation

```html
<div id="drawer-backdrop" class="drawer-backdrop" aria-hidden="true"></div>
<aside id="drawer" class="drawer" role="dialog" aria-modal="true" aria-label="Navigation" inert>
  <nav class="drawer__content">
    <a href="/" class="drawer__link">Home</a>
    <a href="/about" class="drawer__link">About</a>
    <a href="/work" class="drawer__link">Work</a>
    <a href="/contact" class="drawer__link">Contact</a>
  </nav>
</aside>
```

```css
.drawer-backdrop {
  position: fixed;
  inset: 0;
  z-index: 300;
  background: rgba(0, 0, 0, 0.5);
  opacity: 0;
  visibility: hidden;
  transition: opacity 280ms ease, visibility 0ms 280ms;
}

.drawer-backdrop[data-open="true"] {
  opacity: 1;
  visibility: visible;
  transition: opacity 350ms ease, visibility 0ms 0ms;
}

.drawer {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 310;
  width: min(320px, 85vw);
  background: var(--drawer-bg, #fff);
  transform: translateX(-100%);
  transition: transform 280ms cubic-bezier(0.32, 0.72, 0, 1);
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

.drawer[data-open="true"] {
  transform: translateX(0);
  transition-duration: 350ms;
}

/* While dragging, disable CSS transition so JS controls position directly */
.drawer[data-dragging="true"] {
  transition: none;
}

.drawer__content {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.drawer__link {
  display: block;
  padding: 0.75rem 1rem;
  font-size: 1rem;
  font-weight: 500;
  color: var(--drawer-text, #111);
  text-decoration: none;
  border-radius: 0.5rem;
  min-height: 44px;
  display: flex;
  align-items: center;
}

.drawer__link:hover {
  background: var(--drawer-hover, #f5f5f5);
}
```

```js
class GestureDrawer {
  constructor(drawer, backdrop) {
    this.drawer = drawer;
    this.backdrop = backdrop;
    this.isOpen = false;
    this.startX = 0;
    this.startY = 0;
    this.currentX = 0;
    this.startTime = 0;
    this.isDragging = false;
    this.previousFocus = null;
    this.drawerWidth = 0;

    this.drawer.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: true });
    this.drawer.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    this.drawer.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: true });
    this.backdrop.addEventListener('click', () => this.close());

    // Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) this.close();
    });
  }

  open() {
    this.previousFocus = document.activeElement;
    this.drawer.dataset.open = 'true';
    this.backdrop.dataset.open = 'true';
    this.drawer.removeAttribute('inert');
    this.backdrop.removeAttribute('aria-hidden');
    document.body.style.overflow = 'hidden';
    this.isOpen = true;
    this.drawerWidth = this.drawer.offsetWidth;

    requestAnimationFrame(() => {
      const firstLink = this.drawer.querySelector('a, button');
      firstLink?.focus();
    });
  }

  close() {
    this.drawer.dataset.open = 'false';
    this.backdrop.dataset.open = 'false';
    this.drawer.style.transform = '';
    this.backdrop.style.opacity = '';
    document.body.style.overflow = '';
    this.isOpen = false;

    this.drawer.addEventListener('transitionend', () => {
      this.drawer.setAttribute('inert', '');
      this.backdrop.setAttribute('aria-hidden', 'true');
    }, { once: true });

    this.previousFocus?.focus();
  }

  onTouchStart(e) {
    this.startX = e.touches[0].clientX;
    this.startY = e.touches[0].clientY;
    this.startTime = Date.now();
    this.isDragging = false;
  }

  onTouchMove(e) {
    const dx = e.touches[0].clientX - this.startX;
    const dy = e.touches[0].clientY - this.startY;

    // Only start dragging if horizontal movement dominates
    if (!this.isDragging) {
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
        this.isDragging = true;
        this.drawer.dataset.dragging = 'true';
      } else {
        return;
      }
    }

    e.preventDefault();

    // Only allow dragging in the close direction (left for left-side drawer)
    const clampedDx = Math.min(0, dx);
    this.currentX = clampedDx;
    this.drawer.style.transform = `translateX(${clampedDx}px)`;

    // Fade backdrop proportionally
    const progress = 1 + (clampedDx / this.drawerWidth);
    this.backdrop.style.opacity = Math.max(0, progress);
  }

  onTouchEnd() {
    if (!this.isDragging) return;

    this.drawer.dataset.dragging = 'false';
    this.isDragging = false;

    const elapsed = Date.now() - this.startTime;
    const velocity = Math.abs(this.currentX) / elapsed; // px/ms
    const displacement = Math.abs(this.currentX);

    // Close if velocity > 0.5 px/ms OR displacement > 80px
    if (velocity > 0.5 || displacement > 80) {
      this.close();
    } else {
      // Snap back open
      this.drawer.style.transform = '';
      this.backdrop.style.opacity = '';
    }

    this.currentX = 0;
  }
}

// Init
const drawer = document.getElementById('drawer');
const backdrop = document.getElementById('drawer-backdrop');
const gestureDrawer = new GestureDrawer(drawer, backdrop);

// Wire up toggle button
document.getElementById('menu-toggle')?.addEventListener('click', () => {
  gestureDrawer.isOpen ? gestureDrawer.close() : gestureDrawer.open();
});
```

### Edge-swipe to open (optional)
To let users swipe from the left edge to open the drawer (common on native apps):

```js
let edgeStartX = 0;
document.addEventListener('touchstart', (e) => {
  edgeStartX = e.touches[0].clientX;
}, { passive: true });

document.addEventListener('touchend', (e) => {
  const dx = e.changedTouches[0].clientX - edgeStartX;
  if (edgeStartX < 20 && dx > 80 && !gestureDrawer.isOpen) {
    gestureDrawer.open();
  }
}, { passive: true });
```

### Failure mode
Drawer intercepts vertical scroll on its own content. Fix: only activate horizontal drag tracking when `Math.abs(dx) > Math.abs(dy)`, and do not call `preventDefault()` until the drag direction is confirmed horizontal.

## Sticky headers that shrink and hide on scroll direction

Two behaviors, often combined: (1) shrink from a tall transparent header to a compact solid one on scroll, and (2) hide on scroll down, reveal on scroll up.

### Key numbers
- Scroll threshold for shrink: 8-16px (anything past the hero's top edge)
- Shrink height: 80px to 56px (desktop), 64px to 48px (mobile)
- Hide/show transition: 200ms ease
- Scroll delta for hide: 5px (prevents jitter from sub-pixel scroll events)
- The header MUST NOT cause layout shift on shrink. Use a wrapper with constant height.

### Complete implementation: shrink + direction-hide

```html
<div class="header-sentinel" aria-hidden="true"></div>
<header class="site-header" data-scrolled="false" data-hidden="false">
  <div class="site-header__inner">
    <a href="/" class="site-header__logo">Logo</a>
    <nav class="site-header__nav" aria-label="Main">
      <a href="/features">Features</a>
      <a href="/pricing">Pricing</a>
      <a href="/docs">Docs</a>
    </nav>
    <a href="/signup" class="site-header__cta">Get started</a>
  </div>
</header>
```

```css
.header-sentinel {
  height: 0;
  width: 100%;
}

.site-header {
  position: sticky;
  top: 0;
  z-index: 100;
  /* Constant wrapper height prevents layout shift */
  height: 80px;
  transition: height var(--nav-header), transform var(--nav-header);
}

.site-header[data-scrolled="true"] {
  height: 56px;
}

.site-header[data-hidden="true"] {
  transform: translateY(-100%);
}

.site-header__inner {
  height: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--header-bg, #fff);
  border-bottom: 1px solid var(--header-border, transparent);
  transition: background-color var(--nav-header),
              border-color var(--nav-header),
              backdrop-filter var(--nav-header);
}

.site-header[data-scrolled="true"] .site-header__inner {
  background: var(--header-bg-scrolled, rgba(255, 255, 255, 0.85));
  backdrop-filter: blur(12px) saturate(1.2);
  -webkit-backdrop-filter: blur(12px) saturate(1.2);
  border-color: var(--header-border-scrolled, rgba(0, 0, 0, 0.08));
}

.site-header__logo {
  font-weight: 700;
  font-size: 1.125rem;
  text-decoration: none;
  color: var(--header-text, #111);
  transition: font-size var(--nav-header);
}

.site-header[data-scrolled="true"] .site-header__logo {
  font-size: 1rem;
}

.site-header__nav a {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--header-text, #374151);
  text-decoration: none;
  padding: 0.5rem 0.75rem;
}

.site-header__cta {
  font-size: 0.8125rem;
  font-weight: 600;
  padding: 0.5rem 1rem;
  background: var(--cta-bg, #111);
  color: var(--cta-text, #fff);
  border-radius: 0.375rem;
  text-decoration: none;
  transition: transform 150ms ease, box-shadow 150ms ease;
}

.site-header__cta:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

@media (max-width: 768px) {
  .site-header { height: 64px; }
  .site-header[data-scrolled="true"] { height: 48px; }
  .site-header__nav { display: none; }
}
```

```js
class StickyHeader {
  constructor(header) {
    this.header = header;
    this.lastScrollY = 0;
    this.scrollDelta = 0;
    this.ticking = false;
    this.SHRINK_THRESHOLD = 8;
    this.HIDE_DELTA = 5;

    // Use IntersectionObserver for shrink (no scroll listener needed)
    const sentinel = document.querySelector('.header-sentinel');
    this.shrinkObserver = new IntersectionObserver(
      ([entry]) => {
        header.dataset.scrolled = (!entry.isIntersecting).toString();
      },
      { threshold: 0, rootMargin: `-${this.SHRINK_THRESHOLD}px 0px 0px 0px` }
    );
    this.shrinkObserver.observe(sentinel);

    // Scroll listener for direction-based hide/show
    window.addEventListener('scroll', this.onScroll.bind(this), { passive: true });
  }

  onScroll() {
    if (!this.ticking) {
      requestAnimationFrame(() => {
        const currentY = window.scrollY;
        const delta = currentY - this.lastScrollY;

        // Only act if delta exceeds threshold (prevents jitter)
        if (Math.abs(delta) > this.HIDE_DELTA) {
          if (delta > 0 && currentY > 100) {
            // Scrolling down past 100px: hide
            this.header.dataset.hidden = 'true';
          } else {
            // Scrolling up: show
            this.header.dataset.hidden = 'false';
          }
          this.lastScrollY = currentY;
        }

        this.ticking = false;
      });
      this.ticking = true;
    }
  }
}

new StickyHeader(document.querySelector('.site-header'));
```

### IntersectionObserver vs scroll listener
Use IntersectionObserver for the shrink effect (binary: past threshold or not). Use a scroll listener only for direction detection (needs continuous delta). Never use a scroll listener for both. The observer fires once per threshold crossing; the scroll listener fires 60+ times per second.

### The morphing header variant
For a transparent-to-glass-pill header (as seen on Stripe, Linear), see the Header Morph pattern. The key: the outer wrapper keeps constant flow height while only the inner pill element transitions its max-width, height, background, and border-radius. This prevents any content reflow.

### Failure mode
Content jumps when header switches between `position: static` and `position: sticky/fixed`. Fix: always use `position: sticky; top: 0` and never change positioning mode. The header sentinel + IntersectionObserver approach avoids this entirely.


## App shell sidebars

Use for dashboards, docs sites, admin panels. Persistent left sidebar with collapsible groups, hover-expand on desktop, and breakpoint swap to a drawer on mobile.

### Key numbers
- Expanded width: 240-280px
- Collapsed width: 56-64px (icon-only)
- Expand/collapse duration: 200ms ease
- Mobile breakpoint: 1024px (swap to drawer)
- Active item indicator: 2px left border or background highlight

### Complete implementation

```html
<div class="app-shell">
  <aside class="sidebar" data-collapsed="false" aria-label="App navigation">
    <div class="sidebar__header">
      <span class="sidebar__logo">App</span>
      <button class="sidebar__toggle" aria-label="Collapse sidebar">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 12L6 8l4-4" stroke="currentColor" stroke-width="1.5"
                stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>
    <nav class="sidebar__nav">
      <div class="sidebar__group">
        <button class="sidebar__group-toggle" aria-expanded="true">
          <span class="sidebar__group-label">Overview</span>
        </button>
        <div class="sidebar__group-items">
          <a href="/dashboard" class="sidebar__link" data-active="true">
            <svg class="sidebar__icon" width="18" height="18" aria-hidden="true"><!-- icon --></svg>
            <span class="sidebar__label">Dashboard</span>
          </a>
          <a href="/analytics" class="sidebar__link">
            <svg class="sidebar__icon" width="18" height="18" aria-hidden="true"><!-- icon --></svg>
            <span class="sidebar__label">Analytics</span>
          </a>
        </div>
      </div>
      <div class="sidebar__group">
        <button class="sidebar__group-toggle" aria-expanded="false">
          <span class="sidebar__group-label">Settings</span>
        </button>
        <div class="sidebar__group-items" hidden>
          <a href="/settings/general" class="sidebar__link">
            <svg class="sidebar__icon" width="18" height="18" aria-hidden="true"><!-- icon --></svg>
            <span class="sidebar__label">General</span>
          </a>
          <a href="/settings/team" class="sidebar__link">
            <svg class="sidebar__icon" width="18" height="18" aria-hidden="true"><!-- icon --></svg>
            <span class="sidebar__label">Team</span>
          </a>
        </div>
      </div>
    </nav>
  </aside>
  <main class="app-shell__main">
    <!-- page content -->
  </main>
</div>
```

```css
.app-shell {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 256px;
  background: var(--sidebar-bg, #fafafa);
  border-right: 1px solid var(--sidebar-border, #e5e7eb);
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  overscroll-behavior: contain;
  transition: width 200ms ease;
  flex-shrink: 0;
}

.sidebar[data-collapsed="true"] {
  width: 60px;
}

.sidebar__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  height: 56px;
}

.sidebar[data-collapsed="true"] .sidebar__logo,
.sidebar[data-collapsed="true"] .sidebar__label,
.sidebar[data-collapsed="true"] .sidebar__group-label {
  display: none;
}

.sidebar__toggle {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.375rem;
  border-radius: 0.375rem;
  color: var(--sidebar-text-muted, #6b7280);
  transition: background 150ms ease;
}

.sidebar__toggle:hover {
  background: var(--sidebar-hover, #f3f4f6);
}

.sidebar[data-collapsed="true"] .sidebar__toggle svg {
  transform: rotate(180deg);
}

.sidebar__nav {
  padding: 0 0.5rem;
  flex: 1;
}

.sidebar__group-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--sidebar-text-muted, #9ca3af);
  background: none;
  border: none;
  cursor: pointer;
}

.sidebar__link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 450;
  color: var(--sidebar-text, #374151);
  text-decoration: none;
  border-radius: 0.375rem;
  min-height: 36px;
  transition: background 150ms ease, color 150ms ease;
}

.sidebar__link:hover {
  background: var(--sidebar-hover, #f3f4f6);
  color: var(--sidebar-text-active, #111827);
}

.sidebar__link[data-active="true"] {
  background: var(--sidebar-active-bg, #eff6ff);
  color: var(--sidebar-active-text, #1d4ed8);
  font-weight: 500;
}

.sidebar__icon {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
}

.app-shell__main {
  flex: 1;
  min-width: 0;
}

/* Mobile: swap to overlay drawer */
@media (max-width: 1023px) {
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: 310;
    width: min(280px, 85vw);
    transform: translateX(-100%);
    transition: transform 350ms cubic-bezier(0.32, 0.72, 0, 1);
  }
  .sidebar[data-open="true"] {
    transform: translateX(0);
  }
  .sidebar[data-collapsed="true"] {
    width: min(280px, 85vw); /* Override collapse on mobile */
  }
}
```

```js
// Collapse toggle
const sidebar = document.querySelector('.sidebar');
const toggleBtn = sidebar.querySelector('.sidebar__toggle');
toggleBtn.addEventListener('click', () => {
  const collapsed = sidebar.dataset.collapsed === 'true';
  sidebar.dataset.collapsed = (!collapsed).toString();
  toggleBtn.setAttribute('aria-label', collapsed ? 'Collapse sidebar' : 'Expand sidebar');
  localStorage.setItem('sidebar-collapsed', (!collapsed).toString());
});

// Restore preference
const saved = localStorage.getItem('sidebar-collapsed');
if (saved) sidebar.dataset.collapsed = saved;

// Collapsible groups
sidebar.querySelectorAll('.sidebar__group-toggle').forEach(toggle => {
  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', (!expanded).toString());
    const items = toggle.nextElementSibling;
    items.hidden = expanded;
  });
});
```

### Failure mode
Sidebar width change causes main content layout reflow (text rewraps, images resize). Fix: use `flex-shrink: 0` on the sidebar and `min-width: 0` on the main content area so the main content fills remaining space without fighting the sidebar.

## Command palettes with fuzzy search

Use for power-user apps. Triggered by Cmd+K (Mac) or Ctrl+K (Windows). Shows a search input with fuzzy-matched results grouped by category.

### Key numbers
- Open: 150ms (fast, this is a productivity tool)
- Max width: 640px
- Max visible results: 8-10 (scroll for more)
- Debounce: 0ms for local data, 150ms for API calls
- Score threshold: drop results below 0.3 match score

### Complete implementation (vanilla, no cmdk dependency)

```html
<div id="palette-backdrop" class="palette-backdrop" aria-hidden="true"></div>
<div id="palette" class="palette" role="dialog" aria-modal="true"
     aria-label="Command palette" inert>
  <div class="palette__search">
    <svg class="palette__search-icon" width="20" height="20" viewBox="0 0 20 20"
         fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.5"/>
      <path d="M13.5 13.5L17 17" stroke="currentColor" stroke-width="1.5"
            stroke-linecap="round"/>
    </svg>
    <input id="palette-input" class="palette__input" type="text"
           placeholder="Type a command or search..." autocomplete="off"
           role="combobox" aria-expanded="true" aria-controls="palette-results"
           aria-autocomplete="list" aria-activedescendant="">
    <kbd class="palette__shortcut">Esc</kbd>
  </div>
  <div id="palette-results" class="palette__results" role="listbox">
    <!-- Results injected by JS -->
  </div>
  <div class="palette__footer">
    <span><kbd>&uarr;</kbd><kbd>&darr;</kbd> navigate</span>
    <span><kbd>Enter</kbd> select</span>
    <span><kbd>Esc</kbd> close</span>
  </div>
</div>
```

```css
.palette-backdrop {
  position: fixed;
  inset: 0;
  z-index: 500;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  opacity: 0;
  visibility: hidden;
  transition: opacity 150ms ease, visibility 0ms 150ms;
}

.palette-backdrop[data-open="true"] {
  opacity: 1;
  visibility: visible;
  transition: opacity 150ms ease, visibility 0ms 0ms;
}

.palette {
  position: fixed;
  top: min(20vh, 200px);
  left: 50%;
  transform: translateX(-50%) scale(0.98);
  z-index: 510;
  width: min(640px, calc(100vw - 2rem));
  background: var(--palette-bg, #fff);
  border: 1px solid var(--palette-border, #e5e7eb);
  border-radius: 0.75rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15), 0 4px 16px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  opacity: 0;
  visibility: hidden;
  transition: opacity 150ms ease, transform 150ms ease, visibility 0ms 150ms;
}

.palette[data-open="true"] {
  opacity: 1;
  visibility: visible;
  transform: translateX(-50%) scale(1);
  transition: opacity 150ms ease, transform 150ms ease, visibility 0ms 0ms;
}

.palette__search {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--palette-border, #e5e7eb);
}

.palette__search-icon {
  color: var(--palette-text-muted, #9ca3af);
  flex-shrink: 0;
}

.palette__input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 1rem;
  background: transparent;
  color: var(--palette-text, #111);
}

.palette__input::placeholder {
  color: var(--palette-text-muted, #9ca3af);
}

.palette__shortcut {
  font-size: 0.75rem;
  padding: 0.125rem 0.375rem;
  background: var(--palette-kbd-bg, #f3f4f6);
  border: 1px solid var(--palette-border, #e5e7eb);
  border-radius: 0.25rem;
  color: var(--palette-text-muted, #6b7280);
  font-family: inherit;
}

.palette__results {
  max-height: 320px;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0.5rem;
}

.palette__group-label {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--palette-text-muted, #6b7280);
  padding: 0.5rem 0.5rem 0.25rem;
}

.palette__item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  color: var(--palette-text, #374151);
  border-radius: 0.375rem;
  cursor: pointer;
  min-height: 40px;
}

.palette__item[data-selected="true"],
.palette__item:hover {
  background: var(--palette-item-active, #f3f4f6);
  color: var(--palette-text-active, #111);
}

.palette__footer {
  display: flex;
  gap: 1rem;
  padding: 0.5rem 1rem;
  border-top: 1px solid var(--palette-border, #e5e7eb);
  font-size: 0.75rem;
  color: var(--palette-text-muted, #9ca3af);
}

.palette__footer kbd {
  font-size: 0.6875rem;
  padding: 0.0625rem 0.25rem;
  background: var(--palette-kbd-bg, #f3f4f6);
  border: 1px solid var(--palette-border, #e5e7eb);
  border-radius: 0.1875rem;
  margin-right: 0.25rem;
}
```

```js
class CommandPalette {
  constructor(commands) {
    this.commands = commands; // [{id, label, group, icon, action, keywords}]
    this.palette = document.getElementById('palette');
    this.backdrop = document.getElementById('palette-backdrop');
    this.input = document.getElementById('palette-input');
    this.results = document.getElementById('palette-results');
    this.selectedIndex = 0;
    this.filteredItems = [];
    this.isOpen = false;
    this.previousFocus = null;

    // Keyboard shortcut
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        this.isOpen ? this.close() : this.open();
      }
    });

    this.input.addEventListener('input', () => this.search(this.input.value));
    this.palette.addEventListener('keydown', this.onKeydown.bind(this));
    this.backdrop.addEventListener('click', () => this.close());
  }

  open() {
    this.previousFocus = document.activeElement;
    this.palette.dataset.open = 'true';
    this.backdrop.dataset.open = 'true';
    this.palette.removeAttribute('inert');
    this.isOpen = true;
    this.input.value = '';
    this.search('');
    requestAnimationFrame(() => this.input.focus());
  }

  close() {
    this.palette.dataset.open = 'false';
    this.backdrop.dataset.open = 'false';
    this.isOpen = false;
    this.palette.addEventListener('transitionend', () => {
      this.palette.setAttribute('inert', '');
    }, { once: true });
    this.previousFocus?.focus();
  }

  search(query) {
    if (!query) {
      this.filteredItems = this.commands;
    } else {
      this.filteredItems = this.commands
        .map(cmd => ({
          ...cmd,
          score: this.fuzzyScore(query.toLowerCase(), (cmd.label + ' ' + (cmd.keywords || '')).toLowerCase())
        }))
        .filter(cmd => cmd.score > 0.3)
        .sort((a, b) => b.score - a.score);
    }

    this.selectedIndex = 0;
    this.render();
  }

  fuzzyScore(query, target) {
    let qi = 0;
    let score = 0;
    let lastMatch = -1;

    for (let ti = 0; ti < target.length && qi < query.length; ti++) {
      if (target[ti] === query[qi]) {
        score += 1;
        // Bonus for consecutive matches
        if (lastMatch === ti - 1) score += 2;
        // Bonus for match at start or after separator
        if (ti === 0 || target[ti - 1] === ' ' || target[ti - 1] === '-') score += 3;
        lastMatch = ti;
        qi++;
      }
    }

    // All query chars must match
    if (qi < query.length) return 0;

    return score / (query.length * 6); // Normalize to 0-1
  }

  render() {
    const groups = {};
    this.filteredItems.forEach(item => {
      const g = item.group || 'Actions';
      if (!groups[g]) groups[g] = [];
      groups[g].push(item);
    });

    let html = '';
    let globalIdx = 0;
    for (const [group, items] of Object.entries(groups)) {
      html += `<div class="palette__group-label">${group}</div>`;
      for (const item of items) {
        const selected = globalIdx === this.selectedIndex ? 'true' : 'false';
        html += `<div class="palette__item" role="option" id="palette-item-${globalIdx}"
                      data-selected="${selected}" data-idx="${globalIdx}"
                      data-id="${item.id}">
                   ${item.icon || ''}
                   <span>${item.label}</span>
                 </div>`;
        globalIdx++;
      }
    }

    this.results.innerHTML = html || '<div class="palette__item">No results found</div>';
    this.input.setAttribute('aria-activedescendant',
      this.filteredItems.length ? `palette-item-${this.selectedIndex}` : '');

    // Click handlers
    this.results.querySelectorAll('.palette__item[data-id]').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.idx);
        this.execute(idx);
      });
    });
  }

  onKeydown(e) {
    if (e.key === 'Escape') { this.close(); return; }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.selectedIndex = Math.min(this.selectedIndex + 1, this.filteredItems.length - 1);
      this.render();
      this.scrollToSelected();
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
      this.render();
      this.scrollToSelected();
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      this.execute(this.selectedIndex);
    }
  }

  scrollToSelected() {
    const el = this.results.querySelector(`[data-idx="${this.selectedIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }

  execute(idx) {
    const item = this.filteredItems[idx];
    if (item?.action) {
      this.close();
      item.action();
    }
  }
}

// Usage
const palette = new CommandPalette([
  { id: 'home', label: 'Go to Home', group: 'Navigation', action: () => location.href = '/' },
  { id: 'settings', label: 'Open Settings', group: 'Navigation', action: () => location.href = '/settings' },
  { id: 'theme', label: 'Toggle Dark Mode', group: 'Actions', keywords: 'dark light theme',
    action: () => document.documentElement.classList.toggle('dark') },
  { id: 'search', label: 'Search Documentation', group: 'Actions', action: () => location.href = '/docs' },
]);
```

### Failure mode
Fuzzy search returns too many low-quality matches. Fix: require all query characters to appear in order in the target, and drop any result below a 0.3 normalized score. Weight consecutive matches and word-boundary matches higher.

## Breadcrumbs

Use on any site with hierarchy deeper than two levels. Breadcrumbs answer "where am I?" and let users jump up the hierarchy.

### Key numbers
- Max visible items: 4-5. Beyond that, collapse middle items into an ellipsis menu.
- Separator: `/` or `>` or a chevron SVG. Be consistent site-wide.
- Font size: 0.8125rem-0.875rem (smaller than body text)
- Current page is NOT a link (use `aria-current="page"`)

### Complete implementation with overflow collapse

```html
<nav aria-label="Breadcrumb" class="breadcrumb">
  <ol class="breadcrumb__list">
    <li class="breadcrumb__item">
      <a href="/" class="breadcrumb__link">Home</a>
    </li>
    <li class="breadcrumb__separator" aria-hidden="true">/</li>
    <li class="breadcrumb__item">
      <a href="/docs" class="breadcrumb__link">Docs</a>
    </li>
    <li class="breadcrumb__separator" aria-hidden="true">/</li>
    <li class="breadcrumb__item">
      <a href="/docs/components" class="breadcrumb__link">Components</a>
    </li>
    <li class="breadcrumb__separator" aria-hidden="true">/</li>
    <li class="breadcrumb__item">
      <span class="breadcrumb__current" aria-current="page">Button</span>
    </li>
  </ol>
</nav>
```

```css
.breadcrumb__list {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 0.875rem;
  flex-wrap: wrap;
}

.breadcrumb__link {
  color: var(--breadcrumb-link, #6b7280);
  text-decoration: none;
  transition: color 150ms ease;
}

.breadcrumb__link:hover {
  color: var(--breadcrumb-link-hover, #111827);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.breadcrumb__separator {
  color: var(--breadcrumb-sep, #d1d5db);
  user-select: none;
}

.breadcrumb__current {
  color: var(--breadcrumb-current, #111827);
  font-weight: 500;
}
```

### JSON-LD structured data
Always include this for SEO. Google renders breadcrumb trails in search results.

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://example.com/" },
    { "@type": "ListItem", "position": 2, "name": "Docs", "item": "https://example.com/docs" },
    { "@type": "ListItem", "position": 3, "name": "Components", "item": "https://example.com/docs/components" },
    { "@type": "ListItem", "position": 4, "name": "Button" }
  ]
}
</script>
```

### Overflow ellipsis (6+ items)
When the breadcrumb exceeds 5 items, collapse the middle into a `...` button that opens a dropdown:

```js
function collapseBreadcrumbs(nav, maxVisible = 4) {
  const items = nav.querySelectorAll('.breadcrumb__item');
  if (items.length <= maxVisible) return;

  const separators = nav.querySelectorAll('.breadcrumb__separator');
  const collapsedItems = [];

  // Keep first, last, and last-1. Collapse everything in between.
  for (let i = 1; i < items.length - 2; i++) {
    items[i].hidden = true;
    if (separators[i]) separators[i].hidden = true;
    collapsedItems.push(items[i]);
  }

  // Insert ellipsis button after first item
  const ellipsis = document.createElement('li');
  ellipsis.className = 'breadcrumb__item';
  ellipsis.innerHTML = `<button class="breadcrumb__ellipsis" aria-label="Show collapsed breadcrumbs"
                                aria-expanded="false">&hellip;</button>`;
  const sep = document.createElement('li');
  sep.className = 'breadcrumb__separator';
  sep.setAttribute('aria-hidden', 'true');
  sep.textContent = '/';

  items[0].after(separators[0], ellipsis, sep);

  // Toggle collapsed items on click
  ellipsis.querySelector('button').addEventListener('click', () => {
    collapsedItems.forEach(item => item.hidden = false);
    ellipsis.remove();
    sep.remove();
  });
}
```

### Failure mode
Current page is rendered as a clickable link that navigates to itself. Fix: use `<span>` with `aria-current="page"`, not `<a>`.


## Animated tab indicators

Use for tab interfaces where visual continuity between the old and new tab matters. The indicator (underline or pill background) slides from the previous tab to the next.

### Key numbers
- Indicator animation: 300ms cubic-bezier(0.65, 0, 0.35, 1)
- Indicator height (underline): 2px
- Indicator border-radius (pill): match the tab's border-radius
- Do not animate width; measure and set it directly from the active tab's bounding rect

### Complete implementation: sliding underline

```html
<div class="tabs" role="tablist" aria-label="Content tabs">
  <button role="tab" class="tabs__tab" aria-selected="true"
          aria-controls="panel-1" id="tab-1">Overview</button>
  <button role="tab" class="tabs__tab" aria-selected="false"
          aria-controls="panel-2" id="tab-2" tabindex="-1">Features</button>
  <button role="tab" class="tabs__tab" aria-selected="false"
          aria-controls="panel-3" id="tab-3" tabindex="-1">Pricing</button>
  <div class="tabs__indicator" aria-hidden="true"></div>
</div>
<div id="panel-1" role="tabpanel" aria-labelledby="tab-1" class="tabs__panel">Overview content</div>
<div id="panel-2" role="tabpanel" aria-labelledby="tab-2" class="tabs__panel" hidden>Features content</div>
<div id="panel-3" role="tabpanel" aria-labelledby="tab-3" class="tabs__panel" hidden>Pricing content</div>
```

```css
.tabs {
  position: relative;
  display: flex;
  border-bottom: 1px solid var(--tab-border, #e5e7eb);
}

.tabs__tab {
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--tab-text, #6b7280);
  background: none;
  border: none;
  cursor: pointer;
  position: relative;
  white-space: nowrap;
  transition: color 200ms ease;
}

.tabs__tab[aria-selected="true"] {
  color: var(--tab-text-active, #111827);
}

.tabs__indicator {
  position: absolute;
  bottom: -1px;
  height: 2px;
  background: var(--tab-indicator, #111827);
  transition: left 300ms cubic-bezier(0.65, 0, 0.35, 1),
              width 300ms cubic-bezier(0.65, 0, 0.35, 1);
}

.tabs__panel {
  padding: 1.5rem 0;
}
```

```js
class AnimatedTabs {
  constructor(container) {
    this.container = container;
    this.tabs = container.querySelectorAll('[role="tab"]');
    this.indicator = container.querySelector('.tabs__indicator');
    this.panels = [];

    this.tabs.forEach(tab => {
      const panel = document.getElementById(tab.getAttribute('aria-controls'));
      this.panels.push(panel);

      tab.addEventListener('click', () => this.activate(tab));
      tab.addEventListener('keydown', (e) => this.onKeydown(e, tab));
    });

    // Position indicator on initial active tab
    const activeTab = container.querySelector('[aria-selected="true"]');
    if (activeTab) this.moveIndicator(activeTab, false);

    // Reposition on resize
    const ro = new ResizeObserver(() => {
      const active = container.querySelector('[aria-selected="true"]');
      if (active) this.moveIndicator(active, false);
    });
    ro.observe(container);
  }

  activate(tab) {
    this.tabs.forEach((t, i) => {
      const selected = t === tab;
      t.setAttribute('aria-selected', selected.toString());
      t.setAttribute('tabindex', selected ? '0' : '-1');
      this.panels[i].hidden = !selected;
    });
    this.moveIndicator(tab, true);
    tab.focus();
  }

  moveIndicator(tab, animate) {
    const rect = tab.getBoundingClientRect();
    const containerRect = this.container.getBoundingClientRect();
    const left = rect.left - containerRect.left + this.container.scrollLeft;

    if (!animate) {
      this.indicator.style.transition = 'none';
    }

    this.indicator.style.left = `${left}px`;
    this.indicator.style.width = `${rect.width}px`;

    if (!animate) {
      // Force reflow then restore transition
      this.indicator.offsetHeight;
      this.indicator.style.transition = '';
    }
  }

  onKeydown(e, tab) {
    const tabsArr = [...this.tabs];
    const idx = tabsArr.indexOf(tab);

    let nextIdx = idx;
    if (e.key === 'ArrowRight') nextIdx = (idx + 1) % tabsArr.length;
    else if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + tabsArr.length) % tabsArr.length;
    else if (e.key === 'Home') nextIdx = 0;
    else if (e.key === 'End') nextIdx = tabsArr.length - 1;
    else return;

    e.preventDefault();
    this.activate(tabsArr[nextIdx]);
  }
}

document.querySelectorAll('.tabs').forEach(el => new AnimatedTabs(el));
```

### Pill variant
Replace the underline with a sliding background pill. Change the indicator to:

```css
.tabs__indicator--pill {
  position: absolute;
  top: 4px;
  height: calc(100% - 8px);
  background: var(--tab-pill-bg, #f3f4f6);
  border-radius: 0.375rem;
  z-index: -1;
  transition: left 300ms cubic-bezier(0.65, 0, 0.35, 1),
              width 300ms cubic-bezier(0.65, 0, 0.35, 1);
}
```

### Failure mode
Indicator position is wrong after window resize or container layout change. Fix: use ResizeObserver to recalculate on layout changes, and measure from the tab's bounding rect relative to the container, not from `offsetLeft` (which is unreliable with scrolling tab lists).

## Anchor scrollspy

Use for single-page sites or documentation sidebars. Highlights the navigation link corresponding to the section currently in view.

### Key numbers
- Observer root margin: `-20% 0px -70% 0px` (section is "active" when its top is in the upper 30% of the viewport)
- Transition on highlight: 200ms ease (color and indicator)
- Threshold: 0 (trigger as soon as any pixel enters the root margin zone)

### Complete implementation

```html
<nav class="scrollspy-nav" aria-label="Page sections">
  <a href="#intro" class="scrollspy-nav__link" data-active="true">Introduction</a>
  <a href="#features" class="scrollspy-nav__link">Features</a>
  <a href="#pricing" class="scrollspy-nav__link">Pricing</a>
  <a href="#faq" class="scrollspy-nav__link">FAQ</a>
</nav>

<section id="intro">...</section>
<section id="features">...</section>
<section id="pricing">...</section>
<section id="faq">...</section>
```

```css
.scrollspy-nav {
  position: sticky;
  top: 5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.scrollspy-nav__link {
  padding: 0.375rem 0.75rem;
  font-size: 0.8125rem;
  color: var(--spy-text, #6b7280);
  text-decoration: none;
  border-left: 2px solid transparent;
  transition: color 200ms ease, border-color 200ms ease;
}

.scrollspy-nav__link[data-active="true"] {
  color: var(--spy-text-active, #111827);
  border-left-color: var(--spy-indicator, #111827);
  font-weight: 500;
}
```

```js
class Scrollspy {
  constructor(nav) {
    this.links = nav.querySelectorAll('.scrollspy-nav__link');
    this.sections = [];
    this.activeId = null;

    this.links.forEach(link => {
      const id = link.getAttribute('href').slice(1);
      const section = document.getElementById(id);
      if (section) this.sections.push({ id, el: section, link });
    });

    // rootMargin: active when section top is in upper 30% of viewport
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.setActive(entry.target.id);
          }
        });
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 }
    );

    this.sections.forEach(({ el }) => this.observer.observe(el));

    // Smooth scroll on link click
    this.links.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const id = link.getAttribute('href').slice(1);
        const section = document.getElementById(id);
        section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.pushState(null, '', `#${id}`);
      });
    });
  }

  setActive(id) {
    if (id === this.activeId) return;
    this.activeId = id;
    this.links.forEach(link => {
      const linkId = link.getAttribute('href').slice(1);
      link.dataset.active = (linkId === id).toString();
    });
  }

  destroy() {
    this.observer.disconnect();
  }
}

document.querySelectorAll('.scrollspy-nav').forEach(nav => new Scrollspy(nav));
```

### Failure mode
Multiple sections are simultaneously "active", or the active highlight lags behind the scroll by a full section. Fix: the root margin `-20% 0px -70% 0px` creates a narrow activation zone. Only the section whose top edge is in that zone wins. If two sections are short enough to both be in the zone, the last one that fired `isIntersecting: true` wins (IntersectionObserver delivers entries in document order, so the lower section takes priority).

## Search overlays

Use when search deserves full-screen treatment (e-commerce, content-heavy sites) or when an inline search input expands into a results panel.

### Key numbers
- Fullscreen overlay: same as fullscreen menu pattern (z-index 400, fade 350ms)
- Inline expand: input grows from compact (200px) to full-width over 200ms
- Results appear after 150ms debounce
- Show 5-8 result previews, then a "View all results" link

### Complete implementation: expanding inline search

```html
<div class="search-bar" data-expanded="false">
  <button class="search-bar__trigger" aria-label="Search" aria-expanded="false"
          aria-controls="search-panel">
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" stroke-width="1.5"/>
      <path d="M12.5 12.5L16 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
  </button>
  <div id="search-panel" class="search-bar__panel">
    <input class="search-bar__input" type="search" placeholder="Search..."
           autocomplete="off" aria-label="Search">
    <div class="search-bar__results" role="listbox"></div>
  </div>
</div>
```

```css
.search-bar {
  position: relative;
}

.search-bar__trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: none;
  border: 1px solid var(--search-border, #e5e7eb);
  border-radius: 0.5rem;
  cursor: pointer;
  color: var(--search-icon, #6b7280);
  transition: border-color 150ms ease;
}

.search-bar[data-expanded="true"] .search-bar__trigger {
  opacity: 0;
  pointer-events: none;
}

.search-bar__panel {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 0;
  opacity: 0;
  overflow: hidden;
  transition: width 200ms ease, opacity 200ms ease;
  background: var(--search-bg, #fff);
  border: 1px solid transparent;
  border-radius: 0.5rem;
  box-shadow: none;
}

.search-bar[data-expanded="true"] .search-bar__panel {
  width: min(480px, calc(100vw - 2rem));
  opacity: 1;
  border-color: var(--search-border, #e5e7eb);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
}

.search-bar__input {
  width: 100%;
  padding: 0.625rem 1rem;
  border: none;
  outline: none;
  font-size: 0.875rem;
  background: transparent;
}

.search-bar__results {
  max-height: 320px;
  overflow-y: auto;
  border-top: 1px solid var(--search-border, #e5e7eb);
}

.search-bar__results:empty {
  display: none;
}

.search-bar__result-item {
  display: block;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  color: var(--search-text, #374151);
  text-decoration: none;
  cursor: pointer;
}

.search-bar__result-item:hover,
.search-bar__result-item[data-selected="true"] {
  background: var(--search-item-hover, #f3f4f6);
}
```

```js
class SearchOverlay {
  constructor(container) {
    this.container = container;
    this.trigger = container.querySelector('.search-bar__trigger');
    this.panel = container.querySelector('.search-bar__panel');
    this.input = container.querySelector('.search-bar__input');
    this.results = container.querySelector('.search-bar__results');
    this.debounceTimer = null;

    this.trigger.addEventListener('click', () => this.expand());

    this.input.addEventListener('input', () => {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => this.search(this.input.value), 150);
    });

    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.collapse();
    });

    document.addEventListener('click', (e) => {
      if (!container.contains(e.target)) this.collapse();
    });
  }

  expand() {
    this.container.dataset.expanded = 'true';
    this.trigger.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => this.input.focus());
  }

  collapse() {
    this.container.dataset.expanded = 'false';
    this.trigger.setAttribute('aria-expanded', 'false');
    this.input.value = '';
    this.results.innerHTML = '';
  }

  async search(query) {
    if (!query.trim()) { this.results.innerHTML = ''; return; }

    // Replace with real search API
    const mockResults = [
      { title: `Result for "${query}"`, url: '#' },
      { title: `Another match for "${query}"`, url: '#' },
    ];

    this.results.innerHTML = mockResults.map((r, i) =>
      `<a class="search-bar__result-item" href="${r.url}" role="option"
          data-selected="${i === 0}">${r.title}</a>`
    ).join('');
  }
}

document.querySelectorAll('.search-bar').forEach(el => new SearchOverlay(el));
```

### Failure mode
Search panel clips behind adjacent header elements. Fix: ensure the search container has `position: relative` and the panel has z-index above sibling header items.

## Multi-level mobile navigation

Use when a mobile nav has more than one level of depth. Two patterns: accordion (expand in place) and drill-down (slide to a sub-page).

### Accordion pattern (expand in place)

```html
<nav class="mobile-nav" aria-label="Mobile navigation">
  <ul class="mobile-nav__list" role="tree">
    <li class="mobile-nav__item" role="treeitem">
      <a href="/" class="mobile-nav__link">Home</a>
    </li>
    <li class="mobile-nav__item" role="treeitem" aria-expanded="false">
      <button class="mobile-nav__toggle">
        <span>Products</span>
        <svg class="mobile-nav__chevron" width="12" height="12" viewBox="0 0 12 12"
             aria-hidden="true">
          <path d="M3 4.5l3 3 3-3" stroke="currentColor" stroke-width="1.5"
                stroke-linecap="round" fill="none"/>
        </svg>
      </button>
      <ul class="mobile-nav__submenu" role="group" hidden>
        <li role="treeitem"><a href="/analytics" class="mobile-nav__link">Analytics</a></li>
        <li role="treeitem"><a href="/automation" class="mobile-nav__link">Automation</a></li>
        <li role="treeitem"><a href="/security" class="mobile-nav__link">Security</a></li>
      </ul>
    </li>
    <li class="mobile-nav__item" role="treeitem">
      <a href="/pricing" class="mobile-nav__link">Pricing</a>
    </li>
  </ul>
</nav>
```

```css
.mobile-nav__toggle {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  font-size: 1rem;
  font-weight: 500;
  background: none;
  border: none;
  cursor: pointer;
  min-height: 44px;
  color: var(--mobile-nav-text, #111);
}

.mobile-nav__chevron {
  transition: transform 200ms ease;
}

.mobile-nav__item[aria-expanded="true"] .mobile-nav__chevron {
  transform: rotate(180deg);
}

.mobile-nav__submenu {
  padding-left: 1rem;
}

.mobile-nav__link {
  display: block;
  padding: 0.625rem 1rem;
  font-size: 0.9375rem;
  color: var(--mobile-nav-text, #374151);
  text-decoration: none;
  min-height: 44px;
  display: flex;
  align-items: center;
}
```

```js
document.querySelectorAll('.mobile-nav__toggle').forEach(toggle => {
  toggle.addEventListener('click', () => {
    const item = toggle.closest('.mobile-nav__item');
    const expanded = item.getAttribute('aria-expanded') === 'true';
    const submenu = toggle.nextElementSibling;

    // Close sibling menus
    item.parentElement.querySelectorAll('.mobile-nav__item[aria-expanded="true"]').forEach(sib => {
      if (sib !== item) {
        sib.setAttribute('aria-expanded', 'false');
        sib.querySelector('.mobile-nav__submenu').hidden = true;
      }
    });

    item.setAttribute('aria-expanded', (!expanded).toString());
    submenu.hidden = expanded;
  });
});
```

### Drill-down pattern (slide to sub-page)
Used by iOS-style navigation. Each level slides in from the right, with a back button to return.

```js
class DrillDownNav {
  constructor(container) {
    this.container = container;
    this.levels = container.querySelectorAll('.drill-nav__level');
    this.currentLevel = 0;
    this.history = [0];

    container.querySelectorAll('[data-drill-to]').forEach(trigger => {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        const targetIdx = parseInt(trigger.dataset.drillTo);
        this.goTo(targetIdx);
      });
    });

    container.querySelectorAll('[data-drill-back]').forEach(back => {
      back.addEventListener('click', () => this.goBack());
    });
  }

  goTo(levelIdx) {
    this.levels[this.currentLevel].dataset.position = 'left';
    this.levels[levelIdx].dataset.position = 'center';
    this.currentLevel = levelIdx;
    this.history.push(levelIdx);
  }

  goBack() {
    if (this.history.length <= 1) return;
    this.levels[this.currentLevel].dataset.position = 'right';
    this.history.pop();
    const prevIdx = this.history[this.history.length - 1];
    this.levels[prevIdx].dataset.position = 'center';
    this.currentLevel = prevIdx;
  }
}
```

```css
.drill-nav {
  overflow: hidden;
  position: relative;
}

.drill-nav__level {
  position: absolute;
  inset: 0;
  transition: transform 300ms cubic-bezier(0.32, 0.72, 0, 1);
}

.drill-nav__level[data-position="center"] { transform: translateX(0); }
.drill-nav__level[data-position="left"] { transform: translateX(-100%); }
.drill-nav__level[data-position="right"] { transform: translateX(100%); }
```

### Failure mode
Submenu opens but is taller than the viewport, and the drawer does not scroll. Fix: set `overflow-y: auto; overscroll-behavior: contain` on the drawer container, not on individual submenu levels.


## Footer architecture

Footers serve three purposes: secondary navigation, trust signals (legal, social), and SEO link equity. Choose the pattern that matches site complexity.

### Column grid footer (standard)

```html
<footer class="site-footer" role="contentinfo">
  <div class="site-footer__grid">
    <div class="site-footer__brand">
      <a href="/" class="site-footer__logo">Logo</a>
      <p class="site-footer__tagline">Short tagline describing the product.</p>
    </div>
    <div class="site-footer__column">
      <h3 class="site-footer__heading">Product</h3>
      <ul class="site-footer__links">
        <li><a href="/features">Features</a></li>
        <li><a href="/pricing">Pricing</a></li>
        <li><a href="/integrations">Integrations</a></li>
        <li><a href="/changelog">Changelog</a></li>
      </ul>
    </div>
    <div class="site-footer__column">
      <h3 class="site-footer__heading">Resources</h3>
      <ul class="site-footer__links">
        <li><a href="/docs">Documentation</a></li>
        <li><a href="/blog">Blog</a></li>
        <li><a href="/guides">Guides</a></li>
      </ul>
    </div>
    <div class="site-footer__column">
      <h3 class="site-footer__heading">Company</h3>
      <ul class="site-footer__links">
        <li><a href="/about">About</a></li>
        <li><a href="/careers">Careers</a></li>
        <li><a href="/contact">Contact</a></li>
      </ul>
    </div>
  </div>
  <div class="site-footer__bottom">
    <span class="site-footer__copyright">&copy; 2025 Company. All rights reserved.</span>
    <div class="site-footer__legal">
      <a href="/privacy">Privacy</a>
      <a href="/terms">Terms</a>
    </div>
  </div>
</footer>
```

```css
.site-footer {
  background: var(--footer-bg, #fafafa);
  border-top: 1px solid var(--footer-border, #e5e7eb);
  padding: 4rem 1.5rem 2rem;
}

.site-footer__grid {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 2fr repeat(3, 1fr);
  gap: 3rem;
}

@media (max-width: 768px) {
  .site-footer__grid {
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
  }
  .site-footer__brand {
    grid-column: 1 / -1;
  }
}

@media (max-width: 480px) {
  .site-footer__grid {
    grid-template-columns: 1fr;
  }
}

.site-footer__heading {
  font-size: 0.8125rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--footer-heading, #111827);
  margin-bottom: 1rem;
}

.site-footer__links {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.site-footer__links a {
  font-size: 0.875rem;
  color: var(--footer-link, #6b7280);
  text-decoration: none;
  transition: color 150ms ease;
}

.site-footer__links a:hover {
  color: var(--footer-link-hover, #111827);
}

.site-footer__bottom {
  max-width: 1200px;
  margin: 3rem auto 0;
  padding-top: 1.5rem;
  border-top: 1px solid var(--footer-border, #e5e7eb);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  font-size: 0.8125rem;
  color: var(--footer-muted, #9ca3af);
}

.site-footer__legal {
  display: flex;
  gap: 1.5rem;
}

.site-footer__legal a {
  color: var(--footer-muted, #9ca3af);
  text-decoration: none;
}

.site-footer__legal a:hover {
  color: var(--footer-link-hover, #111827);
}
```

### Failure mode
Footer columns collapse into an unreadable single column on tablet. Fix: use a 2-column grid at 768px before collapsing to 1 column at 480px.

## Page transitions (integration layer)

For detailed API documentation on specific transition technologies, see these primitives:
- `page-transition-choreography` -- timing, exit/enter sequencing, element continuity, framework patterns
- `barba-spa-transitions` -- Barba.js v2 lifecycle, namespace-based transitions, ScrollTrigger cleanup
- `view-transitions-api` -- `document.startViewTransition()`, `view-transition-name`, cross-document MPA transitions
- `lenis-smooth-scroll` -- scroll proxy, `scrollerProxy`, scroll restoration during transitions

This section covers how to integrate these into a real nav architecture.

### Connecting nav links to page transitions

For View Transitions API (same-document SPA):
```js
document.querySelectorAll('a[href^="/"]').forEach(link => {
  link.addEventListener('click', async (e) => {
    e.preventDefault();
    const url = link.href;

    if (!document.startViewTransition) {
      location.href = url;
      return;
    }

    // Fetch new page content
    const response = await fetch(url);
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const transition = document.startViewTransition(() => {
      // Swap main content
      document.querySelector('main').innerHTML = doc.querySelector('main').innerHTML;
      document.title = doc.title;
      history.pushState(null, '', url);

      // Update active nav state
      document.querySelectorAll('[data-active]').forEach(el => el.dataset.active = 'false');
      const activeLink = document.querySelector(`a[href="${new URL(url).pathname}"]`);
      if (activeLink) activeLink.dataset.active = 'true';
    });

    await transition.finished;
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
});

// Handle back/forward
window.addEventListener('popstate', async () => {
  const response = await fetch(location.href);
  const html = await response.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  if (document.startViewTransition) {
    document.startViewTransition(() => {
      document.querySelector('main').innerHTML = doc.querySelector('main').innerHTML;
      document.title = doc.title;
    });
  } else {
    document.querySelector('main').innerHTML = doc.querySelector('main').innerHTML;
    document.title = doc.title;
  }
});
```

For cross-document MPA (Astro, static HTML):
```css
/* Both pages must include this */
@view-transition {
  navigation: auto;
}

/* Persistent nav does not transition */
header {
  view-transition-name: site-header;
}
::view-transition-old(site-header),
::view-transition-new(site-header) {
  animation: none;
  mix-blend-mode: normal;
}

/* Hero image morphs between pages */
.hero-image {
  view-transition-name: hero;
}
```

### Nav state persistence across transitions
The header and sidebar must persist across page transitions without re-animating. In a SPA, they live outside the swap container. In an MPA with View Transitions, give them a `view-transition-name` and set `animation: none` on their pseudo-elements.

### Next.js App Router integration
```tsx
// app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}

// app/template.tsx -- wraps each page for enter/exit animation
'use client';
import { motion } from 'framer-motion';

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, ease: [0.65, 0, 0.35, 1] }}
    >
      {children}
    </motion.div>
  );
}
```

### Astro integration
```astro
---
// src/layouts/Layout.astro
import { ViewTransitions } from 'astro:transitions';
---
<html lang="en">
  <head>
    <ViewTransitions />
  </head>
  <body>
    <header transition:persist>
      <SiteHeader />
    </header>
    <main transition:animate="slide">
      <slot />
    </main>
    <SiteFooter />
  </body>
</html>
```

### Failure mode
Nav state (active link, open dropdown) resets on page transition. Fix: nav lives outside the transition container, or uses `transition:persist` in Astro. In SPA patterns, update active state inside the `startViewTransition` callback.

## Route loading choreography

Use to give users feedback during data-fetching route transitions. Three patterns: progress bar, skeleton screen, and curtain wipe.

### Progress bar (NProgress style)

```html
<div class="route-progress" aria-hidden="true">
  <div class="route-progress__bar"></div>
</div>
```

```css
.route-progress {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  z-index: 9999;
  pointer-events: none;
}

.route-progress__bar {
  height: 100%;
  width: 0%;
  background: var(--progress-color, #2563eb);
  box-shadow: 0 0 8px var(--progress-color, #2563eb);
  transition: width 300ms ease;
}

.route-progress[data-state="loading"] .route-progress__bar {
  /* Trickle: fast to 80%, then slow */
  animation: progress-trickle 8s cubic-bezier(0.1, 0.7, 0.1, 1) forwards;
}

.route-progress[data-state="complete"] .route-progress__bar {
  width: 100%;
  transition: width 150ms ease;
}

.route-progress[data-state="complete"] {
  opacity: 0;
  transition: opacity 300ms ease 200ms;
}

@keyframes progress-trickle {
  0% { width: 0%; }
  10% { width: 30%; }
  50% { width: 60%; }
  80% { width: 80%; }
  100% { width: 85%; }
}
```

```js
class RouteProgress {
  constructor() {
    this.el = document.querySelector('.route-progress');
    this.bar = this.el.querySelector('.route-progress__bar');
  }

  start() {
    this.el.dataset.state = 'loading';
    this.bar.style.width = '';
  }

  done() {
    this.el.dataset.state = 'complete';
    setTimeout(() => {
      this.el.dataset.state = 'idle';
      this.bar.style.width = '0%';
    }, 500);
  }
}

const progress = new RouteProgress();

// Wire to navigation
document.querySelectorAll('a[href^="/"]').forEach(link => {
  link.addEventListener('click', () => progress.start());
});
window.addEventListener('load', () => progress.done());
```

### Failure mode
Progress bar sits at 85% for 10+ seconds on slow loads. Fix: add a fallback that shows a "Still loading..." text after 5 seconds, or increment the bar by 1% every 500ms after the trickle stalls.

## Site preloaders

Use to mask initial asset loading (fonts, hero images, critical JS). The preloader should complete in under 3 seconds on a fast connection.

### Key numbers
- Max acceptable duration: 3s (2s asset load + 1s exit animation)
- Exit animation: 500-600ms (curtain wipe, fade, or split reveal)
- Font: use `document.fonts.ready` as one of the completion signals
- Always include a fallback timeout that kills the preloader after 5s regardless of load state

### Complete implementation: counter + curtain wipe

```html
<div id="preloader" class="preloader" aria-live="polite" aria-label="Loading">
  <div class="preloader__counter">0</div>
  <div class="preloader__bar"></div>
</div>
```

```css
.preloader {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: var(--preloader-bg, #0a0a0a);
  color: var(--preloader-text, #fafafa);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: clip-path 600ms cubic-bezier(0.65, 0, 0.35, 1);
  clip-path: inset(0 0 0 0);
}

.preloader[data-done="true"] {
  clip-path: inset(0 0 100% 0);
}

.preloader__counter {
  font-size: clamp(3rem, 8vw, 6rem);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.preloader__bar {
  width: 120px;
  height: 2px;
  background: rgba(255, 255, 255, 0.2);
  margin-top: 1.5rem;
  border-radius: 1px;
  overflow: hidden;
  position: relative;
}

.preloader__bar::after {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: 0%;
  background: var(--preloader-text, #fafafa);
  transition: width 100ms linear;
}
```

```js
class Preloader {
  constructor() {
    this.el = document.getElementById('preloader');
    this.counter = this.el.querySelector('.preloader__counter');
    this.bar = this.el.querySelector('.preloader__bar');
    this.progress = 0;
    this.targetProgress = 0;
    this.assets = [];
    this.raf = null;

    this.collectAssets();
    this.loadAssets();
    this.animate();

    // Failsafe: always dismiss after 5s
    setTimeout(() => this.complete(), 5000);
  }

  collectAssets() {
    // Collect images in the above-fold area
    document.querySelectorAll('img[src]').forEach(img => {
      if (!img.complete) this.assets.push(img);
    });
  }

  loadAssets() {
    if (this.assets.length === 0) {
      // Only wait for fonts
      document.fonts.ready.then(() => {
        this.targetProgress = 100;
      });
      return;
    }

    let loaded = 0;
    const total = this.assets.length + 1; // +1 for fonts

    this.assets.forEach(img => {
      const onLoad = () => {
        loaded++;
        this.targetProgress = Math.round((loaded / total) * 100);
      };
      img.addEventListener('load', onLoad, { once: true });
      img.addEventListener('error', onLoad, { once: true });
    });

    document.fonts.ready.then(() => {
      loaded++;
      this.targetProgress = Math.round((loaded / total) * 100);
    });
  }

  animate() {
    this.raf = requestAnimationFrame(() => {
      // Lerp toward target
      this.progress += (this.targetProgress - this.progress) * 0.1;

      if (this.targetProgress - this.progress < 0.5) {
        this.progress = this.targetProgress;
      }

      const display = Math.round(this.progress);
      this.counter.textContent = display;
      this.bar.style.setProperty('--progress', `${display}%`);
      this.el.querySelector('.preloader__bar').style.cssText =
        `--progress: ${display}%`;

      // Update bar fill via pseudo-element
      const after = this.bar.querySelector('::after') || this.bar;
      this.bar.style.setProperty('width', `${display}%`);

      if (display >= 100) {
        this.complete();
        return;
      }

      this.animate();
    });
  }

  complete() {
    cancelAnimationFrame(this.raf);
    this.counter.textContent = '100';
    this.el.dataset.done = 'true';

    this.el.addEventListener('transitionend', () => {
      this.el.remove();
      document.body.style.overflow = '';
    }, { once: true });
  }
}

// Block scroll during preloader
document.body.style.overflow = 'hidden';
new Preloader();
```

### Failure mode
Preloader counter jumps from 0 to 100 instantly because all assets are cached. Fix: add a minimum display duration of 800ms (lerp ensures the counter always counts up visually even if assets load instantly).

## Scroll restoration

Scroll restoration is the hardest invisible problem in SPAs. The browser's built-in `history.scrollRestoration` fights custom page transitions.

### Rules
1. Set `history.scrollRestoration = 'manual'` at app init if you handle transitions.
2. On forward navigation: scroll to 0 after the enter animation completes.
3. On back/forward (popstate): restore the saved scroll position after the enter animation.
4. On anchor links: smooth scroll to the target, do not trigger a page transition.

### Complete implementation

```js
class ScrollRestorer {
  constructor() {
    this.positions = new Map(); // url -> scrollY
    history.scrollRestoration = 'manual';

    // Save position before navigation
    window.addEventListener('beforeunload', () => this.save());

    // Save on every scroll (debounced)
    let scrollTimer;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => this.save(), 100);
    }, { passive: true });

    // Restore on popstate
    window.addEventListener('popstate', () => {
      // Wait for transition to finish, then restore
      // This timeout should match your page transition duration
      setTimeout(() => this.restore(), 400);
    });
  }

  save() {
    this.positions.set(location.href, window.scrollY);
    // Also save in sessionStorage for hard reloads
    try {
      sessionStorage.setItem('scroll:' + location.href, window.scrollY.toString());
    } catch (e) { /* quota exceeded, ignore */ }
  }

  restore() {
    const saved = this.positions.get(location.href)
      ?? parseInt(sessionStorage.getItem('scroll:' + location.href) || '0');
    window.scrollTo({ top: saved, behavior: 'instant' });
  }

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
}

const scrollRestorer = new ScrollRestorer();
```

### Integration with page transitions
```js
// After forward navigation transition completes:
async function navigateTo(url) {
  scrollRestorer.save();
  const html = await fetchPage(url);

  if (document.startViewTransition) {
    const transition = document.startViewTransition(() => {
      swapContent(html);
      history.pushState(null, '', url);
    });
    await transition.finished;
  } else {
    swapContent(html);
    history.pushState(null, '', url);
  }

  scrollRestorer.scrollToTop();
}
```

### Failure mode
User clicks back and lands at the top of the page instead of their previous scroll position. Fix: save scroll position on every debounced scroll event (not just on navigation), and restore after the transition animation completes, not before.


## Keyboard and screen-reader navigation model

Every nav component must be usable without a mouse and comprehensible to screen readers. This section defines the complete keyboard contract.

### Skip link
Must be the first focusable element on the page:

```html
<a href="#main-content" class="skip-link">Skip to main content</a>
<!-- ... header, nav ... -->
<main id="main-content" tabindex="-1">
```

```css
.skip-link {
  position: absolute;
  left: -9999px;
  top: 0;
  z-index: 9999;
  padding: 0.75rem 1.5rem;
  background: var(--skip-bg, #111);
  color: var(--skip-text, #fff);
  font-size: 0.875rem;
  font-weight: 500;
  text-decoration: none;
}

.skip-link:focus {
  left: 0;
}
```

### Keyboard contracts by component

| Component | Key | Action |
|---|---|---|
| **Menubar (horizontal)** | `ArrowRight/Left` | Move between top-level items |
| | `ArrowDown/Enter/Space` | Open submenu, focus first item |
| | `Escape` | Close submenu, return to trigger |
| **Mega menu panel** | `ArrowDown/Up` | Move between links in column |
| | `ArrowRight/Left` | Move between columns |
| | `Tab` | Move to next focusable (wraps within panel) |
| | `Escape` | Close panel, return to trigger |
| **Fullscreen overlay** | `Tab/Shift+Tab` | Cycle through links (trapped) |
| | `Escape` | Close overlay |
| **Mobile drawer** | `Tab/Shift+Tab` | Cycle through links (trapped) |
| | `Escape` | Close drawer |
| **Accordion nav** | `Enter/Space` | Toggle section |
| | `ArrowDown/Up` | Move between toggles |
| **Tabs** | `ArrowRight/Left` | Move between tabs |
| | `Home/End` | First/last tab |
| | `Enter/Space` | Activate tab (if manual activation) |
| **Command palette** | `ArrowDown/Up` | Move through results |
| | `Enter` | Execute selected command |
| | `Escape` | Close palette |
| **Sidebar** | `ArrowDown/Up` | Move between links |
| | `Enter/Space` | Toggle collapsible group |
| | `ArrowRight` | Expand collapsed group |
| | `ArrowLeft` | Collapse expanded group |

### ARIA roles and properties summary

| Component | Role | Key attributes |
|---|---|---|
| Top nav | `navigation` | `aria-label="Main"` |
| Menubar | `menubar` | Items: `role="menuitem"` |
| Menu panel | `menu` | `aria-labelledby` the trigger |
| Tab list | `tablist` | Tabs: `role="tab"`, `aria-selected` |
| Tab panel | `tabpanel` | `aria-labelledby` the tab |
| Sidebar nav | `navigation` | `aria-label="App"` |
| Tree (collapsible) | `tree` | Items: `role="treeitem"`, `aria-expanded` |
| Overlay/drawer | `dialog` | `aria-modal="true"`, `aria-label` |
| Command palette | `dialog` + `combobox` | Input: `role="combobox"`, `aria-autocomplete="list"` |
| Breadcrumb | `navigation` | `aria-label="Breadcrumb"`, current: `aria-current="page"` |
| Search | `search` | Input: `aria-label`, results: `role="listbox"` |
| Skip link | implicit `link` | Must be first focusable element |

### Screen reader announcements
Use `aria-live="polite"` to announce dynamic state changes:
- Route changes: update `<title>` and focus the `<main>` or `<h1>` after transition
- Search results: announce result count ("3 results found")
- Loading states: "Loading page" / "Page loaded"

```js
// Announce route change to screen readers
function announceRoute(title) {
  document.title = title;
  const main = document.querySelector('main');
  main.setAttribute('tabindex', '-1');
  main.focus();
  // Remove tabindex after focus to prevent outline on click
  main.addEventListener('blur', () => main.removeAttribute('tabindex'), { once: true });
}
```

## Composition

How the sub-topics combine into a complete site navigation system.

### Assembly order
1. **Skip link** -- first in DOM, always
2. **Sticky header** with:
   - Logo (left)
   - Mega menu or flat nav (center/left)
   - Search trigger (right)
   - CTA button (far right)
   - Mobile menu toggle (right, visible below breakpoint)
3. **Fullscreen overlay** or **drawer** for mobile nav (hidden by default)
4. **Command palette** (hidden, triggered by Cmd+K)
5. **Search overlay** (hidden, triggered by search icon or `/` key)
6. **Sidebar** (docs/dashboard layouts only, replaces or supplements header nav)
7. **Breadcrumbs** (below header, above content)
8. **Scrollspy nav** (sticky sidebar on long single-page content)
9. **Tab interface** (within content area)
10. **Footer** (last content element)

### Conflicts to watch
- **Sticky header + scrollspy sidebar**: both are sticky. Give the sidebar `top: calc(var(--header-height) + 1rem)` so it sits below the header.
- **Fullscreen overlay + sticky header**: the header's z-index (100) is below the overlay (400). Header should either be hidden behind the overlay or be part of it (overlay replaces the hamburger icon with a close button at the same position).
- **Command palette + search overlay**: they serve different purposes but look similar. The palette searches commands/actions; search searches content. Do not combine them into one. Use Cmd+K for palette, `/` or search icon for content search.
- **Drawer + sidebar**: on desktop, use the sidebar. Below 1024px, swap the sidebar to a drawer. Do not show both.
- **Page transitions + preloader**: the preloader runs once on initial load. Page transitions run on every subsequent navigation. They should not overlap.
- **Scroll restoration + smooth scroll**: `scrollTo` with `behavior: 'instant'` for restoration (never smooth, or the user sees a scroll animation every time they hit back). Use `behavior: 'smooth'` only for anchor link clicks.

### Assembled example: marketing site
```html
<body>
  <a href="#main" class="skip-link">Skip to main content</a>

  <div class="header-sentinel" aria-hidden="true"></div>
  <header class="site-header" data-scrolled="false" data-hidden="false">
    <div class="site-header__inner">
      <a href="/" class="logo">Acme</a>
      <nav class="mega-nav" aria-label="Main">
        <!-- mega menu items -->
      </nav>
      <div class="site-header__actions">
        <button class="search-trigger" aria-label="Search">Search</button>
        <a href="/signup" class="cta-button">Get started</a>
        <button class="menu-toggle" aria-label="Menu" aria-expanded="false"
                aria-controls="mobile-drawer">
          <span class="hamburger-icon" aria-hidden="true"></span>
        </button>
      </div>
    </div>
  </header>

  <aside id="mobile-drawer" class="drawer" role="dialog" aria-modal="true" inert>
    <!-- mobile nav with accordion sub-menus -->
  </aside>

  <div id="command-palette" class="palette" role="dialog" aria-modal="true" inert>
    <!-- palette content -->
  </div>

  <main id="main" tabindex="-1">
    <nav aria-label="Breadcrumb" class="breadcrumb">
      <!-- breadcrumb items -->
    </nav>
    <!-- page content -->
  </main>

  <footer class="site-footer" role="contentinfo">
    <!-- footer columns -->
  </footer>
</body>
```

## Performance budget

| Metric | Target |
|---|---|
| Nav component JS (all nav features combined) | < 15 KB gzipped |
| CSS for nav components | < 5 KB gzipped |
| Time to interactive for nav | < 100ms after DOMContentLoaded |
| Header paint (LCP contribution) | Must not be LCP element |
| Layout shift from header/nav | CLS contribution < 0.01 |
| Mega menu panel render | < 16ms (one frame) |
| Command palette open to interactive | < 50ms |

### What to cut first
1. Hover-intent diagonal tracking (use simple delay instead)
2. Preloader counter animation (use a simple bar)
3. Staggered menu item animation (show all items at once)
4. Backdrop blur on mobile (expensive on low-end devices)
5. Smooth scroll library (use `scroll-behavior: smooth` in CSS)

### Lazy-load strategies
- Mega menu panel content: render on first hover, not on page load
- Command palette: load the cmdk library or fuzzy search index on first Cmd+K press
- Search overlay: fetch search index on first search trigger
- Preloader: inline the CSS, do not load from external sheet

## Accessibility

### Required for every nav component
1. All interactive elements have accessible names (visible text, `aria-label`, or `aria-labelledby`)
2. Focus order matches visual order
3. Color contrast ratio: 4.5:1 for text, 3:1 for large text and UI components
4. Touch targets: 44x44px minimum
5. `prefers-reduced-motion`: all transitions reduce to instant or near-instant
6. Screen reader announcements for route changes and dynamic content updates
7. No keyboard traps outside of intentionally modal surfaces

### Testing checklist
- Tab through the entire page. Every interactive element must be reachable.
- Use VoiceOver/NVDA to navigate. Every link and button must be announced with its purpose.
- Set `prefers-reduced-motion: reduce` in system settings. No motion should be visible.
- Zoom to 200%. Nav must remain usable (no overflow, no clipping).
- Test with browser's built-in accessibility inspector for ARIA violations.

## Anti-slop rules

1. DO NOT use `z-index: 99999`. Use the z-index scale defined in shared foundations.
2. DO NOT animate `height: auto`. Animate `max-height`, `clip-path`, or use the CSS `interpolate-size` property.
3. DO NOT use `position: fixed` for headers when `position: sticky` works. Fixed headers need manual spacer elements; sticky does not.
4. DO NOT put `overflow: hidden` on `<body>` to prevent scroll behind modals without restoring it on close. Always pair with cleanup.
5. DO NOT use `outline: none` without `:focus-visible` fallback. Never remove focus indicators entirely.
6. DO NOT use hover-only interactions without a touch/click fallback. Mega menus must open on click for touch devices.
7. DO NOT nest dropdowns inside mega menu panels. One level of panels is the maximum.
8. DO NOT auto-close mobile nav on resize (desktop breakpoint). Users who rotate their phone lose their place.
9. DO NOT use `transform: translateX(-9999px)` for screen-reader-only content. Use the `.sr-only` clip pattern.
10. DO NOT exceed 3 seconds for a site preloader on a fast connection. Add a failsafe timeout.
11. DO NOT use `scroll-behavior: smooth` globally in CSS if you have custom scroll restoration. They fight.
12. DO NOT rely on `window.onscroll` for sticky header logic when IntersectionObserver is available. IO is cheaper and fires once per threshold crossing instead of 60x/sec.
13. DO NOT stagger more than 8 menu items. Stagger delay > 320ms (8 * 40ms) feels sluggish.
14. DO NOT use a hamburger menu on desktop for sites with fewer than 7 nav items. Show the links.
15. DO NOT animate the underline indicator width. Measure the active tab's rect and set width directly; animate only `left` and `width` as a pair.
16. DO NOT fetch and parse the command palette's search index on page load. Lazy-load on first open.
17. DO NOT use `<div>` for clickable nav items. Use `<a>` for navigation, `<button>` for actions.
18. DO NOT place breadcrumbs inside the sticky header. They belong below it, in the content flow.
19. DO NOT use `pointer-events: none` on the backdrop/scrim as a lazy way to prevent interaction. Remove the element or use `inert`.
20. DO NOT open mobile drawers to the right if the navigation reads left-to-right. Left drawer for nav, right drawer for filters/settings.

## Ship checklist

- [ ] Skip link is the first focusable element and visually hidden until focused
- [ ] Header is `position: sticky`, not `position: fixed`, with no layout shift on shrink
- [ ] Mega menu opens with 150ms hover delay and 300ms leave delay
- [ ] Mega menu has keyboard navigation (arrows between items, escape to close)
- [ ] Mobile nav is a drawer or overlay, not a dropdown
- [ ] Mobile drawer dismisses on swipe with velocity detection
- [ ] Focus is trapped inside open overlays (menu, palette, search)
- [ ] Focus returns to trigger on overlay close
- [ ] `inert` is set on closed overlays to prevent screen reader access
- [ ] `aria-expanded` toggles on all menu triggers
- [ ] Command palette opens on Cmd+K / Ctrl+K
- [ ] Command palette fuzzy search drops results below 0.3 score
- [ ] Breadcrumbs use `aria-current="page"` on current item (not a link)
- [ ] Breadcrumbs include JSON-LD structured data
- [ ] Tab indicator slides between tabs (not teleporting)
- [ ] Tabs use `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected`
- [ ] Scrollspy highlights update based on IntersectionObserver, not scroll position math
- [ ] Footer uses semantic `<footer>` with `role="contentinfo"`
- [ ] Page transitions use View Transitions API with fallback for unsupported browsers
- [ ] Scroll position saves on every navigation, restores on back/forward
- [ ] `prefers-reduced-motion: reduce` disables all nav animations
- [ ] Touch targets are 44x44px minimum
- [ ] Color contrast meets WCAG 2.1 AA (4.5:1 text, 3:1 UI)
- [ ] Nav JS total < 15 KB gzipped
- [ ] No CLS from header/nav elements
- [ ] Preloader has a 5-second failsafe timeout
- [ ] All nav links use `<a>`, all toggle actions use `<button>`
- [ ] Mobile nav tested on iOS Safari and Chrome Android
- [ ] VoiceOver/NVDA tested: all nav items announced with purpose
- [ ] Keyboard-only navigation: every interactive element reachable, no traps

