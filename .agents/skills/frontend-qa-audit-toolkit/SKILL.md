---
name: frontend-qa-audit-toolkit
description: Use when auditing a frontend build before ship - AI-slop detection, design critique, WCAG accessibility, reduced motion, Core Web Vitals, animation jank, responsive matrix, cross-browser motion, visual diffing, performance budgets and Playwright verification.
category: qa
pairs_with: frontend-qa-audit-toolkit-eval
---

# Frontend QA and Audit Toolkit

## Scope

The pass that happens after it works and before it ships.

- Anti-AI-slop audit with root-cause fixes
- Design critique protocol with scoring bands
- WCAG accessibility audit, automated and manual
- Reduced motion compliance across a motion-heavy build
- Core Web Vitals as a UI concern: LCP, CLS, INP
- Animation jank profiling
- Responsive matrix testing
- Cross-browser motion differences
- Visual diff harness
- Performance budget enforcement in CI
- Font loading and layout stability
- Image and media optimisation
- Semantic HTML and SEO for designed pages
- Playwright verification including screenshots

## Decision matrix

| Symptom | Audit this first | Not this | Why |
|---|---|---|---|
| "It looks AI-generated" | Layout variance and content specificity | Color palette | Slop is structural: uniform components, symmetric grids, one animation everywhere |
| Janky scroll | What runs in the scroll handler | GPU acceleration hacks | Almost always layout reads or a non-passive listener, not a missing `translateZ` |
| Slow LCP | What the LCP element actually is | Bundle size | The LCP element is often a hero image or a webfont-blocked heading |
| Layout shift | Fonts and images without dimensions | Animations | Nearly all CLS comes from unsized media and font swap |
| Slow interactions | Long tasks on the main thread | Network | INP is a main-thread problem, measured after the click |
| Fails on a phone | CPU throttled profile at 4x | Viewport width | Mid-range Android is CPU-bound, not width-bound |
| Screen reader confusion | Heading order and landmarks | ARIA additions | Most a11y bugs are missing semantics, and added ARIA usually makes it worse |
| Motion sickness complaints | Parallax and large-surface movement | Duration values | Vestibular triggers are about the size and speed of moving areas |
| Regression appeared | Visual diff across theme matrix | Manual re-review | Humans do not reliably see a 4px shift |

## Shared foundations

**Audit in this order.** Each stage's findings change what the next stage should look at, and doing
them out of order wastes work.

```
1. Semantics and structure   (heading order, landmarks, form labels)
2. Accessibility             (keyboard, contrast, screen reader, reduced motion)
3. Performance               (LCP, CLS, INP, jank under throttle)
4. Responsive matrix         (widths, zoom, orientation)
5. Cross-browser             (Safari and Firefox motion differences)
6. Design critique           (hierarchy, rhythm, restraint)
7. Slop audit                (structural sameness, generic content)
8. Regression harness        (lock it so it stays fixed)
```

Fixing design before fixing semantics means redoing the design fix when the markup changes.

**Score against evidence, never against a description.** A build is not accessible because someone
says it is. Open the page, tab through it, run the checks, record the numbers.

**Throttle everything.** The machine that built the site is not the machine that will use it. Every
performance judgement is made at 4x CPU throttle and Slow 4G, not at desktop speed.

## Anti-AI-slop audit

Generated frontends share a recognisable signature. It is structural, not cosmetic, which is why
recolouring never fixes it.

**The tell list.** Score each present tell.

