---
name: app-ui-surfaces-toolkit-eval
description: "Use when verifying that app-ui-surfaces-toolkit was actually implemented correctly. Adversarial audit for dashboards, data tables, forms, modals, toasts, command-K, kanban, calendars, uploads, chat, settings, onboarding, empty states, skeletons, virtualized lists, filters, inline edit, notifications, and charts."
pairs_with: app-ui-surfaces-toolkit
---

# Eval: Application UI Surfaces

## What this audits

The most common shipped failure: surfaces that look complete in a demo screenshot but break under real interaction. Data tables that do not sort or paginate. Forms that show all errors on mount. Modals that leak focus to the page behind. Toasts that stack infinitely. Filters that reset on refresh. Chat that auto-scrolls when the user is reading history. Empty states that are blank pages. Skeletons that do not match content shape. Lists that render 10k DOM nodes.

## Evidence required

Before scoring, the auditor must actually open or run:
1. The rendered page at 1440px, 768px, and 375px viewports.
2. DevTools Elements panel: count DOM nodes on a data-heavy view.
3. DevTools Network panel: measure JS bundle size per route (gzipped).
4. DevTools Performance panel: record a Lighthouse trace for FCP and INP.
5. Computed styles on at least 3 numeric elements (check for `font-variant-numeric: tabular-nums`).
6. Keyboard-only navigation through the full page (Tab, Shift+Tab, Enter, Escape, Arrow keys).
7. Screen reader output on at least: data table headers, dialog open/close, toast announcement.
8. `prefers-reduced-motion: reduce` emulation in DevTools: verify all animation stops.

## Automated checks

```js
// 1. Tabular numerics
const numerics = document.querySelectorAll('[class*="tabular"], [class*="font-mono"], [style*="tnum"]');
const allNumerics = document.querySelectorAll('td, [data-stat], [data-value]');
const numericCells = [...allNumerics].filter(el => /^\$?[\d,.\-+%]+$/.test(el.textContent.trim()));
const missingTabular = numericCells.filter(el => {
  const cs = getComputedStyle(el);
  return !cs.fontVariantNumeric.includes('tabular') && !cs.fontFamily.includes('mono');
});
console.assert(missingTabular.length === 0, `FAIL: ${missingTabular.length} numeric cells lack tabular-nums`);

// 2. DOM node count
const nodeCount = document.querySelectorAll('*').length;
console.assert(nodeCount < 1500, `FAIL: ${nodeCount} DOM nodes (budget: 1500)`);

// 3. Focus trap in open dialog
const dialog = document.querySelector('[role="dialog"]');
if (dialog) {
  const focusable = dialog.querySelectorAll('button, input, textarea, select, a[href], [tabindex]:not([tabindex="-1"])');
  console.assert(focusable.length >= 1, 'FAIL: Dialog has no focusable elements');
  console.assert(dialog.getAttribute('aria-modal') === 'true', 'FAIL: Dialog missing aria-modal');
  console.assert(dialog.getAttribute('aria-labelledby'), 'FAIL: Dialog missing aria-labelledby');
}

// 4. Toast queue
const toasts = document.querySelectorAll('[data-sonner-toast], [role="status"]');
console.assert(toasts.length <= 3, `FAIL: ${toasts.length} toasts visible (max 3)`);

// 5. Empty state presence
const tables = document.querySelectorAll('table');
tables.forEach(table => {
  const rows = table.querySelectorAll('tbody tr');
  if (rows.length === 0) {
    const emptyState = table.querySelector('[class*="empty"], [class*="text-center"]');
    console.assert(emptyState, 'FAIL: Empty table has no empty state');
  }
});

// 6. Icon-only buttons have aria-label
const iconButtons = document.querySelectorAll('button:not(:empty)');
iconButtons.forEach(btn => {
  const text = btn.textContent.trim();
  const hasLabel = btn.getAttribute('aria-label') || btn.querySelector('.sr-only');
  if (text.length === 0 || (btn.querySelector('svg') && text.length < 2)) {
    console.assert(hasLabel, `FAIL: Icon button missing aria-label: ${btn.outerHTML.slice(0, 80)}`);
  }
});

// 7. Skip to content link
const skipLink = document.querySelector('a[href="#main"]');
console.assert(skipLink, 'FAIL: No skip-to-content link found');

// 8. URL filter state
// Navigate to a filtered view, check URL has params
const url = new URL(window.location.href);
// (auditor should apply a filter and verify params appear)

// 9. Chart Y-axis starts at zero (bar charts)
const yAxes = document.querySelectorAll('.recharts-yAxis .recharts-cartesian-axis-tick-value');
if (yAxes.length > 0) {
  const firstTick = parseFloat(yAxes[0].textContent.replace(/[^0-9.\-]/g, ''));
  console.assert(firstTick === 0 || isNaN(firstTick), `FAIL: Bar chart Y-axis starts at ${firstTick}, not 0`);
}

// 10. Reduced motion
const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
if (mql.matches) {
  const animated = [...document.querySelectorAll('*')].filter(el => {
    const cs = getComputedStyle(el);
    return parseFloat(cs.animationDuration) > 10 || parseFloat(cs.transitionDuration) > 10;
  });
  console.assert(animated.length === 0, `FAIL: ${animated.length} elements still animate under reduced motion`);
}
```

