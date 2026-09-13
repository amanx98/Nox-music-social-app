# Anti-AI-Slop Audit -- Reference

## Extended tell list (beyond the core 12)

| Tell | Description | Prevalence |
|---|---|---|
| "Trusted by" logo bar | A row of gray company logos, often fake or aspirational. | Very high |
| Pricing table with 3 tiers | Free / Pro / Enterprise in identical card layouts. | Very high |
| "How it works" 3-step | Step 1, Step 2, Step 3 with numbered circles. | High |
| Testimonial cards with star ratings | 3 testimonials, each with 5 stars, stock avatar. | High |
| Floating nav with blur | `backdrop-blur` navbar that appears on scroll. | High |
| CTA button with gradient | `bg-gradient-to-r` on the primary call-to-action. | High |
| "AI-powered" badge | A sparkle icon with "AI-powered" or "Powered by AI" text. | Very high (2024+) |
| Dark mode toggle in header | A sun/moon icon toggle, often non-functional. | High |
| Animated counter ("1000+ users") | Numbers that count up on scroll to an impressive-looking total. | Medium |
| Bento grid with gradients | 2x3 or 3x3 grid with gradient-filled cells. | Medium (2024+) |

## Root cause taxonomy

Most AI-generated tells trace to 3 root causes:

**1. No hierarchy.** Every element has the same visual treatment (same radius, same shadow, same animation, same size). Fix: establish a clear primary/secondary/tertiary ranking. The primary element is larger, bolder, or positioned differently. Secondary elements are smaller or more restrained. Tertiary elements are minimal.

**2. No alignment system.** Everything is centered because center alignment requires no decision about where on the horizontal axis something should sit. Fix: use a grid with explicit column placement. Left-align body text. Allow elements to sit in different horizontal positions.

**3. No content awareness.** The layout was chosen before the content existed (or the content is placeholder). A three-card grid for four features. A hero headline that says "The future of X." Fix: start with the actual content and let it dictate the layout. If you have 7 features, show 7 features in a layout that serves 7 items, not 3+3+1.

## Gotchas

1. **Some AI tells are also legitimate design patterns.** A three-column feature grid is a perfectly valid layout when the content genuinely has three features. The tell is when the layout choice has no relationship to the content.
2. **Fixing too aggressively can produce worse results.** Replacing every standard pattern with something unusual makes the site feel over-designed. Fix 2-3 root causes, not every surface symptom.
3. **The audit is biased toward 2024-2025 AI aesthetics.** The tell list will evolve as LLMs' training data shifts. Revisit annually.
4. **This audit does not apply to design systems or component libraries.** A button with `rounded-lg` and `shadow-sm` is fine as a reusable component. The tells apply to page-level composition, not component-level styling.

## Additional recipes

### Automated Tailwind class analysis
Count pattern frequency in a codebase to identify uniform application.
```bash
#!/bin/bash
echo "=== AI Slop Detector ==="
echo ""
echo "Gradient tells:"
grep -rn "from-purple\|from-indigo\|from-violet" --include="*.tsx" --include="*.jsx" src/ | head -5
echo ""
echo "Uniform radius (most common):"
grep -oh "rounded-[a-z0-9]*" --include="*.tsx" --include="*.jsx" -r src/ | sort | uniq -c | sort -rn | head -5
echo ""
echo "Shadow usage:"
grep -oh "shadow-[a-z0-9]*" --include="*.tsx" --include="*.jsx" -r src/ | sort | uniq -c | sort -rn | head -5
echo ""
echo "Center alignment count:"
grep -c "text-center\|items-center\|justify-center" --include="*.tsx" --include="*.jsx" -r src/ | awk -F: '{sum+=$2} END {print sum " centering utilities"}'
echo ""
echo "Emoji in JSX:"
grep -rn "[\x{1F300}-\x{1F9FF}]" --include="*.tsx" --include="*.jsx" src/ | head -5
```

### Side-by-side comparison template
For presenting before/after to stakeholders.
```html
<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; padding: 2rem;">
  <div>
    <h3 style="font-family: monospace; font-size: 0.875rem; margin-bottom: 1rem; color: #e11d48;">
      BEFORE (Score: 9/16)
    </h3>
    <img src="screenshot-before.png" alt="Before: AI-generated layout" style="width: 100%; border: 1px solid #e5e5e5;">
    <ul style="font-family: monospace; font-size: 0.75rem; margin-top: 1rem; line-height: 1.8;">
      <li>Centered everything</li>
      <li>Purple-blue gradient hero</li>
      <li>3-card feature grid, identical cards</li>
      <li>Emoji icons</li>
      <li>Uniform rounded-xl</li>
      <li>fade-up on every element</li>
      <li>shadow-lg on all cards</li>
      <li>Generic copy</li>
      <li>Glassmorphism navbar</li>
    </ul>
  </div>
  <div>
    <h3 style="font-family: monospace; font-size: 0.875rem; margin-bottom: 1rem; color: #16a34a;">
      AFTER (Score: 1/16)
    </h3>
    <img src="screenshot-after.png" alt="After: designed layout" style="width: 100%; border: 1px solid #e5e5e5;">
    <ul style="font-family: monospace; font-size: 0.75rem; margin-top: 1rem; line-height: 1.8;">
      <li>Left-aligned hierarchy with grid</li>
      <li>Brand color palette, no gradient</li>
      <li>Asymmetric feature layout (2+1)</li>
      <li>Numbered items, no icons</li>
      <li>Varied radius by element role</li>
      <li>Differentiated motion per element type</li>
      <li>Borders only, no shadows</li>
      <li>Specific product copy</li>
      <li>Solid background navbar</li>
    </ul>
  </div>
</div>
```