| # | Tell | Why it happens | Root-cause fix |
|---|---|---|---|
| 1 | Every section is a centered container with a centered heading and centered subtitle | Default safe layout | Vary alignment by section role; give at least a third of sections an asymmetric or offset layout |
| 2 | Three-column feature grid, three items, equal weight | The model's default cardinality | Let content decide count; break equal weight so the most important item is visually dominant |
| 3 | Uniform border radius on every element | One token applied everywhere | Differentiate radius by element scale: inputs and buttons small, cards medium, media large or square |
| 4 | Purple-to-blue or teal-to-indigo gradient | Default palette | Derive the palette from a real brand source; if there is none, pick a single hue with a neutral and commit |
| 5 | One fade-up animation on every element on every section | A single blanket reveal rule | Reduce to 3-5 meaning-bearing motion events per page; everything else appears instantly |
| 6 | Uniform card components repeated across unrelated sections | Component reuse without differentiation | Where the content differs in kind, the treatment must differ; rebuild one with a genuinely different structure |
| 7 | Generic emoji or single-weight icons as feature markers | Placeholder never replaced | Real icon set on a consistent grid, or no icons |
| 8 | Copy that describes categories rather than specifics ("powerful features", "seamless workflow") | Content written to fill a slot | Replace with the specific claim, or delete the block |
| 9 | Perfect vertical rhythm with identical section padding throughout | One spacing token | Vary section padding by importance; the page should have a density rhythm |
| 10 | Stat blocks with round, unsourced numbers | Invented proof | Use real numbers with sources, or remove the section entirely |
| 11 | Default shadow on everything that is a card | One elevation value | Elevation should be a scale used sparingly; most cards need a border, not a shadow |
| 12 | Testimonials with generic names and no company, role or photo | Placeholder content | Real attributed quotes or no testimonial section |
| 13 | Hero with headline, subhead, two buttons, centered | Template default | Decide what the hero must accomplish and design to that; two buttons of equal weight is usually one too many |
| 14 | Every list has exactly three or exactly four items | Model cadence | Let the real count stand, including two or five |
| 15 | No empty space with intent; everything evenly distributed | Symmetry as a default | Deliberately unbalance one area; white space should be visibly a choice |

**Scoring.** 0-2 tells present: clean. 3-5: revise. 6+: the page reads as generated and needs
structural rework, not polish.

**The single most effective test.** Screenshot the page, scale it to 25% and look at the shapes
only. If every section reduces to the same rectangle arrangement, the page has no structural
rhythm regardless of how good the details are.

```js
// Structural sameness detector: compares section layout signatures.
(() => {
  const sections = [...document.querySelectorAll("section, main > div, article")];
  const sig = (el) => {
    const kids = [...el.children];
    const cs = getComputedStyle(el);
    return JSON.stringify({
      display: cs.display,
      cols: cs.gridTemplateColumns.split(" ").length,
      align: cs.textAlign,
      kids: kids.length,
      kidTags: kids.map(k => k.tagName).join(","),
      padY: Math.round(parseFloat(cs.paddingTop)),
    });
  };
  const map = {};
  sections.forEach((s, i) => { const k = sig(s); (map[k] ??= []).push(i); });
  const dupes = Object.entries(map).filter(([, v]) => v.length > 1);
  console.log(`sections: ${sections.length}, distinct layouts: ${Object.keys(map).length}`);
  dupes.forEach(([k, v]) => console.log(`  repeated ${v.length}x at indices ${v}:`, JSON.parse(k)));
})();
// FLAG: distinct layouts under 50% of section count.
```

```js
// Animation uniformity detector: how many distinct motion treatments exist?
(() => {
  const anim = new Map();
  document.querySelectorAll("*").forEach(el => {
    const cs = getComputedStyle(el);
    const key = [cs.animationName, cs.transitionProperty, cs.transitionDuration].join("|");
    if (key !== "none|all|0s" && cs.animationName !== "none") {
      anim.set(key, (anim.get(key) ?? 0) + 1);
    }
  });
  console.table([...anim.entries()].map(([k, n]) => ({ treatment: k, count: n })));
})();
// FLAG: one treatment applied to 20+ elements means a blanket reveal rule, not choreography.
```

## Design critique protocol

Look in this order. Looking at colour first is how critiques become taste arguments.

1. **Hierarchy.** Squint until text is unreadable. Can you still tell what is most important? If
   three things compete, there is no hierarchy.
2. **Contrast.** Not just colour contrast: size contrast, weight contrast, density contrast. A page
   where everything is medium is a page with no emphasis.
3. **Rhythm.** Are spacing values from a scale? Is section density varied by importance?
4. **Alignment.** Is there a grid, and does everything sit on it? Off-grid elements should be
   deliberate and few.
5. **Density.** Is information packed where the user is scanning and open where they are deciding?
6. **Motion purpose.** For each animation, name what it communicates. Any that communicates nothing
   gets cut.
7. **Copy.** Would this sentence survive on a competitor's page unchanged? If yes, it is generic.

**Scoring bands per dimension:**

| Band | Meaning |
|---|---|
| 0 | Absent or actively harmful |
| 1 | Present but inconsistent |
| 2 | Systematic and intentional |

A critique is actionable when every score below 2 comes with the specific element and the specific
change. "The hierarchy is weak" is not a critique. "The section heading and the card headings are
both 24px semibold, so the section reads as four peers rather than one group; drop card headings to
18px medium" is.

