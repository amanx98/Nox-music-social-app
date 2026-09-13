---
name: design-system-foundations-toolkit
description: Use when establishing or auditing the foundations of a design system - tokens, color, typography, spacing, elevation, theming, component APIs, Tailwind v4 setup, shadcn composition, icons and motion tokens. Covers the whole foundation layer, not individual components.
category: ds
pairs_with: design-system-foundations-toolkit-eval
---

# Design System Foundations Toolkit

## Scope

The layer underneath components. Get this wrong and every component built on it inherits the
problem.

- Token architecture: primitive, semantic and component tiers
- DTCG format and the Style Dictionary pipeline
- Perceptual color in OKLCH, ramp construction, computed contrast
- Type scales, measure, leading, pairing, optical adjustments
- Spacing scales and layout grids
- Elevation and shadow systems
- Theming and dark mode without naive inversion
- Multi-brand and white-label architecture
- Component API conventions that survive a team
- Tailwind v4 CSS-first configuration
- shadcn composition without fork chaos
- Headless primitives and the accessibility contract
- Icon systems: grid, weight, optical sizing, delivery
- Motion tokens and semantic motion roles
- Breakpoint and container query strategy
- Documentation and visual regression

Excluded: individual component implementations (see `app-ui-surfaces-toolkit` and
`marketing-sections-toolkit`) and animation technique (see `micro-interactions-toolkit`).

## Decision matrix

| Situation | Do this | Not this | Why |
|---|---|---|---|
| Naming a color token | `--color-surface-raised` | `--color-gray-100` in component code | Components must not know which grey they are using; that is what makes rebranding possible |
| Building a color ramp | OKLCH with controlled lightness steps | HSL with arbitrary values | HSL lightness is not perceptual; 50% lightness looks different per hue |
| Dark mode | Rebuild the ramp with different chroma and lightness | Invert the light ramp | Inversion produces glowing saturated colors and destroys hierarchy |
| Elevation in dark mode | Raise surface lightness | Increase shadow opacity | Shadows are nearly invisible on dark surfaces; light is the depth cue |
| Type scale | Modular ratio, 6-9 steps, fluid within each | A step for every design need | More than 9 steps means the scale is not being used as a system |
| Spacing scale | 4px base, non-linear at the top | 8-point grid with no small values | You need 2px and 6px for icon and border alignment |
| Breakpoints | Container queries for components, media queries for layout | Media queries for everything | A card should respond to its container, not the viewport |
| Component variants | `cva`/`tailwind-variants` with typed props | Boolean prop per visual state | Booleans multiply combinatorially and permit invalid states |
| Extending shadcn | Wrap and re-export from your own path | Edit the generated file in place | In-place edits are lost on regeneration and invisible in review |
| Icon sizing | Optical sizing on a fixed grid | Scaling one SVG to any size | A 16px icon needs thicker strokes than the same shape at 32px |
| Motion values | Semantic tokens (`--motion-exit`) | Raw durations in components | Semantic tokens let you retune the whole product's feel in one place |
| Multi-brand | Token file per brand, one component set | Component fork per brand | Forks diverge within a quarter |

## Shared foundations

**Three token tiers, and the rule that makes them work.**

```
primitive   --blue-600: oklch(0.55 0.19 258)      raw values, no meaning
    |
semantic    --color-accent: var(--blue-600)        meaning, no context
    |
component   --btn-bg: var(--color-accent)          context
```

The rule: **components reference semantic tokens only.** A component that references
`--blue-600` directly cannot be rebranded, cannot be themed, and will break the first time the
palette shifts. Primitive tokens exist so semantic tokens have something to point at; they are not
for use in application code.

Component-tier tokens are optional. Add them only when a component needs to expose a hook for
consumers to override. Every component-tier token is a public API you have to keep.

**The naming grammar.** Use `--<category>-<role>-<variant>-<state>`, dropping segments that do not
apply.

```
--color-surface            base page surface
--color-surface-raised     a card on top of it
--color-surface-sunken     a well or input
--color-text               primary body text
--color-text-muted         secondary
--color-text-inverse       on a dark accent fill
--color-border             default hairline
--color-border-strong      emphasised divider
--color-accent             brand action color
--color-accent-hover       its hover state
--color-danger             destructive
--space-4                  spacing step
--text-lg                  type step
--radius-md                corner radius step
--shadow-2                 elevation step
--motion-enter             semantic duration
```

Never encode the value in the name. `--color-blue-primary` is a trap: the day the brand goes green
you either rename everything or ship a token called blue that is green.

## Token architecture and DTCG

DTCG (Design Tokens Community Group) format is the interchange standard. Its value is that design
tools and build tools agree on it, not that it is pleasant to hand-write.

```json
{
  "$schema": "https://tr.designtokens.org/format/",
  "color": {
    "$type": "color",
    "blue": {
      "500": { "$value": "oklch(0.62 0.17 258)" },
      "600": { "$value": "oklch(0.55 0.19 258)" },
      "700": { "$value": "oklch(0.47 0.18 258)" }
    },
    "neutral": {
      "0":   { "$value": "oklch(1 0 0)" },
      "50":  { "$value": "oklch(0.98 0.002 260)" },
      "100": { "$value": "oklch(0.96 0.003 260)" },
      "900": { "$value": "oklch(0.21 0.008 260)" },
      "950": { "$value": "oklch(0.15 0.008 260)" }
    }
  },
  "semantic": {
    "$type": "color",
    "surface":        { "$value": "{color.neutral.0}" },
    "surface-raised": { "$value": "{color.neutral.0}" },
    "text":           { "$value": "{color.neutral.900}" },
    "accent":         { "$value": "{color.blue.600}" },
    "accent-hover":   { "$value": "{color.blue.700}" }
  },
  "space": {
    "$type": "dimension",
    "1": { "$value": "0.25rem" },
    "2": { "$value": "0.5rem" },
    "3": { "$value": "0.75rem" },
    "4": { "$value": "1rem" },
    "6": { "$value": "1.5rem" },
    "8": { "$value": "2rem" },
    "12": { "$value": "3rem" },
    "16": { "$value": "4rem" },
    "24": { "$value": "6rem" }
  },
  "motion": {
    "$type": "duration",
    "fast":  { "$value": "160ms" },
    "base":  { "$value": "240ms" },
    "slow":  { "$value": "360ms" }
  }
}
```