## Manual inspection protocol

1. Open the dashboard at 1440px. Count visible KPI tiles. FAIL if numeric values do not use monospace/tabular-nums.
2. Open a data table with 50+ rows. Click a column header to sort. FAIL if sorting does not work or sort indicator does not appear.
3. Select 3 rows via checkbox. FAIL if the selection count in the toolbar does not update.
4. Apply a filter. Refresh the page. FAIL if the filter is lost (URL params not preserved).
5. Clear all filters. FAIL if no "Reset" button or if it does not clear URL params.
6. Open a form. Submit without filling required fields. FAIL if errors show before the user interacts or if focus does not move to the first error.
7. Open a dialog. Press Tab 10+ times. FAIL if focus escapes the dialog boundary.
8. Press Escape. FAIL if the dialog does not close or focus does not return to the trigger.
9. Trigger a toast. FAIL if more than 3 toasts are visible at once.
10. Open command palette with Cmd+K. FAIL if it does not open or if it triggers while focus is in a text input.
11. Open the notification center. FAIL if there is no "mark all read" action or no unread indicator.
12. Navigate to an empty list view. FAIL if it shows a blank page instead of a designed empty state with a CTA.
13. Load a page with data. FAIL if loading shows a spinner instead of skeleton matched to content shape.
14. Scroll a chat interface up, then wait for a new message. FAIL if the view auto-scrolls while you are reading history.
15. Drag a Kanban card between columns. FAIL if no drag overlay or if the card drops with no animation.
16. Upload a file. FAIL if there is no progress bar, retry button on failure, or cancel button.
17. Inline-edit a table cell. FAIL if the edit does not show immediately (optimistic) or if server error does not rollback.
18. Emulate prefers-reduced-motion in DevTools. FAIL if any animation or transition is still visible.
19. Tab through the entire page with keyboard only. FAIL if any interactive element is unreachable or has no visible focus ring.

## Scoring rubric

| # | Criterion | Weight | 0 | 1 | 2 |
|---|---|---|---|---|---|
| 1 | Tabular numerics | 8 | Mixed proportional and tabular on data surfaces | Most numeric cells use tabular, 1-2 exceptions | All numeric displays use tabular-nums/font-mono |
| 2 | Data table completeness | 10 | No sort or pagination | Sort and paginate work, no selection or filter | Sort, paginate, select, filter, column visibility all functional |
| 3 | Form error choreography | 10 | All errors on mount or no inline errors | Errors appear but focus does not move to first error | Errors appear on interaction, focus moves to first error on submit |
| 4 | Focus management (dialogs) | 10 | Focus leaks outside dialog | Focus trapped but does not return to trigger on close | Full trap with return-to-trigger and Escape-to-close |
| 5 | URL-synced filter state | 8 | Filters in React state only (lost on refresh) | Some filters in URL, not all | All filters synced to URL params, survive refresh and sharing |
| 6 | Empty and error states | 8 | Blank page or "No results" text | Empty state with text but no CTA | Empty state with icon, title, description, and CTA. Error state with retry. |
| 7 | Skeleton content match | 6 | Spinner or no loading state | Skeleton present but wrong shape/count | Skeleton matches content shape (same grid, same field count) |
| 8 | Toast discipline | 6 | No toasts or toasts for everything | Toasts present, but > 3 visible or no undo on destructive | Max 3 visible, undo on destructive, hover pauses timer |
| 9 | Keyboard + screen reader a11y | 10 | Major elements unreachable by keyboard | Keyboard navigable but missing aria attributes | Full keyboard nav, aria-label on icon buttons, aria-sort on table headers, skip link |
| 10 | Reduced motion compliance | 6 | Animations persist under reduced motion | Most animations stop, 1-2 exceptions | All animation halted under prefers-reduced-motion |
| 11 | Performance budget | 10 | FCP > 3s or INP > 400ms or > 3000 DOM nodes | Within 2x of budget on most metrics | FCP < 1.5s, INP < 200ms, DOM < 1500, JS < 100kB gzipped per route |
| 12 | Virtualization | 8 | 500+ items rendered as full DOM nodes | Virtualization present but flickers or wrong row height | Smooth virtualization with correct scroll proportions and overscan |