## Accessibility audit

Automated tooling catches roughly 30-40% of real issues. The manual pass is where the rest lives.

```bash
npm i -D @axe-core/playwright
```

```ts
// a11y.spec.ts - runs axe across every route and every theme.
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const routes = ["/", "/pricing", "/docs", "/app/dashboard"];
const themes = ["light", "dark"] as const;

for (const route of routes) {
  for (const theme of themes) {
    test(`a11y ${route} ${theme}`, async ({ page }) => {
      await page.goto(route);
      await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      // Report all violations, not just the first.
      if (results.violations.length) {
        console.log(results.violations.map(v =>
          `${v.impact}: ${v.id} (${v.nodes.length}) - ${v.help}\n  ${v.nodes[0]?.html?.slice(0,120)}`
        ).join("\n"));
      }
      expect(results.violations).toEqual([]);
    });
  }
}
```

```js
// Manual-check helpers. Paste into the console.

// A1: heading order. Skipped levels break screen reader navigation.
(() => {
  const hs = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")];
  let prev = 0, problems = [];
  hs.forEach(h => {
    const lvl = +h.tagName[1];
    if (prev && lvl > prev + 1) problems.push(`skip h${prev} -> h${lvl}: "${h.textContent.trim().slice(0,50)}"`);
    prev = lvl;
  });
  const h1s = hs.filter(h => h.tagName === "H1").length;
  console.log(`h1 count: ${h1s} (should be 1)`);
  console.log("heading skips:", problems.length ? problems : "none");
})();

// A2: landmarks present.
(() => {
  const need = ["header,[role=banner]", "nav,[role=navigation]", "main,[role=main]", "footer,[role=contentinfo]"];
  need.forEach(sel => console.log(sel, document.querySelector(sel) ? "ok" : "MISSING"));
  console.log("main count:", document.querySelectorAll("main,[role=main]").length, "(should be 1)");
})();

// A3: images without alt, and decorative images not marked.
(() => {
  const bad = [...document.images].filter(i => !i.hasAttribute("alt"));
  const suspicious = [...document.images].filter(i =>
    /^(image|img|photo|picture|icon|dsc|screenshot)[-_ ]?\d*(\.\w+)?$/i.test(i.alt.trim()));
  console.log("missing alt:", bad.length, bad);
  console.log("filename-like alt:", suspicious.length, suspicious.map(i => i.alt));
})();

// A4: form controls without accessible names.
(() => {
  const bad = [...document.querySelectorAll("input:not([type=hidden]),select,textarea")].filter(el => {
    if (el.getAttribute("aria-label")?.trim()) return false;
    const lb = el.getAttribute("aria-labelledby");
    if (lb && lb.split(/\s+/).some(id => document.getElementById(id))) return false;
    if (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)) return false;
    if (el.closest("label")) return false;
    return true;
  });
  console.log("controls with no accessible name:", bad.length, bad);
})();

// A5: buttons and links with no discernible text.
(() => {
  const bad = [...document.querySelectorAll("a,button")].filter(el =>
    !el.textContent.trim() && !el.getAttribute("aria-label")?.trim() &&
    !el.querySelector("img[alt]:not([alt=''])") && !el.getAttribute("title"));
  console.log("empty accessible name:", bad.length, bad);
})();

// A6: positive tabindex breaks natural order.
console.log("positive tabindex:", [...document.querySelectorAll("[tabindex]")]
  .filter(e => +e.getAttribute("tabindex") > 0));

// A7: text contrast sample across the page.
(() => {
  const lin = c => { c /= 255; return c <= 0.04045 ? c/12.92 : ((c+0.055)/1.055)**2.4; };
  const lum = ([r,g,b]) => 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b);
  const parse = s => (s.match(/[\d.]+/g) || [0,0,0]).slice(0,3).map(Number);
  const bgOf = el => { let n = el;
    while (n && n !== document.documentElement) {
      const b = getComputedStyle(n).backgroundColor;
      if (b && !/rgba\(0, 0, 0, 0\)|transparent/.test(b)) return b;
      n = n.parentElement;
    } return "rgb(255,255,255)"; };
  const out = [];
  document.querySelectorAll("p,li,span,a,h1,h2,h3,h4,button,label,td").forEach(el => {
    if (!el.textContent.trim() || el.children.length) return;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none") return;
    const size = parseFloat(cs.fontSize);
    const bold = +cs.fontWeight >= 700;
    const large = size >= 24 || (size >= 18.66 && bold);
    const [a,b] = [lum(parse(cs.color)), lum(parse(bgOf(el)))].sort((x,y)=>y-x);
    const ratio = (a+0.05)/(b+0.05);
    const min = large ? 3 : 4.5;
    if (ratio < min) out.push({ text: el.textContent.trim().slice(0,40),
      ratio: +ratio.toFixed(2), min, size: Math.round(size) });
  });
  console.table(out.slice(0, 40));
  console.log("contrast failures:", out.length);
})();
```