Style Dictionary v4 config that emits CSS custom properties plus a typed TS export:

```js
// style-dictionary.config.js
import StyleDictionary from "style-dictionary";

StyleDictionary.registerTransform({
  name: "name/kebab-flat",
  type: "name",
  transform: (token) => token.path.join("-").toLowerCase(),
});

export default {
  source: ["tokens/**/*.json"],
  platforms: {
    css: {
      transformGroup: "css",
      transforms: ["name/kebab-flat", "color/css", "size/rem"],
      buildPath: "build/css/",
      files: [{
        destination: "tokens.css",
        format: "css/variables",
        options: { outputReferences: true },   // keeps var() chains intact
      }],
    },
    ts: {
      transformGroup: "js",
      buildPath: "build/ts/",
      files: [{
        destination: "tokens.ts",
        format: "javascript/es6",
      }],
    },
  },
};
```

`outputReferences: true` is the setting that matters. Without it, every semantic token is flattened
to a literal value and theming by overriding a primitive stops working.

## Perceptual color in OKLCH

sRGB and HSL are not perceptually uniform. `hsl(60 100% 50%)` (yellow) and `hsl(240 100% 50%)`
(blue) both claim 50% lightness; the yellow is blindingly bright and the blue is nearly black.
Every palette built in HSL inherits this distortion, which is why hand-tuned HSL ramps have
inconsistent contrast across hues.

OKLCH separates perceived lightness (L, 0-1), chroma (C, colorfulness, unbounded but practically
0-0.37) and hue (H, 0-360 degrees). Equal L means equal perceived lightness across every hue.

```css
/* A ramp with controlled perceptual steps. L values are the design decision. */
:root {
  --l-50:  0.97; --l-100: 0.94; --l-200: 0.88; --l-300: 0.80;
  --l-400: 0.71; --l-500: 0.62; --l-600: 0.55; --l-700: 0.47;
  --l-800: 0.39; --l-900: 0.30; --l-950: 0.21;

  --hue-brand: 258;

  --blue-50:  oklch(var(--l-50)  0.02 var(--hue-brand));
  --blue-100: oklch(var(--l-100) 0.04 var(--hue-brand));
  --blue-200: oklch(var(--l-200) 0.08 var(--hue-brand));
  --blue-300: oklch(var(--l-300) 0.12 var(--hue-brand));
  --blue-400: oklch(var(--l-400) 0.15 var(--hue-brand));
  --blue-500: oklch(var(--l-500) 0.17 var(--hue-brand));
  --blue-600: oklch(var(--l-600) 0.19 var(--hue-brand));
  --blue-700: oklch(var(--l-700) 0.18 var(--hue-brand));
  --blue-800: oklch(var(--l-800) 0.15 var(--hue-brand));
  --blue-900: oklch(var(--l-900) 0.11 var(--hue-brand));
  --blue-950: oklch(var(--l-950) 0.07 var(--hue-brand));
}
```

Note the chroma curve: it rises to a peak around the 600 step and falls off at both ends. Chroma
must fall at high lightness (there is no such thing as a vivid near-white) and at low lightness
(there is no vivid near-black). A ramp with constant chroma clips into out-of-gamut colors at the
extremes and renders as flat grey-blue mud.

**Chroma ceilings by hue.** Maximum achievable chroma in sRGB varies sharply with hue. Exceeding it
silently clips.

| Hue | Approx max chroma in sRGB at L=0.6 |
|---:|---:|
| 30 (orange) | 0.19 |
| 60 (yellow) | 0.17 |
| 145 (green) | 0.20 |
| 195 (cyan) | 0.13 |
| 258 (blue) | 0.20 |
| 300 (purple) | 0.24 |
| 350 (red) | 0.22 |

Use `@supports (color: oklch(0 0 0))` with a hex fallback if you must support older browsers, and
generate the fallback at build time rather than guessing it.

```js
// Contrast, computed rather than eyeballed. WCAG 2 relative luminance.
function srgbToLinear(c) {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
export function luminance([r, g, b]) {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}
export function contrastRatio(rgbA, rgbB) {
  const a = luminance(rgbA), b = luminance(rgbB);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

// Resolve an oklch() string to rgb by letting the browser do the conversion.
export function resolveToRgb(cssColor) {
  const el = document.createElement("div");
  el.style.color = cssColor;
  document.body.appendChild(el);
  const rgb = getComputedStyle(el).color.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
  el.remove();
  return rgb;
}

// Build-time gate: fail CI if any semantic pair drops below its required ratio.
export function auditPairs(pairs) {
  return pairs.map(({ name, fg, bg, min }) => {
    const ratio = contrastRatio(resolveToRgb(fg), resolveToRgb(bg));
    return { name, ratio: +ratio.toFixed(2), min, pass: ratio >= min };
  });
}
```

