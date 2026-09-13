---
name: nav-and-page-transitions-toolkit-eval
description: Use when verifying that nav-and-page-transitions-toolkit was actually implemented correctly. Adversarial audit, not a summary.
pairs_with: nav-and-page-transitions-toolkit
---

# Eval: Navigation and Page Architecture

## What this audits
The most common shipped failure is a nav system that looks fine on a desktop demo but breaks in three hidden ways: (1) keyboard users cannot reach or operate menu panels, drawers, or command palettes because focus is never trapped and `aria-expanded` is never toggled; (2) mobile drawers lack gesture dismissal and feel like a web page, not an app; (3) page transitions work on click but scroll restoration on back/forward is absent, so users lose their place. A secondary failure mode is nav JS exceeding 30 KB because the command palette search index loads eagerly on page load.

## Evidence required
- The built site or app, opened in Chrome and Safari (mobile viewport 375px + desktop 1440px)
- DevTools Accessibility panel screenshot showing the nav tree for header, drawer, and command palette
- DevTools Performance recording of: opening mega menu, opening command palette, navigating between two pages
- Network panel filtered to JS, showing nav-related bundle sizes
- Console output (zero errors, zero ARIA warnings)
- Keyboard-only walkthrough recording or step log (Tab through entire page, operate every nav surface)
- VoiceOver transcript of: opening mobile drawer, navigating tabs, using command palette
- `prefers-reduced-motion: reduce` emulated, full page interaction recording
- Mobile device or emulator: swipe-dismiss the drawer, verify velocity threshold

## Automated checks

### Static source checks
```bash
# Skip link exists and is first focusable
grep -n 'skip.*main\|skip.*content' index.html | head -1
# PASS: line number < 10   FAIL: absent or after other focusable elements

# inert attribute used on closed overlays
grep -c 'inert' index.html
# PASS: >= 1 per overlay (drawer, palette, search)   FAIL: 0

# aria-expanded on menu triggers
grep -c 'aria-expanded' index.html
# PASS: >= 1 per expandable trigger   FAIL: 0

# aria-modal on overlays
grep -c 'aria-modal="true"' index.html
# PASS: >= 1 per modal overlay   FAIL: 0

# No outline:none without focus-visible
grep -c 'outline.*none' styles.css | xargs -I{} echo "raw outline:none count: {}"
grep -c 'focus-visible' styles.css | xargs -I{} echo "focus-visible count: {}"
# PASS: focus-visible count >= outline:none count   FAIL: outline:none > 0 with no focus-visible

# prefers-reduced-motion rule exists
grep -c 'prefers-reduced-motion' styles.css
# PASS: >= 1   FAIL: 0

# No z-index above 10000 (except skip link)
grep -oP 'z-index:\s*\K\d+' styles.css | sort -n | tail -5
# PASS: highest <= 10000   FAIL: arbitrary large values

# Breadcrumb JSON-LD exists
grep -c 'BreadcrumbList' index.html
# PASS: >= 1   FAIL: 0

# history.scrollRestoration = 'manual' set
grep -c "scrollRestoration.*manual" main.js
# PASS: >= 1 (if SPA)   FAIL: 0

# Touch target minimum
grep -oP 'min-height:\s*\K[0-9]+' styles.css | sort -n | head -5
# PASS: all interactive elements >= 44px   FAIL: < 44
```

