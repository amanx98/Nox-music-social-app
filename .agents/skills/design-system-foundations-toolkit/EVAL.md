---
name: design-system-foundations-toolkit-eval
description: Use when verifying that design system foundations were actually implemented correctly. Adversarial audit of tokens, color, type, spacing, elevation, theming, component APIs and accessibility contracts.
pairs_with: design-system-foundations-toolkit
---

# Eval: Design System Foundations

## What this audits

The failure this layer ships is a token file that looks like a design system and behaves like a
stylesheet. Symptoms: components referencing primitive tokens directly, a dark theme produced by
inversion, contrast never computed, a type scale that ignores user font settings, and a focus ring
that some component quietly removed. None of this is visible in a screenshot of the happy path. All
of it surfaces the first time someone rebrands, themes, zooms or uses a keyboard.

The second failure is a system with no enforcement. Rules that exist only in a README are not a
system; they are advice. This audit weights CI enforcement heavily.

## Evidence required

Open these. Do not score from a description.

- The token source files and the generated CSS output
- Component source, grepped for token references
- The page at 1440x900 and 390x844, in light and dark, in every brand
- DevTools Elements panel with computed styles on a themed component
- DevTools Rendering panel with `prefers-reduced-motion: reduce` emulated
- DevTools Coverage panel for unused CSS
- The page at 200% browser zoom
- The CI configuration, for contrast, contract and visual regression gates
- A hard reload with cache disabled, watching the very first painted frame for a theme flash
- Keyboard tab through a page, watching the focus indicator on every element type

## Automated checks

```bash
SRC="src"; TOKENS="tokens"

echo "== 1. components referencing primitive tokens directly =="
grep -rnE "var\(--(color-)?(blue|red|green|neutral|gray|grey|slate|zinc)-[0-9]{2,3}\)" $SRC \
  --include=*.tsx --include=*.jsx --include=*.vue | grep -v "$TOKENS"
# PASS: no output. FAIL: any component reaching past the semantic tier.

echo "== 2. token names encoding their own value =="
grep -rnE "^\s*--color-(blue|red|green|purple|orange)-(primary|accent|brand)" $TOKENS $SRC --include=*.css
# PASS: no output.

echo "== 3. HSL color ramps =="
grep -rnE "hsl\(" $TOKENS $SRC --include=*.css | grep -vE "shadow|/ 0\.[0-9]"
# PASS: no output, or only alpha-composited shadow tints. FAIL: hue ramps authored in HSL.

echo "== 4. pure black / pure white in dark theme =="
grep -rnA40 'data-theme="dark"' $SRC --include=*.css | grep -iE "#000\b|#fff\b|oklch\(0 0 0\)|oklch\(1 0 0\)"
# PASS: no output.

echo "== 5. clamp() type steps keep a rem term =="
grep -rnE "--text-[a-z0-9]+:\s*clamp\(" $SRC $TOKENS --include=*.css | grep -vE "rem\s*\+"
# PASS: no output. FAIL: any step whose preferred value is pure vw (breaks user font scaling).

echo "== 6. single-layer shadows =="
grep -rnE "--shadow-[0-9]+:\s*[^;]*;" $TOKENS $SRC --include=*.css | grep -v ","
# PASS: no output. Every elevation step should have two or more layers.

echo "== 7. color-scheme declared =="
grep -rn "color-scheme" $SRC --include=*.css | wc -l
# PASS: >= 2 (light and dark). FAIL: 0.

echo "== 8. focus indicator removed without replacement =="
grep -rnB2 -A6 "outline:\s*none\|outline:\s*0" $SRC --include=*.css | grep -c "focus-visible"
# Manually confirm every outline:none sits in a rule that restores a visible indicator.

echo "== 9. boolean variant props =="
grep -rnE "(primary|secondary|danger|ghost|small|large)\??\s*:\s*boolean" $SRC --include=*.ts --include=*.tsx
# PASS: no output. FAIL: mutually exclusive variants modelled as booleans.

echo "== 10. className replaced rather than merged =="
grep -rn "className={\`" $SRC --include=*.tsx | grep -v "cn(\|clsx(\|twMerge("
# PASS: no output in components that accept a className prop.

echo "== 11. multiple tailwind-merge configs =="
grep -rn "extendTailwindMerge\|createTailwindMerge" $SRC | wc -l
# PASS: 0 or 1.

echo "== 12. hardcoded fills in icon sources =="
grep -rnE 'fill="#|stroke="#' public/icons $SRC/icons 2>/dev/null
# PASS: no output. Icons must use currentColor.

echo "== 13. raw durations in components =="
grep -rnE "duration-\[[0-9]+ms\]|transition-duration:\s*[0-9]+ms" $SRC --include=*.tsx --include=*.css \
  | grep -v "$TOKENS"
# PASS: no output. Components should reference semantic motion tokens.

echo "== 14. brand contract completeness =="
CONTRACT=$(grep -oE "^\s*--[a-z-]+:" $SRC/styles/contract.css | tr -d ' :' | sort -u)
for f in $SRC/styles/brands/*.css; do
  MISSING=$(comm -23 <(echo "$CONTRACT") <(grep -oE "^\s*--[a-z-]+:" "$f" | tr -d ' :' | sort -u))
  [ -n "$MISSING" ] && echo "FAIL $f missing: $MISSING"
done
# PASS: no FAIL lines.

echo "== 15. CI gates present =="
grep -rniE "contrast|axe|playwright.*screenshot|toHaveScreenshot" .github/workflows/ 2>/dev/null | wc -l
# PASS: >= 2 distinct gates (contrast audit AND visual regression).
```