Required pairs to audit, at minimum: body text on surface, muted text on surface, text on accent
fill, text on raised surface, border against surface (3:1), focus ring against adjacent color
(3:1), and every one of those again in dark theme.

## Type scales

Pick a ratio, generate steps, then adjust by hand. The ratio gives coherence; the hand adjustment
gives usability.

| Ratio | Value | Character |
|---|---:|---|
| Minor third | 1.200 | Dense, UI-heavy products |
| Major third | 1.250 | Balanced default |
| Perfect fourth | 1.333 | Editorial, marketing |
| Golden | 1.618 | Dramatic, few steps, display work |

```css
:root {
  /* Fluid scale: each step interpolates between a min and max viewport.
     clamp(min, preferred, max) where preferred blends rem and vw. */
  --text-xs:   clamp(0.75rem,  0.72rem + 0.15vw, 0.8125rem);
  --text-sm:   clamp(0.875rem, 0.84rem + 0.18vw, 0.9375rem);
  --text-base: clamp(1rem,     0.96rem + 0.20vw, 1.0625rem);
  --text-lg:   clamp(1.125rem, 1.06rem + 0.32vw, 1.25rem);
  --text-xl:   clamp(1.375rem, 1.26rem + 0.55vw, 1.625rem);
  --text-2xl:  clamp(1.75rem,  1.55rem + 1.00vw, 2.25rem);
  --text-3xl:  clamp(2.25rem,  1.90rem + 1.75vw, 3.25rem);
  --text-4xl:  clamp(2.75rem,  2.10rem + 3.25vw, 4.5rem);
  --text-5xl:  clamp(3.25rem,  2.20rem + 5.25vw, 6rem);

  /* Leading is a function of size. Large text needs proportionally less. */
  --leading-tight:   1.1;    /* display, 2xl and up */
  --leading-snug:    1.25;   /* headings, lg to xl */
  --leading-normal:  1.5;    /* body */
  --leading-relaxed: 1.65;   /* long-form reading */

  /* Tracking is a function of size and weight. Large text needs negative tracking. */
  --tracking-tighter: -0.03em;  /* 4xl and up */
  --tracking-tight:   -0.015em; /* 2xl to 3xl */
  --tracking-normal:  0;        /* body */
  --tracking-wide:    0.04em;   /* small caps, overlines, xs uppercase */
}

h1 { font-size: var(--text-4xl); line-height: var(--leading-tight); letter-spacing: var(--tracking-tighter); }
h2 { font-size: var(--text-3xl); line-height: var(--leading-tight); letter-spacing: var(--tracking-tight); }
h3 { font-size: var(--text-xl);  line-height: var(--leading-snug);  letter-spacing: var(--tracking-tight); }
p  { font-size: var(--text-base); line-height: var(--leading-normal); max-width: 68ch; }
```

**The clamp formula.** For a value going from `minPx` at viewport `minVw` to `maxPx` at `maxVw`:

```
slope      = (maxPx - minPx) / (maxVw - minVw)
intercept  = minPx - slope * minVw
preferred  = intercept/16 rem + slope*100 vw
```

Verify one thing after generating any fluid scale: the text must still grow when the user increases
their browser font size. A `clamp()` whose preferred value is pure `vw` ignores user font settings
and is an accessibility failure. Always keep a `rem` term in the preferred value, as above.

**Measure.** 45-75 characters per line for body copy. `max-width: 68ch` is the single highest-value
typographic rule on any content site. Below 45ch the eye jumps lines too often; above 75ch it loses
the return.

**Pairing.** One typeface with a good range beats two mediocre ones. If pairing, contrast the
classification (a geometric sans with a transitional serif), never two of the same class. Match
x-height between paired faces, or the sizes will look wrong at identical `font-size`.

## Spacing and layout grid

```css
:root {
  /* 4px base. Linear at the bottom where precision matters,
     non-linear at the top where it does not. */
  --space-0: 0;
  --space-px: 1px;
  --space-0-5: 0.125rem;  /*  2px  icon nudges, optical alignment */
  --space-1:   0.25rem;   /*  4px  tight inline gaps */
  --space-1-5: 0.375rem;  /*  6px  */
  --space-2:   0.5rem;    /*  8px  inline element gaps */
  --space-3:   0.75rem;   /* 12px  compact padding */
  --space-4:   1rem;      /* 16px  default padding */
  --space-5:   1.25rem;   /* 20px  */
  --space-6:   1.5rem;    /* 24px  card padding */
  --space-8:   2rem;      /* 32px  block separation */
  --space-10:  2.5rem;    /* 40px  */
  --space-12:  3rem;      /* 48px  section internal */
  --space-16:  4rem;      /* 64px  section padding sm */
  --space-20:  5rem;      /* 80px  */
  --space-24:  6rem;      /* 96px  section padding md */
  --space-32:  8rem;      /* 128px section padding lg */

  /* Fluid section rhythm: the single most impactful spacing decision on a marketing page */
  --section-y: clamp(3rem, 2rem + 6vw, 8rem);
  --gutter:    clamp(1rem, 0.5rem + 2.5vw, 2.5rem);
  --measure:   68ch;
  --container: 1200px;
}

.container {
  width: 100%;
  max-width: var(--container);
  margin-inline: auto;
  padding-inline: var(--gutter);
}

/* Content grid: full-bleed children without wrapper gymnastics. */
.prose-grid {
  display: grid;
  grid-template-columns:
    [full-start] minmax(var(--gutter), 1fr)
    [content-start] min(var(--measure), 100% - var(--gutter) * 2) [content-end]
    minmax(var(--gutter), 1fr) [full-end];
}
.prose-grid > * { grid-column: content; }
.prose-grid > .full-bleed { grid-column: full; }
```