**Manual pass, in order.** No tool catches these.

1. Tab through the whole page. Every interactive element reachable, focus always visible, order
   matches visual order.
2. Open every dialog with the keyboard. Focus moves in, is trapped, Escape closes, focus returns
   to the trigger.
3. Navigate with a screen reader by headings, then by landmarks, then by links. Does the structure
   make sense with no visual?
4. Turn off CSS entirely. Is the content in a sensible order?
5. Zoom to 200% and to 400%. No horizontal scroll at 200%; content still usable at 400%.
6. Set browser font size to 24px. Does text scale?
7. Check every error message is associated with its field via `aria-describedby` and announced.
8. Check nothing is conveyed by colour alone.
9. Check video has captions and audio has a transcript.
10. Check every animation stops or reduces under `prefers-reduced-motion`.

## Reduced motion compliance

The most commonly faked compliance in frontend work: a CSS media block exists, and every JS-driven
effect ignores it entirely.

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 1ms !important;
    scroll-behavior: auto !important;
  }
}
```

That block is necessary and not sufficient. Every one of these must also be guarded in JavaScript:

- Scroll-driven animation libraries (GSAP ScrollTrigger, Lenis, Locomotive)
- Canvas and WebGL render loops with continuous motion
- Autoplaying video, including muted background video
- Carousels and marquees that advance on their own
- Parallax
- Custom cursors, magnetic elements, tilt
- Count-up numbers, text scrambles, typewriters
- Confetti, particle bursts, and any celebration effect

```js
// The guard every effect initialiser needs.
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

export function guardMotion(init, { fallback } = {}) {
  let cleanup = null;
  const apply = () => {
    cleanup?.(); cleanup = null;
    if (reduceMotion.matches) { fallback?.(); return; }
    cleanup = init() ?? null;
  };
  apply();
  // Users change this setting mid-session. Respond to it.
  reduceMotion.addEventListener("change", apply);
  return () => { cleanup?.(); reduceMotion.removeEventListener("change", apply); };
}

// Usage: the fallback must leave the content in its FINAL state, not its initial one.
guardMotion(
  () => initScrollReveal(),
  { fallback: () => document.querySelectorAll("[data-reveal]")
      .forEach(el => { el.style.opacity = "1"; el.style.transform = "none"; }) }
);
```

The failure that ships most often: reduced motion disables the reveal animation but leaves the
elements at `opacity: 0`, so the entire page is blank for anyone with the setting on. Always test
by actually enabling the OS setting, not by reading the code.

```js
// Reduced-motion audit: find elements left invisible under the reduced-motion path.
(() => {
  const hidden = [...document.querySelectorAll("body *")].filter(el => {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") return false;
    const r = el.getBoundingClientRect();
    return r.width > 40 && r.height > 20 && parseFloat(cs.opacity) < 0.1;
  });
  console.log("visible-sized elements at opacity < 0.1:", hidden.length, hidden.slice(0, 20));
})();
// Run with reduced motion emulated. PASS: 0. FAIL: content stuck invisible.
```

## Core Web Vitals

```js
// Field-accurate measurement in the console. Interact with the page while it runs.
(() => {
  new PerformanceObserver(l => {
    const e = l.getEntries().at(-1);
    console.log("LCP", Math.round(e.startTime), "ms |", e.element);
  }).observe({ type: "largest-contentful-paint", buffered: true });

  let cls = 0;
  new PerformanceObserver(l => {
    for (const e of l.getEntries()) {
      if (e.hadRecentInput) continue;
      cls += e.value;
      if (e.value > 0.01) console.log("CLS +", e.value.toFixed(4), e.sources?.map(s => s.node));
    }
    console.log("CLS total", cls.toFixed(4));
  }).observe({ type: "layout-shift", buffered: true });

  new PerformanceObserver(l => {
    for (const e of l.getEntries()) {
      if (e.duration > 40) console.log("slow interaction", Math.round(e.duration), "ms", e.name, e.target);
    }
  }).observe({ type: "event", durationThreshold: 40, buffered: true });

  new PerformanceObserver(l => {
    for (const e of l.getEntries()) if (e.duration > 50)
      console.log("long task", Math.round(e.duration), "ms", e.attribution?.[0]?.containerName ?? "");
  }).observe({ type: "longtask", buffered: true });
})();
```

| Metric | Good | Needs work | Common UI cause |
|---|---|---|---|
| LCP | under 2.5s | 2.5-4s | Hero image not preloaded, webfont blocking the heading, client-side rendered hero |
| CLS | under 0.1 | 0.1-0.25 | Images without width/height, font swap without metric matching, injected banners, late-loading embeds |
| INP | under 200ms | 200-500ms | Long tasks from hydration, heavy handlers, unbatched state updates |

Fixes that actually move these:

```html
<!-- LCP: preload the hero image and give it fetchpriority. -->
<link rel="preload" as="image" href="/hero.avif" type="image/avif" fetchpriority="high">
<img src="/hero.avif" width="1600" height="900" fetchpriority="high" decoding="async" alt="...">

