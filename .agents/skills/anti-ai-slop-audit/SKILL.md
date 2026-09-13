---
name: anti-ai-slop-audit
description: "Use when auditing a frontend for AI-generated tells: the specific visual patterns, layout cliches, and motion defaults that mark code as LLM-generated, with a scoring rubric and prescribed fixes."
---

# Anti-AI-Slop Audit

## When to use this
- You are reviewing a site or component and suspect it was AI-generated and needs to look like it was not.
- You just generated a UI with an LLM and want to check it against the tell list before shipping.
- You need a structured rubric to score a frontend for "does this look like a template" and specific fixes.
- You are building a design review checklist for a team that uses AI code generation.
- Do NOT use this when you need a general interface critique framework; use `design-critique-rubric` instead.

## Mental model
AI-generated frontends have a convergent aesthetic. This is not because LLMs lack taste; it is because they reproduce the statistical center of their training data. The statistical center of web UI is: centered layouts, purple-blue gradients, uniform border-radius, fade-up-on-scroll for every element, three-card grids, emoji icons, and shadows on everything.

The tell is not any single one of these. It is the combination. A site with rounded corners is fine. A site with rounded corners AND a purple-blue gradient AND a three-card grid AND a fade-up AND default shadows AND centered everything is recognizably AI-generated to anyone who has seen more than five of them.

The fix is not replacing each cliche with a different cliche. It is making design decisions. A decision is: "this element has sharp corners because the brand is industrial" or "this card grid has 4 columns because the content has 4 items, not 3." The absence of decisions is the tell. Every element looking the same means no element was actually designed.

The audit works by counting tells. Each tell is 1 point. A score of 0-2 is fine (coincidence). 3-5 is suspicious. 6+ is obviously AI-generated. The fixes target root causes: if 6 tells fire, fixing all 6 cosmetically just produces a different-flavored template. Fix the 2-3 root causes (usually: "everything has the same treatment" and "no hierarchy") and the surface tells resolve themselves.

## Setup
No dependencies. This is a manual audit process with a checklist.

For automated detection in CI, you can lint for some patterns:
```bash
# Check for default Tailwind purple-blue gradients
grep -rn "from-purple.*to-blue\|from-blue.*to-purple\|from-indigo.*to-purple" src/
# Check for uniform rounded-lg on everything
grep -c "rounded-lg\|rounded-xl\|rounded-2xl" src/**/*.tsx | awk -F: '{sum+=$2} END {print sum " rounded elements"}'
```

## Core API
| Tell | What to look for | Weight |
|---|---|---|
| Centered everything | Every text block is `text-center`. No left-aligned body text. | 1 |
| Purple-blue gradient | `bg-gradient-to-r from-purple-* to-blue-*` or similar. | 1 |
| Uniform border-radius | Every card, button, and input has the same `rounded-xl` or `rounded-2xl`. | 1 |
| Generic emoji icons | Emoji used as feature icons (the rocket, the sparkle, the lightning bolt). | 1 |
| Three-card grid | Exactly 3 feature cards in a row, equal size, identical layout. | 1 |
| One fade-up everywhere | Every element uses the same `animate-fade-up` or `opacity-0 translate-y-4` entrance. | 1 |
| Default shadows | `shadow-lg` or `shadow-xl` on cards with no other elevation treatment. | 1 |
| Lorem-shaped copy | Placeholder-length text that says nothing specific. "Unlock the power of..." | 1 |
| Perfect symmetry | Left and right sides mirror each other with no variation. | 1 |
| Glassmorphism | `backdrop-blur` + semi-transparent background on cards. | 1 |
| Hero blob/mesh gradient | Abstract gradient blobs or mesh gradients as background decoration. | 1 |
| Generic stock photography | Unsplash-style photos of people in offices, laptops, or coffee shops. | 1 |

## Recipes