Use `gap` rather than margins wherever the parent is a flex or grid container. Margins collapse,
fight each other and require `:last-child` resets; `gap` does none of that.

## Elevation

Elevation is a system of five or six steps, each pairing a shadow with a surface treatment. The
common mistake is treating shadow as a free-form style rather than a scale.

```css
:root {
  /* Two-layer shadows: a tight contact shadow plus a soft ambient one.
     Single-layer shadows are the clearest tell of an unsystematised design. */
  --shadow-1: 0 1px 2px rgb(0 0 0 / 0.05),
              0 1px 3px rgb(0 0 0 / 0.08);
  --shadow-2: 0 2px 4px rgb(0 0 0 / 0.05),
              0 4px 8px rgb(0 0 0 / 0.08);
  --shadow-3: 0 4px 8px rgb(0 0 0 / 0.05),
              0 8px 20px rgb(0 0 0 / 0.10);
  --shadow-4: 0 8px 16px rgb(0 0 0 / 0.06),
              0 16px 40px rgb(0 0 0 / 0.12);
  --shadow-5: 0 16px 32px rgb(0 0 0 / 0.08),
              0 32px 72px rgb(0 0 0 / 0.16);
}

/* Elevation roles, so components reference meaning not step number */
:root {
  --elevation-flat:    none;
  --elevation-raised:  var(--shadow-1);   /* cards at rest */
  --elevation-overlay: var(--shadow-3);   /* dropdowns, popovers */
  --elevation-modal:   var(--shadow-5);   /* dialogs */
}
```

Shadow color should be a very dark version of the surface hue, not pure black. Pure black shadows
on a warm surface read as dirty grey.

```css
/* Better: tint the shadow with the surface hue */
:root { --shadow-color: 258 15% 8%; }
--shadow-2: 0 2px 4px hsl(var(--shadow-color) / 0.06),
            0 4px 8px hsl(var(--shadow-color) / 0.10);
```

## Dark mode

Dark mode is a second palette, not an inverted one. Three things change beyond lightness.

**1. Elevation flips from shadow to light.** On a dark surface a shadow is invisible. Raised
surfaces get lighter, not shadowed.

**2. Chroma must come down.** A saturated color that is comfortable on white vibrates painfully on
near-black. Reduce chroma by roughly 15-25% for accent colors in dark theme.

**3. Never use pure black or pure white.** Pure black (`#000`) against bright text produces halation
that makes text appear to smear for many readers, especially those with astigmatism. Use
`oklch(0.15 0.008 260)` or similar. Pure white text on dark should drop to about `oklch(0.95 0 0)`.

```css
:root {
  color-scheme: light;
  --color-surface:        oklch(1 0 0);
  --color-surface-raised: oklch(1 0 0);
  --color-surface-sunken: oklch(0.97 0.002 260);
  --color-text:           oklch(0.21 0.008 260);
  --color-text-muted:     oklch(0.50 0.010 260);
  --color-border:         oklch(0.90 0.004 260);
  --color-accent:         oklch(0.55 0.19 258);
  --color-accent-hover:   oklch(0.47 0.18 258);
  --color-accent-text:    oklch(0.99 0 0);
  --elevation-raised:     var(--shadow-1);
}

[data-theme="dark"] {
  color-scheme: dark;
  --color-surface:        oklch(0.15 0.008 260);
  --color-surface-raised: oklch(0.20 0.009 260);   /* lighter, not shadowed */
  --color-surface-sunken: oklch(0.12 0.008 260);
  --color-text:           oklch(0.95 0.003 260);   /* not pure white */
  --color-text-muted:     oklch(0.70 0.008 260);
  --color-border:         oklch(0.30 0.010 260);
  --color-accent:         oklch(0.68 0.15 258);    /* lighter, less chroma */
  --color-accent-hover:   oklch(0.75 0.14 258);    /* hover goes lighter in dark */
  --color-accent-text:    oklch(0.15 0.01 260);    /* dark text on light accent */
  --elevation-raised:     none;                     /* replaced by surface lightness */
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;
    /* repeat the dark block, or use :root:not([data-theme]) with a shared custom property set */
  }
}
```

Note that `--color-accent-hover` gets *lighter* in dark mode and *darker* in light mode. Hover
always means "move away from the surface". A dark-mode hover that darkens looks like a disabled
state.

`color-scheme` is not optional. It tells the browser to render form controls, scrollbars and the
default canvas in the matching scheme. Without it you get white scrollbars on a dark page.

**Preventing the flash.** Theme must be resolved before first paint, which means an inline blocking
script in `<head>`, before any stylesheet.

```html
<script>
  (function () {
    try {
      var stored = localStorage.getItem("theme");
      var theme = stored || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      document.documentElement.dataset.theme = theme;
    } catch (e) {}
  })();
</script>
```

This must be inline and synchronous. A deferred script, a React effect or a framework hook all run
after first paint and produce a visible flash.

**Images in dark mode.** Photographs generally need a slight brightness reduction
(`filter: brightness(0.9)`) so they do not glare. Illustrations and logos with transparent
backgrounds often need a separate dark variant; use `<picture>` with a
`media="(prefers-color-scheme: dark)"` source, or a CSS custom property holding the URL.

## Tailwind v4 CSS-first foundation

Tailwind v4 moves configuration into CSS. `@theme` declares tokens that become both CSS custom
properties and utility classes, which removes the old duplication between `tailwind.config.js` and
your token file.