<!-- LCP: preload the font that renders the LCP text. crossorigin is required. -->
<link rel="preload" as="font" type="font/woff2" href="/fonts/inter-var.woff2" crossorigin>
```

```css
/* CLS: reserve aspect ratio for every media element. */
img, video, iframe { max-width: 100%; height: auto; }
.media-16x9 { aspect-ratio: 16 / 9; }

/* CLS: metric-matched fallback so font swap does not reflow. */
@font-face {
  font-family: "Inter Fallback";
  src: local("Arial");
  size-adjust: 107%;
  ascent-override: 90%;
  descent-override: 22%;
  line-gap-override: 0%;
}
```

```js
// INP: yield to the main thread between chunks of work.
const yieldToMain = () =>
  "scheduler" in window && "yield" in scheduler
    ? scheduler.yield()
    : new Promise(r => setTimeout(r, 0));

export async function processInChunks(items, fn, chunk = 50) {
  for (let i = 0; i < items.length; i += chunk) {
    items.slice(i, i + chunk).forEach(fn);
    await yieldToMain();
  }
}
```

## Animation jank profiling

Jank is a frame that took longer than the budget. At 60Hz the budget is 16.7ms including the
browser's own work, so aim for under 10ms of your own.

Protocol:

1. Open Performance panel. Set CPU throttle to 4x. Set network to Slow 4G.
2. Record while performing the interaction (scroll, hover, open a menu) for 5 seconds.
3. Look at the Frames track for red bars.
4. For any long frame, expand the flame chart and identify the widest block.

What each finding means:

| In the flame chart | Cause | Fix |
|---|---|---|
| `Recalculate Style` on many elements | A class change high in the tree, or a `:has()` selector with a broad subject | Scope the class change lower; narrow the selector |
| `Layout` during scroll or pointer move | Reading geometry (`offsetTop`, `getBoundingClientRect`) inside the handler | Cache measurements, re-measure on resize only |
| `Layout` alternating with `Recalculate Style` | Forced synchronous layout (read after write in a loop) | Batch all reads, then all writes |
| Wide `Paint` region | Animating a property that repaints (box-shadow, filter, background-position) | Animate `transform`/`opacity` on a pre-rendered layer |
| `Composite Layers` growing | Too many promoted layers | Reduce `will-change` usage |
| Long `Function Call` in a rAF | Doing real work per frame | Move computation out of the loop; interpolate cached values |

```js
// Frame budget monitor. Logs any frame over budget with a running count.
(() => {
  let last = performance.now(), over = 0, total = 0;
  const budget = 16.7;
  const tick = (now) => {
    const dt = now - last; last = now; total++;
    if (dt > budget * 1.5) { over++; console.log(`frame ${dt.toFixed(1)}ms`); }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  setTimeout(() => console.log(`dropped ${over}/${total} frames (${(over/total*100).toFixed(1)}%)`), 5000);
})();
// PASS: under 2% dropped at 4x throttle.
```

```js
// Forced-reflow detector: catches geometry reads inside animation frames.
(() => {
  const props = ["offsetTop","offsetLeft","offsetWidth","offsetHeight",
                 "scrollTop","scrollLeft","clientWidth","clientHeight"];
  let inFrame = false, hits = [];
  const origRAF = window.requestAnimationFrame;
  window.requestAnimationFrame = (cb) => origRAF((t) => { inFrame = true; cb(t); inFrame = false; });
  const origRect = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function () {
    if (inFrame) hits.push(new Error().stack.split("\n")[2]?.trim());
    return origRect.apply(this, arguments);
  };
  setTimeout(() => {
    const counts = hits.reduce((a, s) => (a[s] = (a[s] ?? 0) + 1, a), {});
    console.table(Object.entries(counts).map(([site, n]) => ({ site, n })));
    Element.prototype.getBoundingClientRect = origRect;
    window.requestAnimationFrame = origRAF;
  }, 5000);
})();
// PASS: empty table.
```

## Responsive matrix

Test widths, not devices. Devices change; the breakpoints do not.

| Width | Represents | Watch for |
|---:|---|---|
| 320 | Smallest supported | Horizontal overflow, truncated buttons |
| 375 | Common phone | Tap target crowding |
| 390 | Modern phone | Safe area insets |
| 428 | Large phone | Layout switching too early |
| 768 | Tablet portrait | The awkward middle: neither mobile nor desktop layout fits |
| 1024 | Tablet landscape / small laptop | Nav collapsing correctly |
| 1280 | Standard desktop | Max-width kicking in |
| 1440 | Common desktop | Line length exceeding 75ch |
| 1920 | Large desktop | Content stranded in the centre, or stretched |
| 2560 | Very large | Images upscaling and blurring |

Plus: 200% zoom at 1280 (must have no horizontal scroll), 400% zoom at 1280 (content must remain
usable), and landscape orientation on a 390px-tall viewport.

```ts
// Playwright responsive sweep with overflow detection.
import { test, expect } from "@playwright/test";
const widths = [320, 375, 390, 428, 768, 1024, 1280, 1440, 1920, 2560];

for (const w of widths) {
  test(`no horizontal overflow at ${w}px`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto("/");
    const offenders = await page.evaluate(() => {
      const docW = document.documentElement.clientWidth;
      return [...document.querySelectorAll("body *")]
        .filter(el => { const r = el.getBoundingClientRect();
          return r.width > 0 && (r.right > docW + 1 || r.left < -1); })
        .slice(0, 10)
        .map(el => `${el.tagName}.${el.className?.toString().slice(0,40)}`);
    });
    expect(offenders, `overflowing at ${w}px`).toEqual([]);
  });
}
```

## Cross-browser motion

Differences that reliably break motion-heavy builds:

- **Safari, `backdrop-filter`**: needs `-webkit-backdrop-filter`, and it is expensive. On a large
  surface it can halve the frame rate.
- **Safari, sticky inside transformed ancestor**: a transform on any ancestor creates a containing
  block and sticky stops working. This is the single most common Safari-only layout bug.
- **Safari, `100vh`**: includes the URL bar. Use `100dvh` with a `100vh` fallback.
- **Safari, scroll anchoring**: not supported, so content-injection above the viewport jumps.
- **Firefox, `will-change` limits**: Firefox is stricter about how many layers it will promote.
  Excess `will-change` degrades rather than helps.
- **Firefox, `linear()` easing**: supported in current versions, but verify if you target older.
- **Safari and Firefox, View Transitions**: cross-document transitions are Chromium-first. Always
  wrap in a capability check and ship a non-animated path.
- **All browsers, `prefers-reduced-motion` on Windows**: maps to the "Show animations" setting,
  which many users have off without realising. Do not treat it as rare.

```js
export const support = {
  vt: "startViewTransition" in document,
  scrollTimeline: CSS.supports("animation-timeline", "scroll()"),
  has: CSS.supports("selector(:has(*))"),
  backdrop: CSS.supports("backdrop-filter", "blur(1px)") ||
            CSS.supports("-webkit-backdrop-filter", "blur(1px)"),
  linearEase: CSS.supports("transition-timing-function", "linear(0, 1)"),
  dvh: CSS.supports("height", "100dvh"),
};
console.table(support);
```

## Visual regression harness

```ts
// visual.spec.ts - matrix across route, theme and width, with motion disabled.
import { test, expect } from "@playwright/test";

