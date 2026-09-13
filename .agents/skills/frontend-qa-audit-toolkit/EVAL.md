---
name: frontend-qa-audit-toolkit-eval
description: Use when verifying that a frontend QA audit was actually performed rather than asserted. Audits the audit - evidence, coverage, throttling, and whether findings are root-cause.
pairs_with: frontend-qa-audit-toolkit
---

# Eval: Frontend QA Audit

## What this audits

An audit is itself a deliverable and fails in predictable ways. The dominant failure is an audit
performed entirely on the author's machine at full speed, in one browser, in one theme, at one
viewport, reporting a clean bill of health. The second is an audit that lists symptoms
("the page feels janky", "contrast could be better") without the measurement that makes a finding
actionable. The third is a clean axe run presented as accessibility compliance.

This eval scores the audit, not the site. An audit that correctly finds thirty problems scores
higher than one that finds none.

## Evidence required

- The audit report itself
- The raw artifacts it claims to be based on: Lighthouse JSON, axe output, Performance trace files,
  screenshots, Playwright report
- The CI configuration, to confirm gates exist rather than being described
- The site under audit, so a sample of findings can be independently reproduced
- Confirmation of the conditions each measurement was taken under: CPU throttle, network profile,
  browser, viewport, theme

## Automated checks

```bash
REPORT="$1"

echo "== 1. throttling stated =="
grep -inE "4x|6x|cpu throttl|slow 4g|slow 3g|throttl" "$REPORT"
# PASS: performance findings explicitly state throttle conditions. FAIL: no mention.

echo "== 2. browser coverage =="
grep -oinE "safari|firefox|webkit|gecko|chromium|chrome|edge" "$REPORT" | sort -u
# PASS: at least Chromium plus Safari/WebKit plus Firefox. FAIL: Chromium only.

echo "== 3. viewport coverage =="
grep -oE "\b(320|375|390|428|768|1024|1280|1440|1920|2560)\b" "$REPORT" | sort -un | wc -l
# PASS: >= 6 distinct widths. FAIL: under 3.

echo "== 4. theme coverage =="
grep -icE "dark (mode|theme)" "$REPORT"
# PASS: >= 1 and findings are reported per theme. FAIL: 0.

echo "== 5. measurements not adjectives =="
grep -icE "[0-9]+(\.[0-9]+)? ?(ms|s\b|kb|mb|fps|:1|%)" "$REPORT"
grep -icE "feels (slow|janky|fast)|seems (fine|ok|good)|looks (good|fine)|should be (fine|ok)" "$REPORT"
# PASS: many numeric hits, zero subjective hits.

echo "== 6. axe presented as sufficient =="
grep -inE "axe (passed|clean|shows no)|no (accessibility|a11y) (issues|violations)" "$REPORT" \
  | grep -viE "manual|keyboard|screen reader"
# PASS: no output. An axe-only accessibility conclusion is invalid.

echo "== 7. manual a11y steps evidenced =="
grep -icE "tab(bed)? through|keyboard (pass|navigation)|screen reader|voiceover|nvda|focus (order|trap)"
# PASS: >= 3 distinct manual steps described with outcomes.

echo "== 8. reduced motion actually tested =="
grep -inE "prefers-reduced-motion|reduced motion" "$REPORT"
grep -inE "os setting|system setting|emulat" "$REPORT"
# PASS: reduced motion tested AND the method stated. FAIL: mentioned only as a code grep.

echo "== 9. root-cause fixes, not cosmetic =="
grep -icE "translatez\(0\)|will-change: transform.*fix|add gpu|force layer" "$REPORT"
# PASS: 0. These are cargo-cult fixes, not diagnoses.

echo "== 10. findings carry locations =="
grep -cE "\.(tsx?|jsx?|css|scss|html):[0-9]+|selector|#[a-z-]+|\.[a-z][a-z0-9-]+" "$REPORT"
# PASS: most findings name a file, line or selector.

echo "== 11. CI gates real =="
ls .github/workflows/*.yml 2>/dev/null && grep -lE "lhci|axe|playwright|toHaveScreenshot" .github/workflows/*.yml
# PASS: gates exist in config. FAIL: described in the report but absent from the repo.

echo "== 12. artifacts exist =="
ls -la lighthouse*.json .lighthouseci/ playwright-report/ test-results/ *.trace* 2>/dev/null | head -20
# PASS: raw artifacts present and dated consistently with the report.
```