### Runtime checks
```js
// Focus trap test: open overlay, tab to end, verify focus wraps
await page.click('[aria-controls="overlay-menu"]');
await page.keyboard.press('Tab');
// Record focused element after each Tab
const focusedElements = [];
for (let i = 0; i < 20; i++) {
  await page.keyboard.press('Tab');
  const tag = await page.evaluate(() => document.activeElement?.tagName + '#' + document.activeElement?.id);
  focusedElements.push(tag);
}
// PASS: focus stays within overlay (no body elements appear)
// FAIL: focus escapes to elements behind overlay

// Mega menu hover intent
const trigger = await page.$('.mega-nav__trigger');
await trigger.hover();
const panelBefore = await page.$eval('.mega-nav__panel', el => getComputedStyle(el).visibility);
// PASS: panelBefore === 'hidden' (delay not elapsed)  FAIL: visible immediately

await page.waitForTimeout(200);
const panelAfter = await page.$eval('.mega-nav__panel', el => getComputedStyle(el).visibility);
// PASS: panelAfter === 'visible'  FAIL: still hidden

// Command palette keyboard nav
await page.keyboard.press('Meta+k');
const paletteVisible = await page.$eval('#palette', el => getComputedStyle(el).visibility);
// PASS: 'visible'  FAIL: 'hidden'

await page.keyboard.press('ArrowDown');
const selected = await page.$eval('[data-selected="true"]', el => el.textContent);
// PASS: second item selected  FAIL: no item or first item still selected

await page.keyboard.press('Escape');
const paletteClosed = await page.$eval('#palette', el => getComputedStyle(el).visibility);
// PASS: 'hidden'  FAIL: still visible

// Scroll restoration
await page.click('a[href="/about"]');
await page.waitForTimeout(500);
await page.evaluate(() => window.scrollTo(0, 500));
await page.waitForTimeout(200);
await page.goBack();
await page.waitForTimeout(500);
const scrollY = await page.evaluate(() => window.scrollY);
// PASS: scrollY close to previous position on home page  FAIL: scrollY === 0

// Reduced motion
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
const headerTransition = await page.$eval('.site-header', el => getComputedStyle(el).transitionDuration);
// PASS: '0.01ms' or '0s'  FAIL: any positive duration

// Nav JS size
const navEntries = await page.evaluate(() => {
  return performance.getEntriesByType('resource')
    .filter(e => e.name.includes('nav') || e.name.includes('menu') || e.name.includes('palette'))
    .map(e => ({ name: e.name, size: e.transferSize }));
});
const totalNavKB = navEntries.reduce((s, e) => s + e.size, 0) / 1024;
// PASS: < 15 KB  FAIL: >= 15 KB

// CLS from header
const cls = await page.evaluate(async () => {
  return new Promise(resolve => {
    let total = 0;
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) total += entry.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
    setTimeout(() => resolve(total), 2000);
  });
});
// PASS: cls < 0.01  FAIL: >= 0.01
```

## Manual inspection protocol

1. Resize browser from 1440px to 375px. FAIL if nav items overflow or clip at any breakpoint.
2. Open mobile drawer, swipe left. FAIL if drawer does not dismiss with velocity < 0.5px/ms swipe.
3. Open mega menu, move cursor diagonally from trigger toward panel. FAIL if panel closes during diagonal travel.
4. Tab through entire page with keyboard only. FAIL if any nav interactive element is unreachable or focus order is illogical.
5. Open command palette, type 3 characters of a known command. FAIL if the correct result does not appear in top 3.
6. Navigate to a page, scroll down 500px, click back. FAIL if scroll position is not restored to ~500px.
7. Open fullscreen overlay on mobile, rotate device. FAIL if overlay layout breaks or content becomes unreachable.
8. Check preloader on hard reload (Cmd+Shift+R). FAIL if preloader takes > 3s on a fast connection or counter jumps from 0 to 100 instantly.
9. Enable VoiceOver, navigate the entire header. FAIL if any menu trigger does not announce its expanded/collapsed state.
10. Set `prefers-reduced-motion: reduce`. Open and close every nav surface. FAIL if any visible animation plays.

## Scoring rubric