const routes = ["/", "/pricing", "/docs"];
const themes = ["light", "dark"] as const;
const widths = [390, 768, 1440];

test.beforeEach(async ({ page }) => {
  // Determinism: kill animation, freeze time-based effects, hide dynamic content.
  await page.addInitScript(() => {
    // Freeze Math.random for any generative background.
    let s = 42;
    Math.random = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
  });
  await page.addStyleTag({ content: `
    *, *::before, *::after {
      animation: none !important;
      transition: none !important;
      caret-color: transparent !important;
    }
    [data-testid="live-clock"], .timestamp { visibility: hidden !important; }
  `});
});

for (const route of routes)
  for (const theme of themes)
    for (const width of widths)
      test(`visual ${route} ${theme} ${width}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(route);
        await page.evaluate(t => { document.documentElement.dataset.theme = t; }, theme);
        await page.evaluate(() => document.fonts.ready);
        // Force all lazy content in before capture.
        await page.evaluate(async () => {
          window.scrollTo(0, document.body.scrollHeight);
          await new Promise(r => setTimeout(r, 400));
          window.scrollTo(0, 0);
          await new Promise(r => setTimeout(r, 200));
        });
        await expect(page).toHaveScreenshot(
          `${route.replace(/\//g, "_")}-${theme}-${width}.png`,
          { fullPage: true, maxDiffPixelRatio: 0.005, animations: "disabled" }
        );
      });