```js
// Runtime checks. Paste into the console on the live page.

// R1: computed contrast for every semantic pair, in the CURRENT theme.
(() => {
  const lin = c => { c/=255; return c<=0.04045 ? c/12.92 : ((c+0.055)/1.055)**2.4; };
  const lum = ([r,g,b]) => 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b);
  const rgb = v => { const d=document.createElement('div'); d.style.color=v;
    document.body.appendChild(d);
    const m=getComputedStyle(d).color.match(/[\d.]+/g).slice(0,3).map(Number); d.remove(); return m; };
  const ratio = (a,b) => { const [h,l]=[lum(rgb(a)),lum(rgb(b))].sort((x,y)=>y-x);
    return +((h+0.05)/(l+0.05)).toFixed(2); };
  const cs = getComputedStyle(document.documentElement);
  const v = n => cs.getPropertyValue(n).trim();
  const pairs = [
    ["text on surface", v("--color-text"), v("--color-surface"), 4.5],
    ["muted on surface", v("--color-text-muted"), v("--color-surface"), 4.5],
    ["text on raised", v("--color-text"), v("--color-surface-raised"), 4.5],
    ["accent-text on accent", v("--color-accent-text"), v("--color-accent"), 4.5],
    ["border on surface", v("--color-border"), v("--color-surface"), 3],
  ];
  console.table(pairs.map(([name,fg,bg,min]) => {
    const r = ratio(fg,bg); return { name, ratio: r, min, pass: r >= min };
  }));
})();
// PASS: every row passes. Run once per theme and per brand. FAIL: any false.

// R2: reduced motion actually collapses durations.
(() => {
  const cs = getComputedStyle(document.documentElement);
  ["--duration-150","--duration-250","--duration-400"].forEach(n =>
    console.log(n, cs.getPropertyValue(n).trim()));
})();
// With reduced motion emulated, PASS: all report 1ms. FAIL: unchanged, or 0s.

// R3: every focusable element has a visible focus indicator.
(() => {
  const bad = [];
  document.querySelectorAll('a,button,input,select,textarea,summary,[tabindex]:not([tabindex="-1"])')
    .forEach(el => { el.focus();
      const s = getComputedStyle(el);
      const outline = s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0;
      if (!outline && s.boxShadow === "none") bad.push(el);
    });
  console.log("no visible focus indicator:", bad.length, bad);
})();
// PASS: 0.

// R4: dark-mode elevation is not still a shadow.
(() => {
  const cs = getComputedStyle(document.documentElement);
  console.log("theme:", document.documentElement.dataset.theme,
              "| elevation-raised:", cs.getPropertyValue("--elevation-raised").trim(),
              "| surface-raised:", cs.getPropertyValue("--color-surface-raised").trim(),
              "| surface:", cs.getPropertyValue("--color-surface").trim());
})();
// PASS in dark: elevation is none/minimal AND surface-raised is lighter than surface.
// FAIL: elevation still a multi-layer shadow with identical surface values.

// R5: no layout shift from theme resolution.
new PerformanceObserver(l => l.getEntries().forEach(e => {
  if (!e.hadRecentInput) console.log("CLS entry", e.value, e.sources);
})).observe({ type: "layout-shift", buffered: true });
// PASS: total CLS under 0.02 on load.
```