### 1. Full audit walkthrough
Score a page section by section, report tells.
```
AUDIT: [project name] - [page]
Date: YYYY-MM-DD

SECTION: Hero
- [ ] Centered text: YES/NO
- [ ] Gradient background: YES/NO (describe)
- [ ] Generic copy: YES/NO (quote the worst line)
- [ ] Blob/mesh decoration: YES/NO
- Section score: _/4

SECTION: Features
- [ ] Three-card grid: YES/NO (how many cards?)
- [ ] Uniform radius: YES/NO (what radius?)
- [ ] Emoji icons: YES/NO (which ones?)
- [ ] Identical card layout: YES/NO
- [ ] Uniform fade-up: YES/NO
- [ ] Default shadows: YES/NO
- Section score: _/6

SECTION: Social proof / testimonials
- [ ] Perfect symmetry: YES/NO
- [ ] Generic stock photos: YES/NO
- [ ] Lorem-shaped copy: YES/NO
- Section score: _/3

SECTION: Footer / CTA
- [ ] Glassmorphism: YES/NO
- [ ] Purple-blue gradient: YES/NO
- [ ] Centered everything: YES/NO
- Section score: _/3

TOTAL: _/16

VERDICT:
0-2: Clean. Ship it.
3-5: Suspicious. Fix the root patterns.
6-8: Obviously generated. Redesign, do not patch.
9+: Scrap and start from design intent, not code generation.
```

### 2. Fix: replace centered text with left-aligned hierarchy
Root cause: no alignment decision was made, so the LLM defaulted to center.
```css
/* BEFORE (AI-generated) */
.hero {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* AFTER (designed) */
.hero {
  text-align: left;
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: end;
  gap: 2rem;
  padding: 4rem;
}

.hero h1 {
  grid-column: 1 / -1; /* headline spans full width */
  font-size: clamp(3rem, 6vw, 6rem);
  max-width: 18ch;
}

.hero p {
  max-width: 45ch; /* constrained to one column */
}
```

### 3. Fix: break the three-card grid
Root cause: 3 is the default LLM choice because it fits a `grid-cols-3` layout.
```css
/* BEFORE: three identical cards in a row */
.features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; }

/* AFTER: content-driven asymmetric layout */
.features {
  display: grid;
  grid-template-columns: 2fr 1fr;
  grid-template-rows: auto auto;
  gap: 1rem;
}

.features .feature-primary {
  grid-row: 1 / 3; /* primary feature spans two rows */
  padding: 3rem;
  background: var(--color-surface-raised);
}

.features .feature-secondary {
  padding: 2rem;
  border: 1px solid var(--color-border);
}
```

### 4. Fix: differentiate motion per element role
Root cause: one animation applied to everything means no motion hierarchy.
```js
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

/* Headlines: clip reveal (dramatic, draws the eye) */
gsap.from('.section-heading', {
  clipPath: 'inset(0 100% 0 0)',
  duration: 0.8,
  ease: 'power3.inOut',
  scrollTrigger: { trigger: '.section-heading', start: 'top 80%' }
});

/* Body text: simple fade, no movement (understated) */
gsap.from('.section-body', {
  opacity: 0,
  duration: 0.5,
  delay: 0.2,
  scrollTrigger: { trigger: '.section-body', start: 'top 80%' }
});

/* Cards: stagger from left (directional, purposeful) */
gsap.from('.card', {
  x: -30,
  opacity: 0,
  duration: 0.5,
  stagger: 0.1,
  ease: 'power2.out',
  scrollTrigger: { trigger: '.cards-container', start: 'top 75%' }
});

/* Images: scale up from center (reveals content) */
gsap.from('.section-image', {
  scale: 0.9,
  opacity: 0,
  duration: 0.7,
  ease: 'power2.out',
  scrollTrigger: { trigger: '.section-image', start: 'top 80%' }
});
```

### 5. Fix: intentional radius variation
Root cause: one `rounded-xl` on everything means radius was never decided per element.
```css
/* Buttons: slight radius (functional, not decorative) */
button { border-radius: 4px; }

/* Cards: no radius (sharp, editorial) */
.card { border-radius: 0; }

/* Avatars: full circle (convention for people) */
.avatar { border-radius: 50%; }

/* Input fields: minimal radius (form convention) */
input, select { border-radius: 2px; }

/* Hero image: asymmetric radius (deliberate, unusual) */
.hero-image { border-radius: 0 24px 0 0; }

/* Tags/pills: full radius (convention for small inline elements) */
.tag { border-radius: 9999px; }
```