```css
/* app.css */
@import "tailwindcss";

@theme {
  /* Every entry here generates utilities AND a --var. --color-accent gives bg-accent,
     text-accent, border-accent, and var(--color-accent). */
  --color-surface:        oklch(1 0 0);
  --color-surface-raised: oklch(1 0 0);
  --color-text:           oklch(0.21 0.008 260);
  --color-text-muted:     oklch(0.50 0.010 260);
  --color-border:         oklch(0.90 0.004 260);
  --color-accent:         oklch(0.55 0.19 258);
  --color-accent-hover:   oklch(0.47 0.18 258);

  --font-sans:  "Inter var", ui-sans-serif, system-ui, sans-serif;
  --font-mono:  "JetBrains Mono", ui-monospace, monospace;

  --text-base:  clamp(1rem, 0.96rem + 0.20vw, 1.0625rem);
  --text-2xl:   clamp(1.75rem, 1.55rem + 1.00vw, 2.25rem);

  --radius-sm:  2px;
  --radius-md:  4px;
  --radius-lg:  8px;

  --ease-out:   cubic-bezier(0.16, 1, 0.3, 1);
  --duration-fast: 160ms;

  --breakpoint-3xl: 120rem;
}

/* Dark theme overrides the same custom properties. Utilities follow automatically. */
[data-theme="dark"] {
  --color-surface:        oklch(0.15 0.008 260);
  --color-surface-raised: oklch(0.20 0.009 260);
  --color-text:           oklch(0.95 0.003 260);
  --color-text-muted:     oklch(0.70 0.008 260);
  --color-border:         oklch(0.30 0.010 260);
  --color-accent:         oklch(0.68 0.15 258);
  --color-accent-hover:   oklch(0.75 0.14 258);
}

/* Custom utilities participate in variants (hover:, md:, etc) automatically. */
@utility container-page {
  width: 100%;
  max-width: 1200px;
  margin-inline: auto;
  padding-inline: clamp(1rem, 0.5rem + 2.5vw, 2.5rem);
}

@utility text-balance-pretty {
  text-wrap: pretty;
}

/* Component classes belong in a layer so utilities always win over them. */
@layer components {
  .card {
    background: var(--color-surface-raised);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: --spacing(6);
  }
}
```

Notes that catch people out on v4:

- There is no `tailwind.config.js` by default. Content detection is automatic.
- `@theme` values must be static. For runtime-computed values, define a plain custom property
  outside `@theme` and reference it.
- Use `@theme inline` when a token references another custom property that changes at runtime;
  without `inline` the value is captured at build time and theming breaks.
- `@layer components` matters. Without it, a `.card` class can beat a `p-4` utility depending on
  source order, and utility overrides stop working.
- Container queries are built in: `@container` on the parent, `@sm:` variants on children.

## Component API conventions

The API is the part of a component that outlives its implementation. Six rules.

**1. Variants are enumerated, not boolean.**

```ts
// Wrong: 2^4 = 16 combinations, most invalid
type ButtonProps = { primary?: boolean; secondary?: boolean; danger?: boolean; ghost?: boolean };

// Right: one axis, invalid states unrepresentable
type ButtonProps = { variant?: "primary" | "secondary" | "danger" | "ghost" };
```

**2. Use `cva` or `tailwind-variants` so variants are typed and colocated.**

```ts
import { cva, type VariantProps } from "class-variance-authority";

export const button = cva(
  // base
  "inline-flex items-center justify-center gap-2 font-medium " +
  "transition-[transform,background-color,border-color] duration-(--duration-fast) " +
  "ease-(--ease-out) active:translate-y-px " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "disabled:opacity-45 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        primary:   "bg-accent text-white hover:bg-accent-hover",
        secondary: "bg-surface-raised text-text border border-border hover:bg-surface-sunken",
        danger:    "bg-danger text-white hover:bg-danger-hover",
        ghost:     "bg-transparent text-text hover:bg-surface-sunken",
      },
      size: {
        sm: "h-9  px-3 text-sm rounded-(--radius-md)",
        md: "h-11 px-4 text-base rounded-(--radius-md)",
        lg: "h-13 px-6 text-lg rounded-(--radius-lg)",
      },
      full: { true: "w-full" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export type ButtonVariants = VariantProps<typeof button>;
```

**3. Always forward `className` and merge it, never replace.** Use `tailwind-merge` so a consumer's
`px-8` actually beats the variant's `px-4` rather than both landing in the class list.

```ts
import { twMerge } from "tailwind-merge";
import { clsx, type ClassValue } from "clsx";
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
```

**4. Forward the ref and spread the rest of the props.** A component that swallows `aria-*`,
`data-*` and `onKeyDown` is unusable in composition.

```tsx
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, full, asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp ref={ref} className={cn(button({ variant, size, full }), className)} {...props} />;
  }
);
Button.displayName = "Button";
```

**5. Provide `asChild` for anything that might need to be a link.** Radix's `Slot` merges props onto
a single child, so `<Button asChild><Link href="/x">Go</Link></Button>` renders one anchor with
button styling rather than a button wrapping a link (which is invalid HTML and breaks keyboard
behaviour).

**6. Compound components for anything with internal structure.** `<Card><Card.Header/></Card>`
beats twenty props. It lets consumers reorder and omit parts without you predicting every layout.

## shadcn composition without fork chaos

shadcn copies source into your repo. That is the feature and the hazard: the copied files are
yours, and there is no upgrade path.

The workable discipline:

```
components/
  ui/            <- shadcn output. Treat as vendored. Minimal edits, all documented.
  primitives/    <- your wrappers around ui/. Everything else imports from here.
```

```tsx
// components/primitives/button.tsx
// The rest of the app imports from here, never from ui/button directly.
import { Button as Base } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function Button({ className, tone = "brand", ...props }: Props) {
  return (
    <Base
      className={cn(tone === "brand" && "bg-accent hover:bg-accent-hover", className)}
      {...props}
    />
  );
}
```