## Manual inspection protocol

1. Hard reload with cache disabled. FAIL if there is any flash of the wrong theme, even one frame.
2. Toggle the theme. FAIL if anything remains unreadable, or if any surface loses its boundary.
3. In dark theme, compare a card against the page background. FAIL if the card is distinguishable
   only by a shadow rather than by surface lightness.
4. In dark theme, look at the accent color at full saturation on a large fill. FAIL if it vibrates
   or appears to glow relative to the light theme equivalent.
5. Set the browser's default font size to 24px. FAIL if body text does not grow proportionally.
6. Zoom to 200%. FAIL if horizontal scrolling appears, or if any content is clipped.
7. Measure a line of body copy. FAIL if it exceeds 75 characters or falls under 45.
8. Tab through every interactive element type. FAIL if the focus indicator differs in visibility
   between element types, or disappears on any of them.
9. Put a card inside a narrow sidebar and inside a wide main column. FAIL if it uses the same
   layout in both, or if its text size responds to the viewport rather than the container.
10. Switch brands. FAIL if any component keeps the previous brand's accent, radius or font.
11. Switch brand and theme together. FAIL if the combination is unstyled or falls back to defaults.
12. Emulate reduced motion. FAIL if any transition still runs at full duration.
13. Open Coverage panel, reload. FAIL if unused CSS exceeds 10%.
14. Grep the component layer for a hardcoded hex color. FAIL on any hit.
15. Regenerate one shadcn component with the pinned CLI. FAIL if it silently overwrites documented
    local edits with no marker.

## Scoring rubric

| # | Criterion | Weight | 0 | 1 | 2 |
|---|---|---:|---|---|---|
| 1 | Token tier discipline | 12 | Components use primitives or raw values | Mostly semantic, some leaks | Components reference semantic tier only, enforced by a lint rule |
| 2 | Color ramp construction | 10 | HSL or arbitrary values, constant chroma | OKLCH but flat chroma curve or gamut clipping | OKLCH, falling chroma at both ends, within sRGB ceilings |
| 3 | Contrast verification | 12 | Never computed | Computed manually once | Computed in CI for every pair, theme and brand; build fails on regression |
| 4 | Dark mode authorship | 10 | Inverted light palette | Separate values but same chroma, or pure black/white used | Independently authored, chroma reduced, no pure extremes, elevation re-tokenised |
| 5 | Theme flash | 8 | Visible flash on reload | Flash only on slow connections | Inline blocking script, zero flash, CLS under 0.02 |
| 6 | Type scale integrity | 8 | Arbitrary sizes, no scale | Scale exists but a step loses the `rem` term or measure is uncapped | Ratio-based, fluid with `rem` retained, measure capped 45-75ch |
| 7 | Focus contract | 10 | Indicators removed somewhere | Present but inconsistent across element types | Single `:where()` foundation rule, never overridden, 3:1 against adjacent |
| 8 | Component API quality | 8 | Boolean variants, className replaced | Enumerated variants but no ref forwarding or no merge | `cva` variants, ref forwarded, `className` merged, `asChild` where needed |
| 9 | Headless primitives | 8 | Hand-rolled focus trap or combobox | Primitives used but focus styling missing | Primitives throughout, styled via data attributes, tested with a screen reader |
| 10 | Responsive strategy | 8 | Media queries for component internals | Mixed | Container queries for components, media for page layout, `cqi` not `vw` inside containers |
| 11 | Motion tokenisation | 6 | Raw durations in components | Tokens exist but reduced motion handled per component | Semantic motion tokens, reduced motion collapsed at the primitive tier |
| 12 | Multi-brand architecture | 6 | Component forks per brand | Token files but no enforced contract | One component set, contract enforced in CI, brand and theme independent axes |
| 13 | Regression enforcement | 6 | No visual tests | Screenshots in one theme only | Matrix across every theme and brand, animations disabled for determinism |
| 14 | Zoom and font scaling | 6 | Breaks at 200% or ignores font settings | One of the two works | Both work, no horizontal scroll, no clipping |

**Total: 118 points. Ship threshold: 89 (75%). Any 0 in criteria 1, 3, 7 or 14 is an automatic NO SHIP.**

## Common false passes

1. **The "we use OKLCH" pass.** Every value is `oklch()`, but the chroma is constant down the ramp
   and several steps exceed the sRGB gamut for that hue. The browser silently clips them, so the
   900 and 950 steps render as the same muddy color. Sample the rendered pixels, do not trust the
   authored values.