```js
// Reproduce a sample of the audit's claims independently.

// V1: does the reported LCP element match reality?
new PerformanceObserver(l => {
  const e = l.getEntries().at(-1);
  console.log("actual LCP", Math.round(e.startTime), "ms element:", e.element);
}).observe({ type: "largest-contentful-paint", buffered: true });
// Compare to the report. A mismatch means the audit measured a different page state.

// V2: recount axe violations rather than trusting the number.
// (with axe-core injected)
axe.run({ runOnly: ["wcag2a","wcag2aa","wcag21aa","wcag22aa"] })
   .then(r => console.log("violations:", r.violations.length,
        r.violations.map(v => `${v.impact}:${v.id}(${v.nodes.length})`)));

// V3: recount contrast failures independently of the report.
// (use the contrast sweep from the toolkit's accessibility section)

// V4: confirm the reduced-motion path does not blank content.
// Emulate reduced motion, reload, then:
(() => {
  const hidden = [...document.querySelectorAll("body *")].filter(el => {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") return false;
    const r = el.getBoundingClientRect();
    return r.width > 40 && r.height > 20 && parseFloat(cs.opacity) < 0.1;
  });
  console.log("content invisible under reduced motion:", hidden.length);
})();
// If this returns a nonzero count and the audit reported reduced motion as passing,
// the audit did not actually enable the setting.
```

## Manual inspection protocol

1. Pick three findings at random and reproduce them. FAIL if any cannot be reproduced as described.
2. Pick three areas the audit reported as clean and test them yourself. FAIL if you find a
   violation the audit missed in an area it claimed to cover.
3. Check whether performance numbers state their conditions. FAIL if any performance claim has no
   throttle profile attached.
4. Check whether the audit ran in Safari. FAIL if not, on any site using sticky positioning,
   `backdrop-filter`, `dvh` units or View Transitions.
5. Check the accessibility section for manual steps with outcomes. FAIL if it is only tool output.
6. Check whether reduced motion was tested by enabling the setting, not by reading CSS. FAIL if the
   method is not stated.
7. Check whether every finding names a root cause. FAIL if fixes are cosmetic (adding
   `translateZ(0)`, bumping z-index, adding ARIA to fix a semantics problem).
8. Check whether the slop audit is structural. FAIL if it is a discussion of colour choices.
9. Check severity assignment. FAIL if a keyboard trap and a spacing inconsistency carry the same
   weight.
10. Check whether the audit states what it did not cover. FAIL if it implies total coverage.
11. Check the visual regression baselines' generation date against the last design change. FAIL if
    baselines predate known changes, meaning they locked in the old state.
12. Check whether any test was skipped or quarantined to make CI green. FAIL if skips exist without
    linked issues.

## Scoring rubric

| # | Criterion | Weight | 0 | 1 | 2 |
|---|---|---:|---|---|---|
| 1 | Measurement conditions stated | 12 | No conditions given | Some findings state them | Every performance claim carries throttle, network, browser, viewport |
| 2 | Browser coverage | 10 | Chromium only | Two engines | Chromium, WebKit and Gecko, with engine-specific findings reported |
| 3 | Viewport and zoom coverage | 8 | One or two widths | Several widths, no zoom | 6+ widths plus 200% and 400% zoom |
| 4 | Theme coverage | 6 | One theme | Both themes, findings not separated | Both themes with per-theme findings |
| 5 | Accessibility method | 12 | Tool output only | Tool plus partial keyboard pass | Tool, full keyboard pass, screen reader, reduced motion via OS setting, each with outcomes |
| 6 | Findings are measured, not felt | 10 | Subjective language throughout | Mixed | Every finding carries a number or a reproducible condition |
| 7 | Root-cause diagnosis | 10 | Cosmetic fixes proposed | Correct causes, vague fixes | Cause identified in the trace or source, with the specific fix |
| 8 | Findings are locatable | 8 | No locations | Some | Every finding names a file, line, selector or DevTools location |
| 9 | Slop audit is structural | 6 | Colour and taste commentary | Some structural tells | Layout variance, animation uniformity, component repetition and content specificity all assessed |
| 10 | Severity discrimination | 8 | Flat list | Some prioritisation | Blocking vs non-blocking clearly separated and correctly assigned |
| 11 | Coverage honesty | 8 | Implies total coverage | Partial acknowledgement | Explicit "not covered" section |
| 12 | Enforcement in CI | 10 | None | Described but not present in config | Gates present and running, failures surface artifacts |