Rules that keep this from rotting:

- Edits inside `components/ui/` get a comment header stating what changed and why, so a future
  regeneration can be reconciled by reading a diff rather than guessing.
- Never edit `ui/` for styling. Styling changes belong in tokens or in the wrapper.
- Pin the shadcn CLI version in `components.json`. Regenerating one component with a newer CLI can
  pull in a different Radix version than the rest of your components use.
- Run one `tailwind-merge` config across the project. Two different `cn` helpers produce
  inconsistent override behaviour that is very hard to debug.

## Headless primitives and the accessibility contract

Use Radix, Ark, React Aria or Base UI for anything with a focus model: dialogs, menus, comboboxes,
tabs, tooltips, sliders, date pickers. These are not styling libraries; they are implementations of
the WAI-ARIA authoring practices, which take far longer to get right than they appear to.

What you are actually buying:

- Focus trap and restore on dismissible layers
- Roving tabindex for composite widgets
- Typeahead in listboxes and menus
- Correct `aria-*` wiring between trigger, content and label
- Collision-aware positioning that survives scroll containers
- Escape and outside-click dismissal with correct layer ordering
- Screen reader announcements at the right moments

What you still owe:

- Visible focus styling. Headless libraries do not ship focus rings.
- Contrast on every state.
- Motion that respects `prefers-reduced-motion`.
- Sensible `aria-label` text where the visible label is an icon.
- Testing with an actual screen reader.

```tsx
// The contract in practice: styling attaches to data attributes the primitive sets.
<DropdownMenu.Content
  className="min-w-48 rounded-(--radius-md) border border-border bg-surface-raised p-1
             shadow-(--elevation-overlay)
             data-[state=open]:animate-in data-[state=closed]:animate-out
             data-[side=bottom]:slide-in-from-top-1
             data-[side=top]:slide-in-from-bottom-1"
  sideOffset={6}
  collisionPadding={12}
/>
```

Never reimplement a focus trap by hand. It is the single most commonly broken thing in bespoke
component libraries, and every failure mode is invisible to a sighted mouse user.

## Icon systems

An icon set is a system with four decisions: grid, stroke, corner treatment, and delivery.

- **Grid.** Draw on a fixed grid, typically 24x24 with a 20x20 live area (2px padding). Every icon
  aligns to it. Mixed grids produce icons that look different sizes at the same `font-size`.
- **Stroke.** Pick one weight, typically 1.5px or 2px on a 24px grid. Use `stroke-width` with
  `vector-effect: non-scaling-stroke` if icons will be scaled.
- **Optical sizing.** A 16px icon needs a proportionally heavier stroke than the same shape at
  32px, or it disappears. Ship separate 16 and 24 masters rather than scaling one.
- **Delivery.** For under about 40 icons, inline SVG components. Above that, an SVG sprite with
  `<use>` so the markup does not balloon.

```tsx
// Icon component with size-aware stroke and correct accessibility defaults.
export function Icon({ name, size = 20, label, ...props }: IconProps) {
  const stroke = size <= 16 ? 2 : size <= 24 ? 1.75 : 1.5;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      {...props}
    >
      <use href={`/icons/sprite.svg#${name}`} />
    </svg>
  );
}
```

`aria-hidden` when there is no label is the important default. A decorative icon next to a text
label should be silent; announcing "image chevron down" after every menu name is noise.

Icons inherit `currentColor`. Never hardcode a fill in the SVG source; it defeats theming.

## Motion tokens

Motion belongs in the token system for the same reason color does: so it can be retuned globally
and so components stop inventing values.

```css
:root {
  /* primitive */
  --duration-75:  75ms;
  --duration-150: 150ms;
  --duration-250: 250ms;
  --duration-400: 400ms;
  --duration-700: 700ms;

  --ease-linear: linear;
  --ease-out:    cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in:     cubic-bezier(0.7, 0, 0.84, 0);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --ease-spring: linear(0, 0.28 8%, 0.72 18%, 1.02 30%, 1.008 45%, 1);

  /* semantic: components use these, never the primitives */
  --motion-hover:   var(--duration-150) var(--ease-out);
  --motion-enter:   var(--duration-250) var(--ease-out);
  --motion-exit:    var(--duration-150) var(--ease-in);
  --motion-move:    var(--duration-250) var(--ease-in-out);
  --motion-overlay: var(--duration-250) var(--ease-out);
  --motion-spring:  var(--duration-400) var(--ease-spring);
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --duration-75: 1ms; --duration-150: 1ms; --duration-250: 1ms;
    --duration-400: 1ms; --duration-700: 1ms;
  }
}
```

Overriding the durations at the primitive tier means every semantic token, and therefore every
component, honours reduced motion without any component knowing about it. This is the strongest
argument for putting motion in tokens at all.

## Breakpoints and container queries

```css
@theme {
  --breakpoint-sm:  40rem;   /* 640px  large phone landscape */
  --breakpoint-md:  48rem;   /* 768px  tablet portrait */
  --breakpoint-lg:  64rem;   /* 1024px tablet landscape, small laptop */
  --breakpoint-xl:  80rem;   /* 1280px desktop */
  --breakpoint-2xl: 96rem;   /* 1536px large desktop */
}
```

The rule that matters more than the values: **media queries for page layout, container queries for
components.** A card in a sidebar and the same card in a main column are at the same viewport
width but need different layouts. Only container queries can express that.

```css
.card-grid { container-type: inline-size; container-name: cards; }