```

The three things that make visual diffing usable rather than a source of constant false failures:
disable animation, seed randomness, and wait for `document.fonts.ready`. Without all three you will
get flaky diffs and the team will stop trusting the suite within two weeks.

## Performance budget in CI

```json
{
  "ci": {
    "collect": { "url": ["http://localhost:3000/", "http://localhost:3000/pricing"], "numberOfRuns": 3 },
    "assert": {
      "assertions": {
        "categories:performance":   ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 1.0 }],
        "categories:seo":           ["error", { "minScore": 0.9 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift":  ["error", { "maxNumericValue": 0.1 }],
        "total-blocking-time":      ["error", { "maxNumericValue": 300 }],
        "unused-javascript":        ["warn",  { "maxNumericValue": 40000 }],
        "uses-responsive-images":   ["error", {}],
        "font-display":             ["error", {}]
      }
    }
  }
}
```

Accessibility is set to `minScore: 1.0` deliberately. Lighthouse's a11y audit only checks
automatable rules, so anything less than a perfect score means there is a mechanical failure, which
is never acceptable.

```yaml
# .github/workflows/qa.yml
name: qa
on: [pull_request]
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run build
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test a11y.spec.ts
      - run: npx playwright test visual.spec.ts
      - run: npm start & npx wait-on http://localhost:3000
      - run: npx @lhci/cli autorun
      - uses: actions/upload-artifact@v4
        if: failure()
        with: { name: qa-artifacts, path: |
            playwright-report/
            test-results/
            .lighthouseci/ }