**Total: 100 points. Ship threshold: 75+. Below 60: NO SHIP.**

## Common false passes

1. **Demo data masks missing empty states.** A table pre-populated with sample data looks complete. Remove all data and the blank page reveals no empty state was built.
2. **Sort indicator appears but sorting is wrong.** A column header shows an arrow icon but the data is not actually reordered (missing `createSortedRowModel()`).
3. **Dialog looks accessible but leaks focus.** A visually correct dialog that uses a custom portal instead of Radix's built-in portal does not trap focus.
4. **Skeleton present but wrong shape.** A skeleton shows 3 rows but the loaded content has 10 items with avatars and badges. The skeleton does not match.
5. **Filters work but are not in the URL.** Applying a filter updates the table, but refreshing the page resets all filters because state is local.
6. **Toasts work but stack infinitely.** Each action triggers a toast, and rapid actions produce 10+ toasts overlapping on screen.
7. **Chart tooltip works on hover but not on mobile.** Desktop hover shows tooltip, but tap does nothing on touch devices.
8. **Reduced motion partially applied.** `animate-pulse` on skeletons stops, but a `transition-all duration-300` on a sidebar toggle still fires.
9. **Command palette opens in input fields.** Pressing Cmd+K while typing in a text field opens the palette AND types "k" in the field.
10. **Virtualized list renders correctly but scrollbar is wrong.** Missing the total-size container div, so the scrollbar height does not reflect actual content length.

## Required fixes by failure mode

| Failure | Root cause | Fix |
|---|---|---|
| Mixed numeral variants | Missing `tabular-nums` on numeric cells | Add `font-variant-numeric: tabular-nums` or `font-mono` class |
| Sort indicator but no sort | Missing `createSortedRowModel()` in table features | Register `rowSortingFeature` and `sortedRowModel` in `tableFeatures()` |
| Focus leak from dialog | Custom portal bypassing Radix | Use Radix Dialog/AlertDialog which handles focus trap natively |
| Skeleton shape mismatch | Skeleton built without reference to loaded content | Mirror the loaded content's grid, count, and aspect ratios in skeleton |
| Filters lost on refresh | State in `useState` only | Read from `useSearchParams()`, write back with `router.replace()` |
| Toast stack overflow | No queue limit | Set `visibleToasts={3}` on `<Toaster>`, or use sonner's built-in limit |
| Chart tooltip missing on mobile | Recharts default is hover-only | Add `onTouchStart` handler or use `<ChartTooltip trigger="click">` |
| Animation under reduced motion | No `@media (prefers-reduced-motion)` rule | Add global `prefers-reduced-motion` reset or use Tailwind `motion-reduce:` |
| Command-K in inputs | No check for active element type | Guard `onKeyDown` with `e.target instanceof HTMLInputElement` check |
| Wrong scrollbar on virtual list | Missing total-size container | Wrap virtual items in a div with `height: virtualizer.getTotalSize()` |

## Verdict format

```
## Audit Verdict

| # | Criterion | Score | Notes |
|---|---|---|---|
| 1 | Tabular numerics | X/2 | ... |
| ... | ... | ... | ... |
| 12 | Virtualization | X/2 | ... |

**Total: XX/100**

**Blocking issues:**
- [list any criterion scoring 0]

**Verdict: SHIP / NO SHIP**
```