.card { display: grid; gap: var(--space-4); }

@container cards (min-width: 30rem) {
  .card { grid-template-columns: 8rem 1fr; align-items: start; }
}
@container cards (min-width: 48rem) {
  .card { grid-template-columns: 12rem 1fr auto; }
}
```

Prefer intrinsic layouts over breakpoints wherever possible. `grid-template-columns:
repeat(auto-fit, minmax(16rem, 1fr))` handles more cases correctly than three breakpoints, and has
no arbitrary values to maintain.

## Multi-brand theming

One component set, one semantic token contract, one file per brand.

```css
/* contract.css - the semantic tokens every brand MUST define. */
:root {
  --color-surface: initial;
  --color-surface-raised: initial;
  --color-text: initial;
  --color-text-muted: initial;
  --color-border: initial;
  --color-accent: initial;
  --color-accent-hover: initial;
  --color-accent-text: initial;
  --font-sans: initial;
  --font-display: initial;
  --radius-md: initial;
}

/* brands/acme.css */
[data-brand="acme"] {
  --color-accent:       oklch(0.55 0.19 258);
  --color-accent-hover: oklch(0.47 0.18 258);
  --color-accent-text:  oklch(0.99 0 0);
  --font-display:       "Acme Grotesk", var(--font-sans);
  --radius-md:          4px;
}

/* brands/nova.css */
[data-brand="nova"] {
  --color-accent:       oklch(0.62 0.21 25);
  --color-accent-hover: oklch(0.54 0.20 25);
  --color-accent-text:  oklch(0.99 0 0);
  --font-display:       "Nova Display", var(--font-sans);
  --radius-md:          0px;              /* this brand has square corners */
}
```

Brand and theme are separate axes: `data-brand="nova" data-theme="dark"` must work. Write the dark
overrides per brand, not globally, because each brand's accent needs different dark-mode chroma
reduction.

CI must fail if a brand file omits a token in the contract. A missing token silently falls back to
`initial`, which usually renders as black or transparent and is easy to miss in review.

## Documentation and visual regression

Document three things per component and nothing else: when to use it, when not to, and the props
table. Everything longer goes unread.

```tsx
// Storybook story that doubles as a visual regression fixture.
export const AllVariants = {
  render: () => (
    <div className="grid gap-4 p-6" data-testid="button-matrix">
      {(["primary", "secondary", "danger", "ghost"] as const).map((variant) => (
        <div key={variant} className="flex items-center gap-3">
          {(["sm", "md", "lg"] as const).map((size) => (
            <Button key={size} variant={variant} size={size}>Label</Button>
          ))}
          <Button variant={variant} disabled>Disabled</Button>
        </div>
      ))}
    </div>
  ),
};
```

```ts
// Playwright visual regression across themes and brands.
import { test, expect } from "@playwright/test";

const themes = ["light", "dark"] as const;
const brands = ["acme", "nova"] as const;

for (const theme of themes) {
  for (const brand of brands) {
    test(`button matrix ${brand} ${theme}`, async ({ page }) => {
      await page.goto("/iframe.html?id=button--all-variants");
      await page.evaluate(([t, b]) => {
        document.documentElement.dataset.theme = t;
        document.documentElement.dataset.brand = b;
      }, [theme, brand]);
      // Disable animation so screenshots are deterministic.
      await page.addStyleTag({ content: `*,*::before,*::after{
        animation-duration:0s!important;transition-duration:0s!important}` });
      await expect(page.getByTestId("button-matrix"))
        .toHaveScreenshot(`button-${brand}-${theme}.png`, { maxDiffPixelRatio: 0.01 });
    });
  }
}
```

The theme and brand loop is the point. A design system that is only screenshotted in one theme
regresses in the other one silently.

## Composition

The foundations stack in a fixed order, and getting the order wrong causes most systemic bugs.

```
1. reset / preflight
2. @theme  primitive tokens
3. semantic token layer (light)
4. semantic token overrides (dark, per brand)
5. base element styles (typography, links, focus)
6. @layer components
7. utilities
```

Anything at layer 7 must be able to override anything at layer 6. If a utility cannot beat a
component class, the component class is not in a layer and needs to be.

Conflicts that arise when combining foundations:

- **Fluid type plus container queries.** `clamp()` with `vw` units responds to the viewport, not the
  container, so a card in a narrow sidebar gets viewport-sized text. Use `cqi` units inside
  container-query components instead of `vw`.
- **Dark mode plus elevation.** If `--elevation-raised` still resolves to a shadow in dark theme,
  raised surfaces become invisible. Override the elevation token per theme, not just colors.
- **Multi-brand plus contrast gates.** A new brand's accent may fail contrast against
  `--color-accent-text`. The contrast audit must run per brand in CI, not once.
- **Tailwind `@theme` plus runtime theming.** Values captured in `@theme` are static. Runtime-
  swapped tokens need `@theme inline` or they will not update.
- **Icon `currentColor` plus gradient text.** `background-clip: text` on a parent breaks
  `currentColor` inheritance for child SVGs. Set an explicit color on the icon.

## Performance budget

| Target | Value |
|---|---|
| Token CSS (custom properties only) | under 8KB gzipped |
| Total CSS for a page | under 50KB gzipped |
| Unused CSS ratio | under 10% (measured in Coverage panel) |
| Web font files on first load | 2 maximum |
| Font file size per weight | under 40KB woff2, subset |
| Cumulative layout shift from fonts | 0 |
| Icon sprite | under 20KB for 60 icons |
| Time to first contentful paint impact from CSS | under 100ms |

Levers in order: subset fonts to the characters you use; use `font-display: swap` with a metric-
matched fallback via `size-adjust`; ship one variable font instead of four static weights; purge
unused utilities (automatic in Tailwind v4); avoid `@import` chains that serialise CSS loading.

```css
/* Metric-matched fallback eliminates layout shift on font swap. */
@font-face {
  font-family: "Inter Fallback";
  src: local("Arial");
  size-adjust: 107%;
  ascent-override: 90%;
  descent-override: 22%;
  line-gap-override: 0%;
}
:root { --font-sans: "Inter var", "Inter Fallback", system-ui, sans-serif; }
```

## Accessibility

The foundation layer is where accessibility is won or lost, because every component inherits it.

- Every semantic color pair passes its required ratio, verified in CI, in every theme and brand.
- Focus indicator is defined once at the foundation level and never removed by a component.
- `color-scheme` is set so native controls match the theme.
- Motion tokens collapse under `prefers-reduced-motion` at the primitive tier.
- Type scale keeps a `rem` term so browser font-size settings still work.
- Line length capped at 75ch for body copy.
- Interactive targets are at least 44x44px, defined by the size scale rather than per component.
- Nothing relies on color alone. Error states carry an icon or text, not just red.
- Support 200% browser zoom without horizontal scrolling. Test it; `vw`-heavy layouts often fail.

```css
/* Foundation-level focus. Components must not override this. */
:where(a, button, input, select, textarea, summary, [tabindex]):focus-visible {
  outline: 2px solid var(--color-focus, currentColor);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}