```

## Semantic HTML and SEO

```js
// Semantics audit for heavily designed pages, where divs multiply.
(() => {
  const divRatio = document.querySelectorAll("div").length /
                   document.querySelectorAll("body *").length;
  console.log("div ratio:", (divRatio * 100).toFixed(0) + "%");
  console.log("semantic elements:", ["header","nav","main","article","section","aside","footer","figure","time"]
    .map(t => `${t}:${document.querySelectorAll(t).length}`).join(" "));
  console.log("title:", document.title, `(${document.title.length} chars, target 30-60)`);
  const d = document.querySelector('meta[name="description"]')?.content ?? "";
  console.log("description:", d.length, "chars (target 120-160)");
  console.log("og tags:", [...document.querySelectorAll('meta[property^="og:"]')]
    .map(m => m.getAttribute("property")).join(", ") || "NONE");
  console.log("canonical:", document.querySelector('link[rel=canonical]')?.href ?? "MISSING");
  console.log("lang:", document.documentElement.lang || "MISSING");
  console.log("clickable divs (should be buttons):",
    [...document.querySelectorAll("div[onclick],span[onclick]")].length);
})();
```

Rules: one `h1`, headings describe content rather than styling, `<button>` for actions and `<a>`
for navigation (never a div with a click handler), `<time datetime>` for dates, `lang` on `<html>`,
canonical URL present, and Open Graph tags complete enough that a shared link renders correctly.

## Composition

The audit stages feed each other:

- Semantics findings change the a11y results, so fix semantics first and re-run axe.
- A11y fixes (visible focus, larger targets) change layout, so run responsive after a11y.
- Performance fixes (lazy loading, image sizing) change CLS, so re-measure vitals after them.
- Design and slop fixes change the DOM, so regenerate visual baselines last.

Never generate visual regression baselines before the other stages pass, or you lock in the bugs.

Conflicts to expect:

- Disabling animation for visual diffing hides motion bugs. Keep a separate motion-specific test
  that records a trace rather than a screenshot.
- Lighthouse runs on a cold cache in a clean profile; your manual testing does not. Numbers will
  differ; trust CI for trend, manual for diagnosis.
- Axe cannot see keyboard traps or nonsense reading order. A perfect axe score is a floor.

## Performance budget

| Metric | Budget |
|---|---|
| LCP (Slow 4G, 4x CPU) | under 2.5s |
| CLS | under 0.1, target 0 |
| INP | under 200ms |
| Total blocking time | under 300ms |
| JS transferred | under 200KB gzipped |
| CSS transferred | under 50KB gzipped |
| Fonts on first load | 2 files, under 80KB total |
| Largest image | under 200KB, served as AVIF or WebP |
| Dropped frames at 4x throttle | under 2% |
| Lighthouse accessibility | 100 |
| Axe violations | 0 |

## Accessibility

This toolkit's own accessibility requirements, since an audit that is inaccessible to run is not
useful:

- Every check above works from the keyboard and the console; none requires a mouse.
- Contrast checks compute ratios rather than relying on visual judgement.
- Screen reader steps name the specific navigation mode to use, not "test with a screen reader".
- Reduced-motion testing uses the real OS setting, because emulation can miss JS paths that read
  the media query only at load.

## Anti-slop rules

1. Never report an audit result you did not personally observe. "Should be fine" is not a finding.
2. Do not run performance checks without CPU throttling.
3. Never treat a clean axe run as an accessibility pass. It covers 30-40% of issues.
4. Do not test devices; test widths, plus zoom levels.
5. Never generate visual baselines before the other audit stages pass.
6. Do not disable a failing test to make CI green. Fix or explicitly quarantine with an issue link.
7. Never claim reduced-motion support without enabling the OS setting and reloading.
8. Do not fix jank by adding `translateZ(0)`. Find the actual cause in the flame chart.
9. Never truncate an audit at the first violation. Report all of them.
10. Do not use pixel-perfect visual diffing without disabling animation and seeding randomness.
11. Never audit design before semantics; you will redo the work.
12. Do not treat a Lighthouse score as the goal. It is a proxy, and it is gameable.
13. Never accept "works on my machine" for a mobile bug. Reproduce at 4x throttle.
14. Do not add ARIA to fix a problem that native semantics solve. Bad ARIA is worse than none.
15. Never let a slop audit become a colour argument. The tells are structural.

## Ship checklist

- [ ] One `h1`, no skipped heading levels, landmarks present
- [ ] Zero axe violations across every route and theme
- [ ] Full keyboard pass: everything reachable, focus visible, order matches visual
- [ ] Dialogs trap focus, close on Escape, restore focus to the trigger
- [ ] Every form control has a programmatic accessible name
- [ ] Every error message associated with its field and announced
- [ ] No information conveyed by colour alone
- [ ] All text passes 4.5:1, large text 3:1, focus indicators 3:1, in every theme
- [ ] Reduced motion tested with the real OS setting; no content left invisible
- [ ] Every JS-driven effect has a reduced-motion guard, not just the CSS block
- [ ] LCP under 2.5s at 4x CPU and Slow 4G
- [ ] CLS under 0.1, with images sized and fonts metric-matched
- [ ] INP under 200ms; no long tasks over 50ms on interaction
- [ ] Under 2% dropped frames at 4x throttle during the heaviest interaction
- [ ] No forced reflow detected inside any animation frame
- [ ] No horizontal overflow at any width from 320 to 2560
- [ ] No horizontal scroll at 200% zoom; usable at 400%
- [ ] Text scales when browser font size is increased
- [ ] Verified in Safari and Firefox, not only Chromium
- [ ] Sticky elements verified in Safari (no transformed ancestors)
- [ ] `100dvh` used where viewport height matters
- [ ] Visual regression matrix covers route x theme x width, with motion disabled and randomness seeded
- [ ] Lighthouse CI gates in the pipeline with accessibility at 100
- [ ] Slop tell count is 2 or fewer
- [ ] Distinct section layouts exceed 50% of section count
- [ ] No single animation treatment applied to more than 20 elements
- [ ] Every stat and testimonial is real and attributed, or removed