2. **The "dark mode works" pass.** It looks fine because every surface is a different grey. But
   `--elevation-raised` still resolves to a shadow, so cards are distinguished only by a shadow
   nobody can see, and the accent is the same chroma as light mode so it glows. Check the computed
   elevation token in dark, not the screenshot.

3. **The "accessible" pass with an invisible focus ring.** Every element has `:focus-visible`
   styling. It is a 1px `--color-border` outline, which is 1.4:1 against the surface. Present in
   code, invisible in practice. Measure the focus indicator contrast specifically.

4. **The "no flash" pass on a fast connection.** The theme script is in a deferred bundle. On the
   developer's local machine it runs before paint. On a 3G connection it does not. Throttle the
   network to Slow 3G and reload before scoring this.

5. **The "fluid typography" pass that breaks font scaling.** The `clamp()` preferred values are
   pure `vw`. Text scales beautifully with the viewport and completely ignores a user who set their
   browser font to 24px because they cannot read 16px. This is an accessibility failure disguised
   as a modern technique.

6. **The "tokens are enforced" pass with enforcement in a README.** The rules are correct and
   documented. Nothing checks them. Six components already reference `--blue-600` directly. Grep
   the component layer; do not read the documentation.

7. **The "multi-brand ready" pass tested in one brand.** The architecture is right, but only brand
   A has ever been rendered. Brand B's accent fails contrast against its accent-text, and its
   `--radius-md: 0` reveals three components that hardcode `rounded-md`. Render every brand.

8. **The "container queries" pass that still uses `vw`.** Components declare `container-type` and
   use `@container`, but the type inside them is `clamp()` with `vw` units, so a card in a 300px
   sidebar gets desktop-sized headings. Check the units inside container-query components.

9. **The "visual regression covered" pass in light mode only.** The Playwright suite is thorough and
   runs on every PR against the light theme. Dark mode has regressed twice and nobody noticed.
   Check the test matrix, not the test count.

## Required fixes by failure mode

| Failure | Root cause | Fix |
|---|---|---|
| Component cannot be rebranded | References primitive tokens | Introduce the missing semantic token; add a lint rule banning primitive references outside the token layer |
| Ramp looks muddy at the ends | Constant chroma, gamut clipping | Taper chroma toward both lightness extremes; clamp to the per-hue sRGB ceiling |
| Contrast regressions ship | Audit is manual | Move the audit into CI across the full theme and brand matrix; fail the build |
| Dark cards invisible | Elevation token not re-themed | Override `--elevation-*` per theme; use surface lightness for depth in dark |
| Dark accent glows | Same chroma as light | Reduce chroma 15-25% in the dark palette |
| Theme flash | Theme resolved after paint | Inline synchronous script in `<head>` before any stylesheet |
| Text ignores browser font size | `clamp()` preferred is pure `vw` | Rewrite preferred as `Xrem + Yvw` |
| Focus ring invisible | Indicator color has no contrast requirement | Define `--color-focus` with a verified 3:1 against every adjacent surface |
| Utility cannot override component class | Component styles outside a layer | Move them into `@layer components` |
| Sidebar card looks like a desktop card | Viewport units inside a container-query component | Replace `vw` with `cqi` |
| shadcn edits lost | Ad hoc in-place edits | Move all styling to tokens or wrappers; document any remaining `ui/` edit with a header comment; pin the CLI version |
| Brand renders unstyled | Missing contract token falling back to `initial` | Add the contract completeness check to CI |
| Reduced motion partially honoured | Handled per component | Collapse durations at the primitive token tier |

## Verdict format

```
SCORE: <n>/118 (<pct>%)
THEMES AUDITED: <list>   BRANDS AUDITED: <list>

| # | Criterion | Band | Evidence |
|---|---|---|---|
| 1 | Token tier discipline | 0/1/2 | <file:line or command output> |
... all 14 rows ...

CONTRAST TABLE (per theme, per brand)
| pair | ratio | required | pass |

AUTOMATIC FAILURES: <criteria 1, 3, 7, 14 scoring 0, or "none">

BLOCKING ISSUES
1. <issue> - <evidence> - <required fix>

NON-BLOCKING
- <issue> - <suggested fix>

EVIDENCE NOT OBTAINED
- <check skipped and why>

SHIP
```
or
```
NO SHIP
```