```

`:where()` gives this zero specificity, so components can extend it but it applies everywhere by
default. That is exactly the behaviour you want from a foundation rule.

## Anti-slop rules

1. Never reference a primitive token in component code. Semantic tier only.
2. Never encode a value in a token name. `--color-blue-primary` becomes a lie on the first rebrand.
3. Do not build a color ramp in HSL. Its lightness is not perceptual and your contrast will be
   inconsistent across hues.
4. Do not use constant chroma across a ramp. Chroma must fall at both lightness extremes.
5. Never derive dark mode by inverting light mode. It is a second palette.
6. Never use `#000` as a dark background or `#fff` as dark-mode text. Halation makes text smear.
7. Do not increase shadow opacity for dark-mode elevation. Raise surface lightness instead.
8. No more than 9 steps in a type scale. More means it is not functioning as a system.
9. Never ship a `clamp()` type scale whose preferred value has no `rem` term. It breaks user font
   scaling.
10. Do not set body `max-width` above 75ch or below 45ch.
11. Never use single-layer box-shadows in a system. Two layers minimum: contact plus ambient.
12. Do not tint shadows with pure black on a colored surface. Use a dark version of the surface hue.
13. Never resolve theme in a React effect or deferred script. Inline blocking script in `<head>`.
14. Do not omit `color-scheme`. You will get mismatched scrollbars and form controls.
15. Never use boolean props for mutually exclusive variants.
16. Do not replace a consumer's `className`. Merge it with `tailwind-merge`.
17. Never hand-roll a focus trap, roving tabindex or combobox. Use a headless primitive.
18. Do not hardcode `fill` or `stroke` colors in icon SVG source. Use `currentColor`.
19. Do not scale one icon master across all sizes. Optical sizing requires separate masters.
20. Never put raw durations in components. Use semantic motion tokens.
21. Do not use media queries to make a component responsive. Use container queries.
22. Never edit `components/ui/` for styling reasons. Tokens or wrapper only.
23. Do not run two different `cn`/`tailwind-merge` configurations in one project.
24. Never ship a brand file that omits a contract token. Fail CI on it.
25. Do not screenshot-test one theme only. Loop themes and brands.

## Ship checklist

- [ ] Three token tiers exist and components reference semantic tokens only
- [ ] No token name encodes its own value
- [ ] Color ramps built in OKLCH with a falling chroma curve at both ends
- [ ] Chroma stays under the sRGB ceiling for each hue; no silent clipping
- [ ] Every semantic color pair has a computed contrast ratio recorded
- [ ] Contrast audit runs in CI for every theme and every brand
- [ ] Dark theme is an independently authored palette, not an inversion
- [ ] Dark theme reduces accent chroma and avoids pure black and pure white
- [ ] Elevation token overridden per theme; dark mode uses surface lightness
- [ ] Shadows are two-layer and tinted with the surface hue
- [ ] Type scale has 9 or fewer steps and every `clamp()` keeps a `rem` term
- [ ] Body copy capped between 45ch and 75ch
- [ ] Leading and tracking vary by size, not fixed globally
- [ ] Spacing scale includes sub-4px values for optical alignment
- [ ] Theme resolved by an inline blocking script; no flash on reload
- [ ] `color-scheme` set on both themes
- [ ] Motion tokens defined semantically and collapsed at the primitive tier under reduced motion
- [ ] Foundation-level `:focus-visible` rule present, using `:where()` for zero specificity
- [ ] No component removes the focus indicator
- [ ] Components use enumerated variants via `cva` or `tailwind-variants`
- [ ] All components forward refs, merge `className`, and spread remaining props
- [ ] `asChild` available on anything that may render as a link
- [ ] Headless primitives used for every widget with a focus model
- [ ] Icons inherit `currentColor` and are `aria-hidden` when decorative
- [ ] Separate icon masters for 16px and 24px
- [ ] Container queries used for component responsiveness; media queries for page layout
- [ ] Brand contract enforced in CI; missing tokens fail the build
- [ ] Visual regression suite loops every theme and brand combination
- [ ] Fonts subset, metric-matched fallback defined, CLS from font swap is 0
- [ ] Page renders correctly at 200% browser zoom with no horizontal scroll