**Total: 108 points. Ship threshold: 81 (75%). Any 0 in criteria 1, 5 or 12 is an automatic NO SHIP.**

## Common false passes

1. **The "everything passes" audit.** Zero findings on a real production site. Either the audit
   covered almost nothing or it was performed at full speed in one browser. A genuinely clean site
   is rare; a clean audit usually means an absent one. Reproduce three "clean" areas yourself.

2. **The "Lighthouse 98" pass.** A high score presented as evidence of quality. Lighthouse's
   accessibility audit only covers automatable rules and its performance number comes from a
   simulated throttle on a single cold load. It says nothing about keyboard traps, reading order,
   or jank during interaction.

3. **The "axe clean" accessibility pass.** Zero violations reported, presented as compliance. Axe
   catches roughly 30-40% of real issues. It cannot detect a keyboard trap, an illogical focus
   order, a meaningless alt text that is technically present, or content that only makes sense
   visually. Require the manual protocol.

4. **The "we tested mobile" pass.** The audit lists a 390px viewport. It was run on a desktop CPU
   at 390px width. Mid-range mobile is a CPU problem, not a width problem. Require the throttle
   profile alongside the viewport.

5. **The "reduced motion supported" pass.** The audit greps for `prefers-reduced-motion`, finds the
   CSS block, and passes it. The JS-driven scroll reveals are unguarded and leave the page blank
   with the setting on. Require that the setting was actually enabled and the page reloaded.

6. **The "no jank" pass from watching it.** Smooth on a 120Hz display with a fast GPU. The frame
   budget on the target device is exceeded by 3x. Require a recorded trace with a dropped-frame
   percentage.

7. **The "fixed the jank" pass with a cargo-cult fix.** `translateZ(0)` added, jank appears
   reduced on the dev machine, root cause (a forced reflow in the scroll handler) untouched.
   Require the flame chart evidence for the diagnosis, not just the outcome.

8. **The "visual regression covered" pass with stale baselines.** The suite is green because the
   baselines were regenerated after the bug was introduced. Check baseline dates against the commit
   history.

9. **The "slop audit done" pass that is a colour opinion.** Two paragraphs on the palette, nothing
   on the fact that seven sections share one layout and one animation treatment covers 40 elements.
   Require the structural counts.

10. **The "CI enforces this" pass with the gate described only in the report.** The workflow file
    has no Lighthouse or axe step, or the step exists with `continue-on-error: true`. Read the
    workflow, not the report.

## Required fixes by failure mode

| Failure | Root cause | Fix |
|---|---|---|
| No findings on a real site | Audit run at full speed, one browser | Re-run with 4x CPU, Slow 4G, across three engines |
| Performance claims without conditions | Conditions not recorded | Add throttle, network, browser, viewport to every measurement |
| Accessibility from tooling only | Manual protocol skipped | Run the keyboard, screen reader and reduced-motion passes and record outcomes |
| Reduced motion falsely passing | Verified by code reading | Enable the OS setting, reload, run the invisible-content check |
| Cosmetic performance fixes | Diagnosis skipped | Record a trace, identify the widest block, fix that |
| Findings not reproducible | No location or condition captured | Add file, line or selector plus the exact reproduction steps |
| Flat severity | No triage step | Separate blocking from non-blocking; keyboard traps and contrast failures are always blocking |
| Stale visual baselines | Regenerated after a regression | Regenerate only after all other audit stages pass; check dates against commits |
| Slop audit is taste | Structural checks not run | Run the layout-signature and animation-uniformity scripts and report counts |
| CI gate absent | Report describes intent | Add the workflow steps; remove `continue-on-error` |

## Verdict format

```
AUDIT UNDER REVIEW: <path or title>
SCORE: <n>/108 (<pct>%)

CONDITIONS DECLARED BY THE AUDIT
| dimension | declared | adequate? |
| CPU throttle | | |
| Network | | |
| Browsers | | |
| Viewports | | |
| Themes | | |

| # | Criterion | Band | Evidence |
|---|---|---|---|
... all 12 rows ...

REPRODUCTION SAMPLE
| finding | reproduced? | note |
| <3 findings the audit reported> | | |
| <3 areas the audit called clean> | | |

AUTOMATIC FAILURES: <criteria 1, 5, 12 scoring 0, or "none">

BLOCKING ISSUES
1. <what the audit missed or misstated> - <evidence> - <required fix>

SHIP
```
or
```
NO SHIP
```