### 6. Fix: replace emoji icons with purposeful alternatives
Root cause: LLMs reach for emoji because they are zero-dependency and universally available.
```html
<!-- BEFORE (AI-generated) -->
<div class="feature">
  <span class="text-4xl">⚡</span>
  <h3>Lightning Fast</h3>
</div>

<!-- AFTER: option 1 - no icon at all, type hierarchy does the work -->
<div class="feature">
  <span class="feature-number">01</span>
  <h3>Response time under 50ms</h3>
</div>

<!-- AFTER: option 2 - inline SVG icon from a coherent icon set -->
<div class="feature">
  <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
  </svg>
  <h3>Response time under 50ms</h3>
</div>
```
```css
.feature-number {
  font-family: monospace;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  letter-spacing: 0.05em;
}

.icon {
  width: 24px;
  height: 24px;
}
```

### 7. Fix: replace default shadows with intentional elevation
Root cause: `shadow-lg` is the LLM's way of making something look elevated without deciding how.
```css
/* BEFORE */
.card { box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1); border-radius: 12px; }

/* AFTER: option 1 - border only (flat, editorial) */
.card {
  border: 1px solid var(--color-border);
  box-shadow: none;
}

/* AFTER: option 2 - subtle, tight shadow (functional, not decorative) */
.card {
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.05);
}

/* AFTER: option 3 - hard offset shadow (neo-brutalist, intentional) */
.card {
  border: 2px solid #000;
  box-shadow: 4px 4px 0 #000;
}

/* AFTER: option 4 - no shadow, elevation via background tint */
.card {
  background: var(--color-surface-raised);
  box-shadow: none;
}
```

## Tuning the feel
The audit is a detection tool, not a style guide. The fixes should be driven by the project's design intent. A marketing site for a developer tool has different correct answers than a fashion brand portfolio. The common thread is that every choice should be traceable to a reason.

Severity weighting: gradient and emoji tells are the strongest signals of AI generation (almost no human designer reaches for a purple-blue gradient as a first choice in 2024-2025). Centered text and default shadows are weaker signals because plenty of human-designed sites use them. Weight your concern accordingly.

The "three-card grid" tell is about the number being unconsidered, not about three being wrong. If you have three features, show three cards. But make them different sizes, or use a list instead, or lead with one and follow with two. The tell is three identical cards at identical size with identical treatment.

## Performance
This skill has no performance implications; it is a design audit process.

## Accessibility
AI-generated UIs often score well on automated accessibility tests (axe, Lighthouse) because LLMs include `alt` text, `aria-label`, and semantic HTML. The accessibility failures in AI-generated UIs are subtler: wrong heading hierarchy (skipping levels), `aria-label` that duplicates visible text, and `role="button"` on elements that should be `<a>`. Check these manually during the audit.

## Anti-slop rules
- Never "fix" AI-generated UI by swapping one set of cliches for another. Replacing purple-blue with green-teal is not a fix; making a color decision based on the brand is.
- Never apply the same fix to every element. If the problem is "everything looks the same," the fix is differentiation, not a uniform replacement.
- Never use this rubric to reject all AI-generated code. Some AI-generated code is structurally correct and only needs visual differentiation. Rewriting correct layout code to avoid the aesthetic is waste.
- Never assume that a high score means the design is bad in all contexts. A prototype or MVP that scores 8/16 but ships and gathers user feedback is more valuable than a polished site that never launches.
- Never fix the tells without understanding the content. A three-card grid is correct if the content has three equal items. The fix is only needed when the layout was chosen because the LLM defaults to three, not because the content demands it.
- Never claim "I fixed the AI slop" and then add a different AI-generated pattern (e.g., replacing a gradient blob with a different decorative flourish generated by AI). Fix by subtraction and decision, not by adding more generated elements.

## Checklist
- [ ] Every text alignment is traceable to a layout decision (not all `text-center`).
- [ ] No purple-blue gradient unless the brand colors are actually purple and blue.
- [ ] Border-radius varies by element role (buttons, cards, avatars, inputs each have a considered radius).
- [ ] Icons are from a coherent set or replaced with type/number hierarchy.
- [ ] Card grid column count matches content structure, not a default.
- [ ] Scroll animations vary by element role (headings, body, images, cards each animate differently or not at all).
- [ ] Shadows are either removed entirely or intentionally minimal/stylized.
- [ ] Copy is specific to the product, not generic value-prop placeholder language.
- [ ] At least one element breaks the symmetry of the page.
- [ ] The page looks different from the first 5 results of "modern landing page template."