| # | Criterion | Weight | 0 | 1 | 2 |
|---|---|---|---|---|---|
| 1 | Focus trapping on overlays | 15 | Focus escapes overlay | Partial trap (wraps but Escape does not work) | Full trap with Escape return to trigger |
| 2 | Keyboard menubar navigation | 10 | Arrow keys do nothing | Arrows work but no submenu keyboard access | Full arrow/Escape/Enter contract |
| 3 | Mobile drawer gesture dismissal | 10 | No gesture support | Swipe works but no velocity detection | Swipe with velocity threshold + snap-back |
| 4 | Sticky header scroll behavior | 10 | Layout shift on shrink or fixed positioning | Sticky + shrink but no direction hide | Sticky + shrink + direction hide, no CLS |
| 5 | Command palette fuzzy search | 10 | No fuzzy matching or Cmd+K does not work | Cmd+K opens but search is substring only | Fuzzy with score threshold + keyboard nav |
| 6 | Scroll restoration | 10 | No restoration (always scrolls to top) | Forward nav restores but back does not | Forward + back/forward both restore correctly |
| 7 | ARIA attributes complete | 10 | Missing aria-expanded and aria-modal | Some attributes present | All required ARIA per component |
| 8 | Reduced motion | 10 | No prefers-reduced-motion rule | Rule exists but some animations still play | All animations disabled under reduced motion |
| 9 | Page transition integration | 5 | Hard page cuts (no transition) | Cross-fade but nav state resets | Smooth transition + nav persistence + fallback |
| 10 | Nav bundle size | 5 | > 30 KB gzipped | 15-30 KB | < 15 KB |
| 11 | Breadcrumb structured data | 3 | No breadcrumbs or no JSON-LD | Breadcrumbs present but no structured data | Breadcrumbs + valid JSON-LD |
| 12 | Touch targets | 2 | Multiple targets < 44px | Most targets >= 44px | All interactive targets >= 44px |

**Total: 100 points. Ship threshold: 75.**

## Common false passes

1. **Focus appears trapped but is not.** Tabbing through a drawer stays inside it because the drawer only has 4 links and the user stopped pressing Tab. Open a drawer with many items and Tab 30+ times to verify the trap wraps at the last element.
2. **Mega menu panel appears on hover but is a `display: none` toggle, not a transition.** It functions but looks janky. Check that `opacity` and `transform` transitions exist with durations > 0.
3. **Keyboard navigation "works" but only because links are in DOM order.** Arrow keys actually do nothing; the user is just pressing Tab. Test explicitly by pressing ArrowRight on a menubar item and checking that focus moves to the next item (not the next focusable in DOM order).
4. **Preloader shows 100% but the page behind it is still not interactive.** The preloader's counter reached 100 on a timer, but fonts and images are still loading. Check that `document.fonts.ready` and image `load` events are wired, not just a `setTimeout`.
5. **Scroll restoration "works" because the page is short enough to not scroll.** Test on a page with 3000px+ of content, scroll to 2000px, navigate away, and come back.
6. **Reduced motion "works" but only for CSS animations, not JS-driven transitions.** GSAP or Framer Motion animations bypass the CSS media query. Check JS-driven animations too.
7. **Mobile drawer gesture works in Chrome DevTools emulator but not on real iOS Safari.** Touch event handling differs. Test on a real device.

## Required fixes by failure mode

| Failure | Root cause | Fix |
|---|---|---|
| Focus escapes overlay | No focus trap implemented | Add keydown listener on overlay, wrap Tab at boundaries, Escape closes |
| Mega menu flickers on hover | No hover intent delay, or enter/leave timers not cleared | Clear both timers on every mouseenter/mouseleave, use 150ms enter + 300ms leave |
| Drawer does not dismiss on swipe | No touch event handlers on drawer | Add touchstart/touchmove/touchend with velocity calc (dx/dt > 0.5px/ms = close) |
| Content jumps on header shrink | Header switches between static and fixed/sticky | Use `position: sticky` always; control height with data-attribute + CSS transition |
| Back button scrolls to top | `history.scrollRestoration` not set to 'manual' | Set `history.scrollRestoration = 'manual'` and save/restore positions in a Map |
| Arrow keys do nothing in tabs | Only click handlers, no keydown | Add keydown listener for ArrowLeft/Right/Home/End per WAI-ARIA tabs pattern |
| Palette search returns everything | No score threshold | Add minimum score filter (0.3) and require all query chars present in order |
| CLS from header | Height change causes reflow | Use constant-height wrapper; only inner content changes height |
| Nav JS too large | Search index or transition library loaded eagerly | Lazy-load on first interaction (Cmd+K, hover, search trigger) |

## Verdict format

```
SCORE: [n]/100

| # | Criterion | Points | Notes |
|---|---|---|---|
| 1 | Focus trapping | 0/1/2 | ... |
...

BLOCKING ISSUES:
- [list any criterion scoring 0]

VERDICT: SHIP / NO SHIP
```
