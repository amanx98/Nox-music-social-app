---
name: app-ui-surfaces-toolkit
description: "Use when building application UI: dashboards, data tables, forms, wizards, modals, toasts, menus, command-K, kanban boards, calendars, file uploads, chat interfaces, settings, onboarding, empty states, skeletons, virtualized lists, faceted filters, inline edit, notification centers, analytics charts. Covers layout density, state choreography, focus management, optimistic updates, URL-synced filters, and streaming scroll anchoring."
category: app
pairs_with: app-ui-surfaces-toolkit-eval
---

# Application UI Surfaces Toolkit

## Scope

Everything between login and logout in a data-rich application. This is not marketing pages (see `marketing-sections-toolkit`) and not micro-interactions on individual elements (see `micro-interactions-toolkit`).

Covers:
- Dashboard layout systems and density modes
- Advanced data tables (sorting, filtering, selection, virtualization, sticky columns, drag reorder)
- Form systems with Zod schema validation and error choreography
- Multi-step wizards with step state and navigation guards
- Modal/dialog stacking with focus trap and scroll lock
- Toast/notification queueing with dismiss, undo, and promise patterns
- Dropdown and context menus with collision-aware positioning
- Command-K palette (search, actions, navigation)
- Kanban drag boards with multi-container reorder
- Calendar and scheduler UI (month/week/day views)
- File upload with progress, retry, and drag-drop zone
- Chat interfaces with streaming responses and scroll anchoring
- Settings surfaces with sidebar navigation
- Onboarding flows (checklists, tours, progressive disclosure)
- Empty and error states
- Skeleton loading matched to content shape
- Virtualized infinite lists with windowing
- Faceted filter panels with URL state sync
- Inline edit with optimistic rollback
- Notification centers
- Analytics chart suites (area, bar, line, pie, radar, radial)

Does NOT cover:
- Drag-and-drop primitives in isolation (see `drag-drop-dnd-kit`)
- FLIP animation math (see `flip-sortable-lists`)
- Layout animation with motion/react (see `framer-motion-layout`)
- Marketing page sections (see `marketing-sections-toolkit`)
- Design system token architecture (see `design-system-foundations-toolkit`)

## Decision matrix

| Situation | Use this pattern | Avoid | Why |
|---|---|---|---|
| Dense data monitoring (ops, trading) | Cockpit density: 4-12px padding, hairlines not cards, font-mono everywhere | Card wrappers with 24px+ padding | Density is the product, not a problem |
| CRUD admin panel | Data table + faceted filters + inline edit | Building custom list views | TanStack Table handles sort/filter/paginate/select for free |
| Multi-field data entry | react-hook-form + Zod schema + per-field error | Uncontrolled forms with manual validation | Schema-first catches errors at parse, not at submit |
| Sequential data collection | Multi-step wizard with URL-backed step state | Single long scrolling form | Users abandon long forms; steps give progress signal |
| Confirming destructive action | AlertDialog (not Dialog) with explicit confirm text | window.confirm() or toast with undo | AlertDialog blocks interaction and forces conscious choice |
| Stacking overlays (modal-in-modal) | Radix Dialog supports nesting; track z-index stack | Multiple portals at same z-level | Focus trap must scope to innermost; dismiss must close only top |
| Success/info feedback | Toast with auto-dismiss 5s | Modal dialog for non-blocking info | Toasts do not interrupt workflow |
| Destructive feedback with undo | Toast with action button, 5-8s dismiss delay | Auto-dismiss without undo option | User needs escape hatch for accidental deletes |
| Right-click contextual actions | ContextMenu on the trigger region | Dropdown that opens on right-click via onContextMenu hack | ContextMenu primitive handles pointer type, position, and a11y |
| Global search + actions | Command palette (Cmd+K) with grouped results | Search bar that only filters the current page | Command palette is a universal escape hatch |
| Task board with drag reorder | Kanban with dnd-kit multi-container | HTML5 drag-and-drop API | HTML5 DnD has no touch support, no keyboard DnD, no animated overlay |
| Date-based scheduling | Calendar component with month/week/day views | Date picker alone (only picks a date, no event layout) | Scheduling needs event positioning, overlap handling, drag resize |
| Bulk file ingestion | Dropzone + file list with individual progress bars | Single file input with no feedback | Users need per-file status, retry, and cancel |
| AI/LLM response display | Streaming chat with scroll anchoring and markdown | Blocking spinner until full response | Streaming gives perceived speed; anchoring keeps newest visible |
| App preferences | Settings page with sidebar nav + form sections | Modal dialog for settings | Settings have too many sections for a modal |
| First-run experience | Onboarding checklist + optional tooltip tour | Mandatory multi-step tutorial blocking the app | Let users skip; checklist persists as reference |
| No data yet | Empty state with illustration + single CTA | Blank page or "No results" text | Empty state teaches what the page does and how to fill it |
| Content loading | Skeleton matched to content shape | Spinner centered on page | Skeleton reduces perceived load time by showing structure |
| 10k+ row list | Virtualized list with @tanstack/react-virtual | Rendering all DOM nodes | DOM node count kills scroll perf above ~500 visible nodes |
| Multi-facet filtering with shareable URL | URL search params synced to filter state | Local state only (filters lost on refresh/share) | URL state makes filters bookmarkable and shareable |
| Quick cell edit in a table | Inline edit with optimistic update + rollback on error | Navigate to a separate edit page | Inline edit keeps context; optimistic update feels instant |
| Unread items feed | Notification center popover with mark-read and grouping | Toast stream for persistent notifications | Toasts auto-dismiss; a center persists and lets users catch up |
| KPI visualization | Recharts with ChartContainer + semantic color config | Chart.js (no React integration) or raw SVG | Recharts composes with React; ChartContainer handles theming |

## Shared foundations

### Tech stack assumed
- React 19+ with Server Components where noted
- Next.js 15+ App Router
- Tailwind CSS v4 (`@theme` inline, no tailwind.config.js)
- shadcn/ui components (Radix primitives underneath)
- TanStack Table v9 for data tables
- react-hook-form + @hookform/resolvers + Zod for forms
- @dnd-kit/core + @dnd-kit/sortable for drag-and-drop
- Recharts 2.x for charts
- date-fns for date math
- sonner for toast notifications
- cmdk or shadcn Command for command palette
- @tanstack/react-virtual for virtualization

### Typography rules for data UI
```css
/* Every numeric display in the app */
.tabular-nums {
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum";
}
```
Use `font-mono` on numeric columns, stat callouts, timers, prices. Mixed proportional and tabular figures on the same page is a bug, not a style choice. Neo-grotesque sans only: Geist, Inter, Satoshi. No serifs on data surfaces.

### Semantic color
Green = up / live / success. Red = down / error / destructive. Amber = warning / pending. Blue = informational / neutral. Never decorative. Never repurposed as brand accent on data surfaces. Dashboard chrome stays neutral; accent appears only on primary CTAs and focus rings.

### Spacing density modes
```ts
const DENSITY = {
  compact:  { cellPx: 8,  rowH: 32, gap: 4  }, // ops, trading
  default:  { cellPx: 12, rowH: 40, gap: 8  }, // SaaS admin
  relaxed:  { cellPx: 16, rowH: 48, gap: 12 }, // consumer app
} as const;
```
Pick one density and commit. Mixing densities on the same page reads as unfinished.

### Animation tokens
```css
--duration-fast: 150ms;   /* hover, focus, toggle */
--duration-normal: 200ms; /* open/close, slide */
--duration-slow: 300ms;   /* page transition, expand */
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);      /* enter */
--ease-in: cubic-bezier(0.55, 0, 1, 0.45);       /* exit */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* overshoot */
```

### Focus management rules
1. When a modal/dialog opens, focus moves to the first focusable element inside (or the close button).
2. When a modal closes, focus returns to the element that triggered it.
3. Tab traps inside modals: Tab cycles within the dialog, never escapes to the page behind.
4. Escape closes the topmost overlay only.
5. All interactive elements must have a visible focus ring: `focus-visible:ring-2 ring-ring ring-offset-2`.
6. Skip-to-content link at the top of every page for keyboard users.

### Optimistic update pattern
```ts
// Shared pattern for inline edit, drag reorder, toggle, delete
async function optimisticMutation<T>({
  cache,           // local state or query cache
  key: string,     // cache key
  optimisticData,  // what the UI shows immediately
  mutationFn,      // the actual API call
  rollbackData,    // what to restore on failure
}) {
  cache.set(key, optimisticData);
  try {
    const result = await mutationFn();
    cache.set(key, result); // server-confirmed data
  } catch (err) {
    cache.set(key, rollbackData);
    toast.error("Changes could not be saved. Rolled back.");
  }
}
```

## Dashboard layout systems and density

When to use: any page showing multiple KPIs, charts, and summary data at once. The dashboard is the app's front door.

### Cockpit density (VISUAL_DENSITY 8-10)
For ops, trading, monitoring. No card wrappers. Hairlines separate data. Internal padding 4-12px.

### Standard SaaS density
Cards group related metrics. 12-16px internal padding. 8px gap between cards.

### Implementation

```tsx
// Dashboard shell with responsive grid
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

// KPI stat tile - the atomic unit of dashboards
function StatTile({
  label,
  value,
  delta,
  trend,
}: {
  label: string;
  value: string;
  delta: string;
  trend: "up" | "down" | "flat";
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums font-mono">
          {value}
        </div>
        <p className={`text-xs mt-1 ${
          trend === "up" ? "text-emerald-600" :
          trend === "down" ? "text-red-600" :
          "text-muted-foreground"
        }`}>
          {delta}
        </p>
      </CardContent>
    </Card>
  );
}

// Dashboard grid layout
function DashboardPage() {
  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      {/* KPI row */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatTile label="Revenue" value="$45,231" delta="+20.1% from last month" trend="up" />
        <StatTile label="Subscriptions" value="+2,350" delta="+180.1% from last month" trend="up" />
        <StatTile label="Active Now" value="+573" delta="+19% from last hour" trend="up" />
        <StatTile label="Churn Rate" value="2.4%" delta="+0.3% from last month" trend="down" />
      </div>

      {/* Main content row */}
      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={monthlyData}>
                <XAxis dataKey="name" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false}
                  tickFormatter={(v) => `$${v}`} />
                <Bar dataKey="total" fill="currentColor" radius={[4, 4, 0, 0]}
                  className="fill-primary" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Recent Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentSalesList />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const monthlyData = [
  { name: "Jan", total: 4200 }, { name: "Feb", total: 3800 },
  { name: "Mar", total: 5100 }, { name: "Apr", total: 4600 },
  { name: "May", total: 5400 }, { name: "Jun", total: 6200 },
  { name: "Jul", total: 5800 }, { name: "Aug", total: 4900 },
  { name: "Sep", total: 6100 }, { name: "Oct", total: 5500 },
  { name: "Nov", total: 6800 }, { name: "Dec", total: 7200 },
];
```

### Cockpit variant (no cards)
```tsx
function CockpitDashboard() {
  return (
    <div className="divide-y divide-border text-sm font-mono">
      <div className="grid grid-cols-4 gap-0">
        {metrics.map((m) => (
          <div key={m.id} className="border-r last:border-r-0 px-3 py-2">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {m.label}
            </span>
            <div className="text-lg font-semibold tabular-nums">{m.value}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-0">
        {/* Inline sparklines, no card wrappers */}
      </div>
    </div>
  );
}
```

Failure mode: wrapping every metric in a `<Card>` with 24px padding when density is the product. At cockpit density, cards are banned. Use `divide-y` and `border-r` to separate.

Numbers: stat tile labels 10-12px uppercase. Stat values 24-64px mono bold. Delta text 12px. Sparklines 60-120px wide, 16-24px tall.

## Advanced data tables

When to use: any tabular data with sort, filter, paginate, select, or reorder. TanStack Table v9 is the engine; shadcn provides the UI shell.

### Core implementation

```tsx
"use client";

import * as React from "react";
import {
  createColumnHelper,
  columnFilteringFeature,
  columnVisibilityFeature,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  FlexRender,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type ColumnFiltersState,
  type SortingState,
} from "@tanstack/react-table";
import { z } from "zod";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";

// 1. Declare features (tree-shakes unused)
const features = tableFeatures({
  columnFilteringFeature,
  columnVisibilityFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
});

// 2. Schema
const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(["todo", "in-progress", "done", "cancelled"]),
  priority: z.enum(["low", "medium", "high"]),
  assignee: z.string(),
});
type Task = z.infer<typeof taskSchema>;

// 3. Columns
const columnHelper = createColumnHelper<typeof features, Task>();

const columns = columnHelper.columns([
  columnHelper.display({
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(v) => row.toggleSelected(!!v)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  }),
  columnHelper.accessor("title", {
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting()}>
        Title <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ getValue }) => <span className="font-medium">{getValue()}</span>,
  }),
  columnHelper.accessor("status", {
    header: "Status",
    cell: ({ getValue }) => {
      const status = getValue();
      const colors: Record<string, string> = {
        "todo": "bg-slate-100 text-slate-700",
        "in-progress": "bg-blue-100 text-blue-700",
        "done": "bg-emerald-100 text-emerald-700",
        "cancelled": "bg-red-100 text-red-700",
      };
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[status]}`}>
          {status}
        </span>
      );
    },
    filterFn: "arrIncludesSome",
  }),
  columnHelper.accessor("priority", {
    header: "Priority",
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor("assignee", {
    header: "Assignee",
    cell: ({ getValue }) => getValue(),
  }),
]);

// 4. Table component
function DataTable({ data }: { data: Task[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = React.useState({});

  const table = useTable({
    data,
    columns,
    features,
    state: { sorting, columnFilters, rowSelection },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Filter titles..."
          value={(table.getColumn("title")?.getFilterValue() as string) ?? ""}
          onChange={(e) => table.getColumn("title")?.setFilterValue(e.target.value)}
          className="max-w-sm h-8"
        />
        <div className="ml-auto text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} selected
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead key={h.id}>
                    {h.isPlaceholder ? null : (
                      <FlexRender content={h.column.columnDef.header} context={h.getContext()} />
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      <FlexRender content={cell.column.columnDef.cell} context={cell.getContext()} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}>
          <ChevronLeft className="h-4 w-4" /> Previous
        </Button>
        <Button variant="outline" size="sm" onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}>
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
```

### Sticky columns
```css
/* First column (checkbox) stays pinned */
th:first-child, td:first-child {
  position: sticky;
  left: 0;
  z-index: 1;
  background: hsl(var(--background));
}
/* Last column (actions) stays pinned */
th:last-child, td:last-child {
  position: sticky;
  right: 0;
  z-index: 1;
  background: hsl(var(--background));
}
```

### Drag-to-reorder rows
For drag reorder within the table, see `drag-drop-dnd-kit`. The integration pattern:
```tsx
import { DndContext, closestCenter, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";

function SortableRow({ row }: { row: Row<Task> }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.original.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <TableRow ref={setNodeRef} style={style} {...attributes}>
      <TableCell>
        <button {...listeners} className="cursor-grab active:cursor-grabbing p-1">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      </TableCell>
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>
          <FlexRender content={cell.column.columnDef.cell} context={cell.getContext()} />
        </TableCell>
      ))}
    </TableRow>
  );
}
```

### Virtualized table (10k+ rows)
```tsx
import { useVirtualizer } from "@tanstack/react-virtual";

function VirtualizedTable({ data }: { data: Task[] }) {
  const parentRef = React.useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40, // row height in px
    overscan: 10,
  });

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto rounded-md border">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-background">
          {/* header rows */}
        </TableHeader>
        <TableBody>
          <tr style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: "relative" }}>
            <td colSpan={99} className="p-0">
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const row = data[virtualRow.index];
                return (
                  <div
                    key={virtualRow.key}
                    className="absolute left-0 right-0 flex items-center border-b"
                    style={{
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    {/* render cells */}
                  </div>
                );
              })}
            </td>
          </tr>
        </TableBody>
      </Table>
    </div>
  );
}
```

Failure mode: rendering 10k DOM nodes. Above 500 visible rows, the browser jank is visible. Virtualize. Also: forgetting `tabular-nums` on numeric columns causes visual jitter when data updates.

Numbers: row height 32px compact / 40px default / 48px relaxed. Header sticky with `z-10`. Pagination shows 10/20/50 rows per page.

## Form systems with schema validation and error choreography

When to use: any data entry surface. react-hook-form + Zod is the standard. The form primitive from shadcn wires labels, descriptions, and error messages to fields automatically via context.

### Implementation

```tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";

// 1. Schema defines shape AND validation messages
const profileSchema = z.object({
  username: z.string().min(2, "Username must be at least 2 characters").max(30, "Max 30 characters"),
  email: z.string().email("Invalid email address"),
  bio: z.string().min(4, "Bio too short").max(160, "Bio must be under 160 characters"),
  role: z.enum(["admin", "editor", "viewer"], {
    required_error: "Select a role",
  }),
  urls: z.array(
    z.object({ value: z.string().url("Must be a valid URL") })
  ).optional(),
});
type ProfileValues = z.infer<typeof profileSchema>;

function ProfileForm() {
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: "",
      email: "",
      bio: "",
      urls: [{ value: "" }],
    },
    mode: "onChange", // validate on every change for instant feedback
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "urls",
  });

  async function onSubmit(data: ProfileValues) {
    try {
      await saveProfile(data);
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to save profile");
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="jdoe" {...field} />
              </FormControl>
              <FormDescription>Your public display name.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="you@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio</FormLabel>
              <FormControl>
                <Textarea placeholder="Tell us about yourself" className="resize-none" {...field} />
              </FormControl>
              <div className="flex justify-between">
                <FormMessage />
                <span className="text-xs text-muted-foreground tabular-nums">
                  {field.value?.length ?? 0}/160
                </span>
              </div>
            </FormItem>
          )}
        />

        {/* Dynamic field array */}
        <div className="space-y-2">
          <FormLabel>URLs</FormLabel>
          {fields.map((f, index) => (
            <FormField
              key={f.id}
              control={form.control}
              name={`urls.${index}.value`}
              render={({ field }) => (
                <FormItem>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input placeholder="https://..." {...field} />
                    </FormControl>
                    <Button type="button" variant="outline" size="icon"
                      onClick={() => remove(index)}>
                      X
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
          <Button type="button" variant="outline" size="sm"
            onClick={() => append({ value: "" })}>
            Add URL
          </Button>
        </div>

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving..." : "Save"}
        </Button>
      </form>
    </Form>
  );
}
```

### Error choreography rules
1. Validate on change (`mode: "onChange"`) for fields with clear constraints (email, URL, min/max length).
2. Validate on blur (`mode: "onBlur"`) for expensive async validation (username availability).
3. On submit failure, focus the first invalid field: `form.setFocus(firstErrorField)`.
4. Error text appears below the field with `text-destructive` color, 150ms fade-in.
5. Field border changes to `border-destructive` when invalid.
6. Character counts use `tabular-nums` and show remaining vs max.
7. Submit button shows loading state with spinner, disabled during submission.

Failure mode: showing all errors on mount before the user types anything. Always start with no errors visible. Also: forgetting to wire `aria-describedby` and `aria-invalid` on inputs (the shadcn Form component does this automatically).

## Multi-step wizards

When to use: collecting data that logically groups into 2-6 steps. More than 6 steps means the form is too complex and should be redesigned.

### Implementation

```tsx
"use client";

import * as React from "react";
import { CheckIcon, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// Step state
type StepState = "active" | "completed" | "inactive" | "loading";

interface StepperContextValue {
  activeStep: number;
  setActiveStep: (step: number) => void;
  totalSteps: number;
}

const StepperContext = React.createContext<StepperContextValue | null>(null);

function useStepper() {
  const ctx = React.useContext(StepperContext);
  if (!ctx) throw new Error("useStepper must be inside Stepper");
  return ctx;
}

// Stepper container
function Stepper({
  children,
  defaultStep = 0,
  onStepChange,
}: {
  children: React.ReactNode;
  defaultStep?: number;
  onStepChange?: (step: number) => void;
}) {
  const [activeStep, setActiveStep] = React.useState(defaultStep);
  const totalSteps = React.Children.count(children);

  const handleSetStep = React.useCallback((step: number) => {
    setActiveStep(step);
    onStepChange?.(step);
  }, [onStepChange]);

  return (
    <StepperContext.Provider value={{ activeStep, setActiveStep: handleSetStep, totalSteps }}>
      <div className="space-y-8">{children}</div>
    </StepperContext.Provider>
  );
}

// Step indicator bar
function StepIndicator({ steps }: { steps: { label: string; description?: string }[] }) {
  const { activeStep } = useStepper();

  return (
    <div className="flex items-center gap-2">
      {steps.map((step, i) => {
        const state: StepState = i < activeStep ? "completed" : i === activeStep ? "active" : "inactive";
        return (
          <React.Fragment key={i}>
            <div className="flex items-center gap-2">
              <div className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors",
                state === "completed" && "border-primary bg-primary text-primary-foreground",
                state === "active" && "border-primary text-primary",
                state === "inactive" && "border-muted text-muted-foreground",
              )}>
                {state === "completed" ? <CheckIcon className="h-4 w-4" /> : i + 1}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium">{step.label}</p>
                {step.description && (
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                )}
              </div>
            </div>
            {i < steps.length - 1 && (
              <div className={cn(
                "h-px flex-1 transition-colors",
                i < activeStep ? "bg-primary" : "bg-border",
              )} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// Step content wrapper
function StepContent({
  step,
  children,
}: {
  step: number;
  children: React.ReactNode;
}) {
  const { activeStep } = useStepper();
  if (step !== activeStep) return null;
  return <div className="animate-in fade-in-0 slide-in-from-right-4 duration-300">{children}</div>;
}

// Navigation buttons
function StepNavigation({
  onNext,
  onBack,
  isNextDisabled,
  isLastStep,
  isSubmitting,
}: {
  onNext: () => void;
  onBack: () => void;
  isNextDisabled?: boolean;
  isLastStep?: boolean;
  isSubmitting?: boolean;
}) {
  const { activeStep } = useStepper();

  return (
    <div className="flex justify-between pt-4">
      <Button variant="outline" onClick={onBack} disabled={activeStep === 0}>
        Back
      </Button>
      <Button onClick={onNext} disabled={isNextDisabled || isSubmitting}>
        {isSubmitting ? (
          <><LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
        ) : isLastStep ? "Submit" : "Continue"}
      </Button>
    </div>
  );
}

// Usage
function CreateProjectWizard() {
  const [step, setStep] = React.useState(0);
  const steps = [
    { label: "Details", description: "Project name and type" },
    { label: "Team", description: "Add members" },
    { label: "Settings", description: "Configure options" },
    { label: "Review", description: "Confirm and create" },
  ];

  return (
    <Stepper defaultStep={step} onStepChange={setStep}>
      <StepIndicator steps={steps} />
      <StepContent step={0}><ProjectDetailsForm /></StepContent>
      <StepContent step={1}><TeamSelectionForm /></StepContent>
      <StepContent step={2}><ProjectSettingsForm /></StepContent>
      <StepContent step={3}><ReviewAndSubmit /></StepContent>
      <StepNavigation
        onNext={() => setStep(Math.min(step + 1, steps.length - 1))}
        onBack={() => setStep(Math.max(step - 1, 0))}
        isLastStep={step === steps.length - 1}
      />
    </Stepper>
  );
}
```

### Navigation guard pattern
Validate the current step before allowing forward navigation. Back is always allowed.
```tsx
async function handleNext() {
  const isValid = await form.trigger(fieldsForStep[activeStep]);
  if (!isValid) return;
  setActiveStep(activeStep + 1);
}
```

### URL-backed step state
```tsx
import { useSearchParams, useRouter } from "next/navigation";

function useWizardStep() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const step = Number(searchParams.get("step") ?? 0);

  function setStep(newStep: number) {
    const params = new URLSearchParams(searchParams);
    params.set("step", String(newStep));
    router.replace(`?${params.toString()}`);
  }

  return { step, setStep };
}
```

Failure mode: losing wizard state on page refresh because step is only in React state. Also: allowing forward navigation past an invalid step.

## Modal and dialog stacking with focus management

When to use: confirming actions, displaying detail views, collecting input that should not navigate away. Use Dialog for general overlays. Use AlertDialog for destructive confirmations (it has no implicit close on overlay click).

### Implementation

```tsx
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

// Standard dialog
function EditItemDialog({ item }: { item: Item }) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Edit</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit item</DialogTitle>
          <DialogDescription>Make changes and save.</DialogDescription>
        </DialogHeader>
        <EditForm item={item} onSave={() => setOpen(false)} />
        <DialogFooter>
          <Button type="submit" form="edit-form">Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Destructive confirmation with AlertDialog
function DeleteConfirmation({ onConfirm }: { onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">Delete</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the item.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Nested dialog (modal inside modal)
function NestedDialogExample() {
  return (
    <Dialog>
      <DialogTrigger asChild><Button>Open outer</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Outer dialog</DialogTitle></DialogHeader>
        <p>Content here.</p>
        <Dialog>
          <DialogTrigger asChild><Button>Open inner</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Inner dialog</DialogTitle></DialogHeader>
            <p>Nested content. Escape closes only this dialog.</p>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
```

### Focus management rules
Radix Dialog handles these automatically:
1. On open: focus moves to first focusable child (or the content container if no focusable children).
2. Tab trapping: Tab and Shift+Tab cycle within the dialog boundary.
3. On close: focus returns to the trigger element.
4. Escape: closes the topmost dialog only when nested.
5. Overlay click: closes Dialog (but NOT AlertDialog).
6. Scroll lock: `document.body` gets `overflow: hidden` while dialog is open.

### Stacking z-index
Radix portals auto-increment z-index. If manually stacking, use:
```css
[data-radix-popper-content-wrapper] { z-index: 50; }
/* Dialog overlay */
[role="dialog"] { z-index: 50; }
/* Nested dialog gets higher z automatically via portal ordering */
```

Failure mode: using Dialog for destructive actions (user can dismiss by clicking overlay, bypassing the confirmation). Using `window.confirm()` which blocks the thread and cannot be styled. Forgetting to return focus to trigger on close.

## Toast queueing

When to use: non-blocking feedback after an action (save, delete, send, copy). Do not use toasts for errors that require action; use inline errors or AlertDialog instead.

### Implementation with Sonner

```tsx
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

// Mount once in layout
function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster position="bottom-right" richColors closeButton />
    </>
  );
}

// Basic toast
toast("Event created");

// Success with description
toast.success("Profile saved", {
  description: "Your changes are live.",
});

// Error
toast.error("Failed to save", {
  description: "Check your connection and try again.",
});

// With undo action (destructive feedback)
function handleDelete(id: string) {
  const item = cache.get(id);
  cache.delete(id); // optimistic

  toast("Item deleted", {
    action: {
      label: "Undo",
      onClick: () => cache.set(id, item), // rollback
    },
    duration: 6000, // longer for destructive
  });

  // After duration, actually delete server-side
  setTimeout(() => deleteFromServer(id), 6500);
}

// Promise toast (loading -> success/error)
toast.promise(
  saveSettings(data),
  {
    loading: "Saving settings...",
    success: "Settings saved",
    error: "Could not save settings",
  }
);

// Anchored toast (positioned near trigger)
import { anchoredToastManager } from "@/components/ui/toast";

function SaveButton() {
  const ref = React.useRef<HTMLButtonElement>(null);

  return (
    <button ref={ref} onClick={() => {
      anchoredToastManager.add({
        id: "save-toast",
        title: "Draft saved",
        positionerProps: { anchor: ref.current!, sideOffset: 6 },
        timeout: 2000,
      });
    }}>
      Save
    </button>
  );
}
```

### Queueing rules
1. Max 3 visible toasts at once. New toasts push older ones up (or stack).
2. Auto-dismiss after 5s for info, 6-8s for actions with undo.
3. Hovering a toast pauses its dismiss timer.
4. Toasts with actions never auto-dismiss faster than 5s.
5. Toasts stack from the edge of the screen (bottom-right is standard for LTR apps).
6. On mobile, toasts appear at the top to avoid thumb zone interference.

Failure mode: using toasts for errors that require the user to take action (file the error inline on the form field or use an AlertDialog). Also: stacking 10+ toasts because every micro-action triggers one.

## Dropdown and context menus with collision handling

When to use: dropdowns for action lists triggered by a button click. Context menus for right-click actions on specific elements.

### Dropdown menu

```tsx
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSub,
  DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuShortcut,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";

function RowActions({ row }: { row: DataRow }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(row.id)}>
          Copy ID
          <DropdownMenuShortcut>Ctrl+C</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem>Edit</DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Assign to</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem>Alice</DropdownMenuItem>
            <DropdownMenuItem>Bob</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive focus:text-destructive">
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### Context menu

```tsx
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger,
  ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger,
  ContextMenuSeparator, ContextMenuCheckboxItem,
} from "@/components/ui/context-menu";

function FileCard({ file }: { file: File }) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="border rounded-lg p-4 cursor-default">
          <p className="font-medium">{file.name}</p>
          <p className="text-sm text-muted-foreground">{file.size}</p>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem>Open</ContextMenuItem>
        <ContextMenuItem>Download</ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger>Share with</ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem>Team</ContextMenuItem>
            <ContextMenuItem>Public link</ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuItem className="text-destructive">Delete</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
```

### Collision handling
Radix handles collision automatically via `@radix-ui/react-popper`:
- `side="bottom"` with `sideOffset={4}` is the default.
- If the menu would overflow the viewport, it flips to the opposite side.
- `align="end"` keeps the menu aligned to the right edge of the trigger.
- `collisionPadding={8}` keeps the menu 8px from viewport edges.
- `avoidCollisions={true}` is on by default.

The transform origin is set via `--radix-context-menu-content-transform-origin` for scale animations that originate from the correct corner.

Failure mode: building custom positioning logic instead of using Radix's built-in collision system. Also: context menus that open on left-click (confusing; that is a dropdown).

## Command-K search

When to use: global search + navigation + action dispatch from anywhere in the app. Opens with Cmd+K (Mac) / Ctrl+K (Windows).

### Implementation

```tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator, CommandShortcut,
} from "@/components/ui/command";
import {
  Calculator, Calendar, CreditCard, Settings, User,
  FileText, Search, Moon, Sun, Laptop,
} from "lucide-react";
import { useTheme } from "next-themes";

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const { setTheme } = useTheme();

  // Global keyboard shortcut
  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
        // Do not trigger inside inputs/textareas/contenteditable
        if (
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement ||
          (e.target instanceof HTMLElement && e.target.isContentEditable)
        ) return;
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function runCommand(command: () => void) {
    setOpen(false);
    command();
  }

  return (
    <>
      {/* Trigger button in navbar */}
      <button
        onClick={() => setOpen(true)}
        className="relative inline-flex h-8 w-full items-center justify-start gap-2 rounded-md border bg-muted/50 px-3 text-sm text-muted-foreground shadow-none sm:w-64"
      >
        <Search className="h-4 w-4" />
        <span className="hidden lg:inline">Search or jump to...</span>
        <span className="lg:hidden">Search...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] sm:flex">
          <span className="text-xs">&#x2318;</span>K
        </kbd>
      </button>

      {/* Command dialog */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          <CommandGroup heading="Navigation">
            <CommandItem onSelect={() => runCommand(() => router.push("/dashboard"))}>
              <Calculator className="mr-2 h-4 w-4" />
              Dashboard
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/projects"))}>
              <FileText className="mr-2 h-4 w-4" />
              Projects
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/settings"))}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
              <CommandShortcut>Ctrl+,</CommandShortcut>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Actions">
            <CommandItem onSelect={() => runCommand(() => router.push("/settings/profile"))}>
              <User className="mr-2 h-4 w-4" />
              Edit profile
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/settings/billing"))}>
              <CreditCard className="mr-2 h-4 w-4" />
              Billing
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/calendar"))}>
              <Calendar className="mr-2 h-4 w-4" />
              Calendar
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Theme">
            <CommandItem onSelect={() => runCommand(() => setTheme("light"))}>
              <Sun className="mr-2 h-4 w-4" />
              Light
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => setTheme("dark"))}>
              <Moon className="mr-2 h-4 w-4" />
              Dark
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => setTheme("system"))}>
              <Laptop className="mr-2 h-4 w-4" />
              System
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
```

### Architecture rules
1. Command palette is mounted once in the root layout, always listening for the keyboard shortcut.
2. Groups are ordered: recently used > navigation > actions > settings.
3. Each item has an icon, label, and optional keyboard shortcut hint.
4. The search input filters all groups simultaneously. If a group has no matching items, it hides.
5. Arrow keys navigate; Enter selects; Escape closes.
6. The palette should support async search results (API call on debounced input) for large datasets.
7. Do NOT trigger the shortcut inside input fields, textareas, or contenteditable elements.

Failure mode: a command palette that only searches the current page. It should be a global escape hatch to anywhere in the app. Also: missing the `kbd` hint on the trigger button (users will not discover the shortcut).

## Kanban drag boards

When to use: task management with status columns (Backlog, In Progress, Done). Uses dnd-kit for multi-container drag. For the drag primitive details, see `drag-drop-dnd-kit`.

### Implementation

```tsx
"use client";

import * as React from "react";
import {
  DndContext, closestCorners, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragOverlay, type DragStartEvent,
  type DragOverEvent, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GripVertical } from "lucide-react";

type Task = { id: string; title: string; priority: "low" | "medium" | "high" };
type Column = { id: string; title: string; tasks: Task[] };

function KanbanBoard() {
  const [columns, setColumns] = React.useState<Column[]>([
    { id: "backlog", title: "Backlog", tasks: [
      { id: "1", title: "Research competitors", priority: "medium" },
      { id: "2", title: "Write PRD", priority: "high" },
    ]},
    { id: "progress", title: "In Progress", tasks: [
      { id: "3", title: "Build prototype", priority: "high" },
    ]},
    { id: "done", title: "Done", tasks: [
      { id: "4", title: "Setup repo", priority: "low" },
    ]},
  ]);
  const [activeTask, setActiveTask] = React.useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  function findColumn(taskId: string) {
    return columns.find((col) => col.tasks.some((t) => t.id === taskId));
  }

  function handleDragStart(event: DragStartEvent) {
    const col = findColumn(String(event.active.id));
    const task = col?.tasks.find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeCol = findColumn(String(active.id));
    const overCol = findColumn(String(over.id)) ?? columns.find((c) => c.id === over.id);
    if (!activeCol || !overCol || activeCol.id === overCol.id) return;

    setColumns((prev) => {
      const task = activeCol.tasks.find((t) => t.id === active.id)!;
      return prev.map((col) => {
        if (col.id === activeCol.id) {
          return { ...col, tasks: col.tasks.filter((t) => t.id !== active.id) };
        }
        if (col.id === overCol.id) {
          const overIndex = col.tasks.findIndex((t) => t.id === over.id);
          const insertAt = overIndex >= 0 ? overIndex : col.tasks.length;
          const newTasks = [...col.tasks];
          newTasks.splice(insertAt, 0, task);
          return { ...col, tasks: newTasks };
        }
        return col;
      });
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);
    if (!over || active.id === over.id) return;

    const col = findColumn(String(active.id));
    if (!col) return;

    const oldIndex = col.tasks.findIndex((t) => t.id === active.id);
    const newIndex = col.tasks.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    setColumns((prev) =>
      prev.map((c) =>
        c.id === col.id ? { ...c, tasks: arrayMove(c.tasks, oldIndex, newIndex) } : c
      )
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto p-4">
        {columns.map((col) => (
          <KanbanColumn key={col.id} column={col} />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? <TaskCard task={activeTask} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function KanbanColumn({ column }: { column: Column }) {
  return (
    <div className="flex w-72 shrink-0 flex-col rounded-lg bg-muted/50 p-2">
      <div className="flex items-center justify-between px-2 py-1.5">
        <h3 className="text-sm font-semibold">{column.title}</h3>
        <Badge variant="secondary" className="tabular-nums">{column.tasks.length}</Badge>
      </div>
      <SortableContext items={column.tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 min-h-[40px]">
          {column.tasks.map((task) => (
            <SortableTask key={task.id} task={task} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableTask({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <TaskCard task={task} dragListeners={listeners} />
    </div>
  );
}

function TaskCard({
  task,
  isOverlay,
  dragListeners,
}: {
  task: Task;
  isOverlay?: boolean;
  dragListeners?: Record<string, unknown>;
}) {
  const priorityColor = {
    low: "text-slate-500",
    medium: "text-amber-500",
    high: "text-red-500",
  };

  return (
    <Card className={`${isOverlay ? "shadow-lg ring-2 ring-primary/20 rotate-2" : ""}`}>
      <CardContent className="flex items-start gap-2 p-3">
        <button {...dragListeners} className="mt-0.5 cursor-grab active:cursor-grabbing">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{task.title}</p>
          <span className={`text-xs ${priorityColor[task.priority]}`}>
            {task.priority}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Key architecture decisions
- `closestCorners` collision detection for multi-container (not `closestCenter` which is for single lists).
- `DragOverlay` renders a floating copy of the dragged card. The original dims to 40% opacity.
- `handleDragOver` moves the task between columns during drag (not just on drop) for live preview.
- The overlay card gets `rotate-2` and `shadow-lg` to signal "picked up" state.
- Column minimum height prevents collapse when empty.

Failure mode: using HTML5 drag-and-drop API (no touch support, no keyboard DnD, no animated overlay). Also: forgetting the `DragOverlay` and moving the actual DOM node, which causes layout shift.

## Calendar and scheduler UI

When to use: displaying events on a date grid with month, week, or day views. For date picking alone, use a DatePicker component. Calendar UI needs event positioning, overlap handling, and potentially drag-to-resize.

### Month view implementation

```tsx
"use client";

import {
  addDays, eachDayOfInterval, endOfMonth, endOfWeek, format,
  isSameDay, isSameMonth, isToday, startOfMonth, startOfWeek,
} from "date-fns";
import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  color: string;
};

function MonthCalendar({ events }: { events: CalendarEvent[] }) {
  const [currentDate, setCurrentDate] = React.useState(new Date());

  const days = React.useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentDate]);

  const weeks = React.useMemo(() => {
    const result: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      result.push(days.slice(i, i + 7));
    }
    return result;
  }, [days]);

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function eventsForDay(day: Date) {
    return events.filter((e) => isSameDay(e.start, day));
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2">
        <h2 className="text-lg font-semibold">{format(currentDate, "MMMM yyyy")}</h2>
        <div className="flex gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8"
            onClick={() => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8"
            onClick={() => setCurrentDate(new Date())}>
            Today
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8"
            onClick={() => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b">
        {weekdays.map((wd) => (
          <div key={wd} className="py-2 text-center text-sm text-muted-foreground">{wd}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid flex-1 auto-rows-fr">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7">
            {week.map((day) => {
              const dayEvents = eventsForDay(day);
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "min-h-[80px] border-b border-r p-1",
                    !isSameMonth(day, currentDate) && "bg-muted/30 text-muted-foreground",
                  )}
                >
                  <span className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-sm",
                    isToday(day) && "bg-primary text-primary-foreground font-bold",
                  )}>
                    {format(day, "d")}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <div
                        key={ev.id}
                        className="truncate rounded px-1 py-0.5 text-xs font-medium"
                        style={{ backgroundColor: `${ev.color}20`, color: ev.color }}
                      >
                        {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <button className="text-xs text-muted-foreground hover:underline">
                        +{dayEvents.length - 3} more
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Key details
- Events per day are capped at 3 visible with a "+N more" overflow.
- Today is highlighted with primary background on the date number.
- Days outside the current month are dimmed.
- Navigation: chevrons for month, "Today" button to jump back.
- For week/day views, events are positioned absolutely in time slots using `top: (startHour / 24) * 100%` and `height: (duration / 24) * 100%`.
- Overlapping events use `left` offset: first event 100% width, second 50% width offset 50%, etc.

Failure mode: using a date picker component and calling it a calendar. A calendar UI shows events laid out in a grid. Also: month grid that does not fill the remaining week days from adjacent months (leaving blank cells).

## File upload with progress and retry

When to use: any file ingestion surface. Users need per-file progress, error recovery, and the ability to cancel individual uploads.

### Implementation

```tsx
"use client";

import * as React from "react";
import { Upload, X, RotateCw, FileIcon, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type FileUploadState = {
  file: File;
  id: string;
  progress: number;
  status: "pending" | "uploading" | "complete" | "error";
  error?: string;
  abortController?: AbortController;
};

function FileUploadZone() {
  const [files, setFiles] = React.useState<FileUploadState[]>([]);
  const [isDragging, setIsDragging] = React.useState(false);

  function addFiles(newFiles: FileList | File[]) {
    const entries: FileUploadState[] = Array.from(newFiles).map((file) => ({
      file,
      id: crypto.randomUUID(),
      progress: 0,
      status: "pending",
    }));
    setFiles((prev) => [...prev, ...entries]);
    entries.forEach((entry) => uploadFile(entry));
  }

  async function uploadFile(entry: FileUploadState) {
    const controller = new AbortController();
    setFiles((prev) =>
      prev.map((f) =>
        f.id === entry.id ? { ...f, status: "uploading", abortController: controller } : f
      )
    );

    try {
      const formData = new FormData();
      formData.append("file", entry.file);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/upload");

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          setFiles((prev) =>
            prev.map((f) => (f.id === entry.id ? { ...f, progress: pct } : f))
          );
        }
      };

      await new Promise<void>((resolve, reject) => {
        xhr.onload = () => (xhr.status < 400 ? resolve() : reject(new Error(`HTTP ${xhr.status}`)));
        xhr.onerror = () => reject(new Error("Network error"));
        controller.signal.addEventListener("abort", () => { xhr.abort(); reject(new Error("Cancelled")); });
        xhr.send(formData);
      });

      setFiles((prev) =>
        prev.map((f) => (f.id === entry.id ? { ...f, status: "complete", progress: 100 } : f))
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      if (msg === "Cancelled") {
        setFiles((prev) => prev.filter((f) => f.id !== entry.id));
      } else {
        setFiles((prev) =>
          prev.map((f) => (f.id === entry.id ? { ...f, status: "error", error: msg } : f))
        );
      }
    }
  }

  function retryFile(id: string) {
    const entry = files.find((f) => f.id === id);
    if (entry) uploadFile({ ...entry, progress: 0, status: "pending" });
  }

  function cancelFile(id: string) {
    const entry = files.find((f) => f.id === id);
    entry?.abortController?.abort();
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
        )}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
        }}
      >
        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          Drag and drop files here, or{" "}
          <label className="cursor-pointer text-primary underline">
            browse
            <input type="file" multiple className="hidden"
              onChange={(e) => e.target.files && addFiles(e.target.files)} />
          </label>
        </p>
        <p className="text-xs text-muted-foreground mt-1">PNG, JPG, PDF up to 10MB</p>
      </div>

      {/* File list */}
      <div className="space-y-2">
        {files.map((f) => (
          <div key={f.id} className="flex items-center gap-3 rounded-md border px-3 py-2">
            {f.status === "complete" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            ) : f.status === "error" ? (
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
            ) : (
              <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{f.file.name}</p>
              {f.status === "uploading" && <Progress value={f.progress} className="h-1 mt-1" />}
              {f.status === "error" && (
                <p className="text-xs text-red-500">{f.error}</p>
              )}
            </div>
            <div className="flex gap-1 shrink-0">
              {f.status === "error" && (
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => retryFile(f.id)}>
                  <RotateCw className="h-3 w-3" />
                </Button>
              )}
              {f.status !== "complete" && (
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => cancelFile(f.id)}>
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Key details
- Uses XHR for upload progress (fetch does not support upload progress natively).
- AbortController enables per-file cancellation.
- Retry button on failed files re-enqueues with a fresh XHR.
- Drop zone changes border color on drag-over.
- File type and size validation should happen in `addFiles` before enqueuing.

Failure mode: using `fetch()` for uploads and having no progress feedback. Also: a single file input with no list, no progress, and no retry.

## Chat interfaces with streaming and scroll anchoring

When to use: AI/LLM chat, support chat, team messaging. The core challenge is streaming text that arrives token-by-token while keeping the newest content visible.

### Implementation

```tsx
"use client";

import * as React from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
};

function ChatInterface() {
  const [messages, setMessages] = React.useState<Message[]>([
    { id: "1", role: "assistant", content: "How can I help you today?" },
  ]);
  const [input, setInput] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const isAtBottomRef = React.useRef(true);

  // Scroll anchoring: only auto-scroll if user is already at bottom
  function scrollToBottom() {
    if (isAtBottomRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }

  function handleScroll() {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 40;
  }

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: input };
    const assistantId = crypto.randomUUID();
    setMessages((prev) => [...prev, userMsg, { id: assistantId, role: "assistant", content: "", isStreaming: true }]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ messages: [...messages, userMsg] }),
        headers: { "Content-Type": "application/json" },
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: accumulated } : m
          )
        );
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, isStreaming: false } : m
        )
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: "Sorry, something went wrong.", isStreaming: false }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex h-[600px] flex-col rounded-lg border">
      {/* Messages */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={cn("flex gap-3", msg.role === "user" && "flex-row-reverse")}>
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback>{msg.role === "user" ? "U" : "AI"}</AvatarFallback>
            </Avatar>
            <div className={cn(
              "max-w-[80%] rounded-lg px-3 py-2 text-sm",
              msg.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-muted",
            )}>
              {msg.content}
              {msg.isStreaming && (
                <span className="inline-block w-1.5 h-4 ml-0.5 bg-current animate-pulse" />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={!input.trim() || isLoading}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
```

### Scroll anchoring rules
1. Track whether the user is "at the bottom" (within 40px of the scroll end).
2. If at bottom, auto-scroll on every new token/message.
3. If the user has scrolled up to read history, do NOT auto-scroll (they are reading).
4. Show a "scroll to bottom" button when the user is scrolled away from the bottom.
5. The streaming cursor is a pulsing block (`animate-pulse` on a 1.5px-wide span).

### Streaming architecture
- Use `ReadableStream` from the server response.
- Accumulate tokens into a string and update the message in state on each chunk.
- Mark the message as `isStreaming: true` until the stream finishes.
- On error, replace the streaming message with an error text.

Failure mode: blocking the UI with a spinner until the full response arrives (defeats the purpose of streaming). Also: auto-scrolling when the user has scrolled up to read history.

## Settings surfaces

When to use: app preferences, account settings, notification preferences. Settings pages use a sidebar for navigation between sections and forms for each section.

### Implementation

```tsx
"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const settingsNav = [
  { href: "/settings/profile", label: "Profile" },
  { href: "/settings/account", label: "Account" },
  { href: "/settings/appearance", label: "Appearance" },
  { href: "/settings/notifications", label: "Notifications" },
  { href: "/settings/display", label: "Display" },
  { href: "/settings/billing", label: "Billing" },
];

function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6 p-6 lg:p-10">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>
      <Separator />
      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Sidebar nav */}
        <nav className="flex lg:w-48 lg:flex-col gap-1">
          {settingsNav.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start",
                  pathname === item.href && "bg-muted font-medium",
                )}
              >
                {item.label}
              </Button>
            </Link>
          ))}
        </nav>
        {/* Content */}
        <div className="flex-1 max-w-2xl">{children}</div>
      </div>
    </div>
  );
}

// Individual settings page
function NotificationSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Notifications</h3>
        <p className="text-sm text-muted-foreground">
          Configure how you receive notifications.
        </p>
      </div>
      <Separator />
      <NotificationSettingsForm />
    </div>
  );
}
```

### Key details
- Sidebar is a vertical `nav` on desktop (lg:), horizontal scrollable on mobile.
- Active item gets `bg-muted` and `font-medium`.
- Content area is max-width 2xl to prevent forms from stretching too wide.
- Each section page has a heading, description, separator, then the form.
- Forms use the same react-hook-form + Zod pattern from the forms section above.
- Save button per section (not a global save). Each section submits independently.

Failure mode: putting all settings in one massive form with a single save button at the bottom. Users lose context. Also: using a modal for settings (not enough space for complex preferences).

## Onboarding flows

When to use: first-run experience after signup. Use a checklist pattern (not a mandatory blocking tutorial). Users should be able to skip and return later.

### Implementation

```tsx
"use client";

import * as React from "react";
import { CheckCircle2, Circle, X, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type OnboardingStep = {
  id: string;
  title: string;
  description: string;
  action: string;
  href: string;
  completed: boolean;
};

function OnboardingChecklist() {
  const [steps, setSteps] = React.useState<OnboardingStep[]>([
    { id: "profile", title: "Complete your profile", description: "Add a photo and bio", action: "Set up", href: "/settings/profile", completed: false },
    { id: "team", title: "Invite your team", description: "Add at least one team member", action: "Invite", href: "/settings/team", completed: false },
    { id: "project", title: "Create your first project", description: "Start organizing your work", action: "Create", href: "/projects/new", completed: true },
    { id: "integration", title: "Connect an integration", description: "Slack, GitHub, or Jira", action: "Connect", href: "/settings/integrations", completed: false },
  ]);
  const [dismissed, setDismissed] = React.useState(false);

  const completedCount = steps.filter((s) => s.completed).length;
  const progress = Math.round((completedCount / steps.length) * 100);

  if (dismissed) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base">Get started</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {completedCount} of {steps.length} complete
          </p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDismissed(true)}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <Progress value={progress} className="h-2" />
        {steps.map((step) => (
          <div key={step.id} className="flex items-start gap-3 py-2">
            {step.completed ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className={cn("text-sm font-medium", step.completed && "line-through text-muted-foreground")}>
                {step.title}
              </p>
              <p className="text-xs text-muted-foreground">{step.description}</p>
            </div>
            {!step.completed && (
              <Button variant="outline" size="sm" className="shrink-0" asChild>
                <a href={step.href}>
                  {step.action} <ArrowRight className="ml-1 h-3 w-3" />
                </a>
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
```

### Tooltip tour pattern
For feature discovery on specific UI elements, use a tooltip tour library (e.g., `react-joyride` or build with Radix Popover):
1. Each tooltip highlights one feature at a time.
2. User can skip the tour at any step.
3. Tour state persists in localStorage/server so it does not repeat.
4. Max 5-7 stops. Shorter is better.

Failure mode: mandatory multi-step tutorial that blocks the app until completed. Users bounce. Also: onboarding that never goes away even after completion.

## Empty and error states

When to use: every data surface needs a designed empty state and error state. A blank page is a missed teaching opportunity.

### Empty state implementation

```tsx
import { FileText, Plus, Search, AlertTriangle, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

// No data yet
function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg border bg-card shadow-sm">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="max-w-sm space-y-1">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {action && (
        <Button onClick={action.onClick}>
          <Plus className="mr-2 h-4 w-4" />
          {action.label}
        </Button>
      )}
    </div>
  );
}

// Usage
<EmptyState
  icon={FileText}
  title="No projects yet"
  description="Create your first project to get started."
  action={{ label: "Create project", onClick: () => router.push("/projects/new") }}
/>

// No search results
<EmptyState
  icon={Search}
  title="No results found"
  description="Try adjusting your search or filters."
/>

// Error state
function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-destructive/20 bg-destructive/10">
        <AlertTriangle className="h-6 w-6 text-destructive" />
      </div>
      <div className="max-w-sm space-y-1">
        <h3 className="text-lg font-semibold">Something went wrong</h3>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
      <Button variant="outline" onClick={onRetry}>Try again</Button>
    </div>
  );
}

// Offline state
<EmptyState
  icon={WifiOff}
  title="You are offline"
  description="Check your connection and try again."
/>
```

### Rules
1. Every list/table/grid surface must have a designed empty state. Never a blank page.
2. Empty states have three parts: icon, title, description, and optionally a CTA.
3. The CTA teaches the user what to do next (create, import, connect).
4. "No results" for search/filter is different from "No data yet" for a fresh account.
5. Error states include a retry button. Never just an error message.
6. Icon container uses `border`, `bg-card`, `shadow-sm` to give it presence.

Failure mode: blank page with "No results" text. Users do not know if the feature is broken or empty. Also: error messages with no retry button.

## Skeleton loading matched to content shape

When to use: loading states for any content-heavy surface. Skeletons reduce perceived load time by showing the structure of what is coming. The skeleton must match the shape of the real content.

### Implementation

```tsx
import { Skeleton } from "@/components/ui/skeleton";

// Skeleton for a card grid
function DashboardSkeleton() {
  return (
    <div className="space-y-4 p-6">
      {/* KPI row skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
      {/* Chart skeleton */}
      <div className="rounded-lg border p-4">
        <Skeleton className="h-4 w-24 mb-4" />
        <Skeleton className="h-[350px] w-full" />
      </div>
    </div>
  );
}

// Skeleton for a table
function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-md border">
      {/* Header */}
      <div className="flex border-b px-4 py-3 gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, ri) => (
        <div key={ri} className="flex border-b last:border-b-0 px-4 py-3 gap-4">
          {Array.from({ length: cols }).map((_, ci) => (
            <Skeleton key={ci} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

// Skeleton for a form
function FormSkeleton() {
  return (
    <div className="max-w-md space-y-7">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
      <Skeleton className="h-9 w-24" />
    </div>
  );
}

// Skeleton for a chat message list
function ChatSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {[true, false, true, false].map((isUser, i) => (
        <div key={i} className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <Skeleton className={`h-12 rounded-lg ${isUser ? "w-48" : "w-64"}`} />
        </div>
      ))}
    </div>
  );
}
```

### Rules
1. Skeleton width and height must approximate the real content. A stat tile skeleton should be the same width as a stat tile.
2. Use `animate-pulse` (built into shadcn Skeleton). Duration 2s, infinite.
3. Text skeletons are `h-4` (body) or `h-6` (heading) with varied widths.
4. Avatar skeletons are `rounded-full`.
5. Never show a spinner AND a skeleton. Pick one.
6. Skeleton should disappear with a quick fade (150ms opacity transition), not a hard cut.
7. Keep skeleton count equal to the expected loaded count (e.g., 4 KPI tiles = 4 skeleton tiles).

Failure mode: a skeleton that does not match the content shape (e.g., 3 skeleton rows but 10 rows load). Also: a centered spinner on a content-rich page.

## Virtualized infinite lists

When to use: lists with 1000+ items, feeds, logs. @tanstack/react-virtual renders only visible items plus overscan buffer.

### Implementation

```tsx
"use client";

import * as React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

type ListItem = { id: string; title: string; description: string };

function InfiniteVirtualList() {
  const parentRef = React.useRef<HTMLDivElement>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["items"],
    queryFn: async ({ pageParam = 0 }) => {
      const res = await fetch(`/api/items?cursor=${pageParam}&limit=50`);
      return res.json() as Promise<{ items: ListItem[]; nextCursor: number | null }>;
    },
    getNextPageParam: (last) => last.nextCursor,
    initialPageParam: 0,
  });

  const allItems = data?.pages.flatMap((p) => p.items) ?? [];

  const virtualizer = useVirtualizer({
    count: hasNextPage ? allItems.length + 1 : allItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72, // estimated row height
    overscan: 5,
  });

  const virtualItems = virtualizer.getVirtualItems();

  // Fetch next page when scrolling near the end
  React.useEffect(() => {
    const lastItem = virtualItems[virtualItems.length - 1];
    if (!lastItem) return;
    if (lastItem.index >= allItems.length - 1 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [virtualItems, allItems.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto rounded-md border">
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}>
        {virtualItems.map((vItem) => {
          const isLoaderRow = vItem.index >= allItems.length;
          const item = allItems[vItem.index];

          return (
            <div
              key={vItem.key}
              className="absolute left-0 right-0 border-b px-4 py-3"
              style={{
                height: `${vItem.size}px`,
                transform: `translateY(${vItem.start}px)`,
              }}
            >
              {isLoaderRow ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### Key details
- Items are positioned with `position: absolute` + `transform: translateY`.
- The container div has `height: totalSize` to create correct scrollbar proportions.
- `overscan: 5` renders 5 extra items above/below the viewport to prevent flicker.
- Infinite loading triggers when the last virtual item index approaches the data length.
- `estimateSize` should match the actual row height closely (measure once, pass the value).

Failure mode: rendering all DOM nodes for a large list. Also: using `top` instead of `transform: translateY` for positioning (causes paint-on-every-scroll instead of compositor-only updates).

## Faceted filter panels with URL state

When to use: any list/table with multiple filter dimensions (status, category, date range, tags). Filters sync to URL search params so they survive refresh, back/forward, and sharing.

### Implementation

```tsx
"use client";

import * as React from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Check, PlusCircle, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

type FilterOption = { label: string; value: string; icon?: React.ElementType };

function FacetedFilter({
  title,
  paramKey,
  options,
}: {
  title: string;
  paramKey: string;
  options: FilterOption[];
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const selected = new Set(searchParams.getAll(paramKey));

  function toggleValue(value: string) {
    const params = new URLSearchParams(searchParams);
    if (selected.has(value)) {
      params.delete(paramKey, value);
    } else {
      params.append(paramKey, value);
    }
    router.replace(`${pathname}?${params.toString()}`);
  }

  function clearAll() {
    const params = new URLSearchParams(searchParams);
    params.delete(paramKey);
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 border-dashed">
          <PlusCircle className="mr-2 h-4 w-4" />
          {title}
          {selected.size > 0 && (
            <>
              <Separator orientation="vertical" className="mx-2 h-4" />
              <Badge variant="secondary" className="rounded-sm px-1 font-normal tabular-nums">
                {selected.size}
              </Badge>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-0" align="start">
        <Command>
          <CommandInput placeholder={`Search ${title.toLowerCase()}...`} />
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => {
                const isSelected = selected.has(opt.value);
                return (
                  <CommandItem key={opt.value} onSelect={() => toggleValue(opt.value)}>
                    <div className={cn(
                      "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                      isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible",
                    )}>
                      <Check className="h-3 w-3" />
                    </div>
                    {opt.icon && <opt.icon className="mr-2 h-4 w-4 text-muted-foreground" />}
                    <span>{opt.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {selected.size > 0 && (
              <>
                <Separator />
                <CommandGroup>
                  <CommandItem onSelect={clearAll} className="justify-center text-center">
                    Clear filters
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Filter toolbar combining multiple facets
function FilterToolbar() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const hasFilters = searchParams.toString().length > 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <FacetedFilter
        title="Status"
        paramKey="status"
        options={[
          { label: "Todo", value: "todo" },
          { label: "In Progress", value: "in-progress" },
          { label: "Done", value: "done" },
        ]}
      />
      <FacetedFilter
        title="Priority"
        paramKey="priority"
        options={[
          { label: "Low", value: "low" },
          { label: "Medium", value: "medium" },
          { label: "High", value: "high" },
        ]}
      />
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={() => router.replace(pathname)}>
          Reset <X className="ml-1 h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
```

### URL state integration with TanStack Table
```tsx
// Read filters from URL and feed to table
const searchParams = useSearchParams();
const statusFilter = searchParams.getAll("status");
const columnFilters = [
  ...(statusFilter.length ? [{ id: "status", value: statusFilter }] : []),
];
// Pass to useTable({ state: { columnFilters } })
```

Failure mode: storing filter state only in React state (lost on refresh). Also: a Reset button that does not clear URL params.

## Inline edit with optimistic rollback

When to use: editing a single cell or field in a table/list without navigating away. The edit appears instant (optimistic); if the server rejects, the old value is restored.

### Implementation

```tsx
"use client";

import * as React from "react";
import { Check, X, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function InlineEditCell({
  value: initialValue,
  onSave,
}: {
  value: string;
  onSave: (value: string) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [value, setValue] = React.useState(initialValue);
  const [previousValue, setPreviousValue] = React.useState(initialValue);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  async function handleSave() {
    if (value === previousValue) {
      setIsEditing(false);
      return;
    }

    // Optimistic: show new value immediately
    setIsEditing(false);
    const optimisticValue = value;

    try {
      await onSave(optimisticValue);
      setPreviousValue(optimisticValue);
    } catch {
      // Rollback
      setValue(previousValue);
      toast.error("Failed to save. Changes reverted.");
    }
  }

  function handleCancel() {
    setValue(previousValue);
    setIsEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") handleCancel();
  }

  if (!isEditing) {
    return (
      <div className="group flex items-center gap-1">
        <span className="text-sm">{value}</span>
        <Button
          variant="ghost" size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => setIsEditing(true)}
        >
          <Pencil className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleSave}
        className="h-7 text-sm"
      />
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleSave}>
        <Check className="h-3 w-3" />
      </Button>
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCancel}>
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
```

### Rules
1. Click or pencil icon enters edit mode. The display text becomes an input.
2. Enter saves. Escape cancels. Blur saves (debatable, but standard).
3. The new value shows immediately (optimistic). If the API call fails, the old value is restored and a toast explains the rollback.
4. The pencil icon is hidden until hover (`opacity-0 group-hover:opacity-100`).
5. Input gets focus immediately on entering edit mode.
6. Tab should move to the next editable cell (if in a table context).

Failure mode: navigating to a separate edit page for a single field change. Also: not rolling back on server error (user sees saved data that is not actually saved).

## Notification centers

When to use: a persistent feed of notifications (unlike toasts, which auto-dismiss). Notification centers live in a popover in the app header.

### Implementation

```tsx
"use client";

import * as React from "react";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type Notification = {
  id: number;
  user: string;
  action: string;
  target: string;
  timestamp: string;
  unread: boolean;
};

function NotificationCenter() {
  const [notifications, setNotifications] = React.useState<Notification[]>([
    { id: 1, user: "Alice", action: "commented on", target: "PR #42", timestamp: "15m ago", unread: true },
    { id: 2, user: "Bob", action: "assigned you to", target: "API task", timestamp: "4h ago", unread: true },
    { id: 3, user: "Carol", action: "mentioned you in", target: "Standup notes", timestamp: "2d ago", unread: false },
  ]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  }

  function markRead(id: number) {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, unread: false } : n));
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-full" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground tabular-nums">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-2">
          <h4 className="text-sm font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllRead}>
              <Check className="mr-1 h-3 w-3" /> Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">No notifications</p>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => markRead(n.id)}
                className={cn(
                  "flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-muted/50",
                  n.unread && "bg-primary/5",
                )}
              >
                {n.unread && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                )}
                <div className={cn("flex-1 min-w-0", !n.unread && "ml-5")}>
                  <p className="text-sm">
                    <span className="font-medium">{n.user}</span>{" "}
                    {n.action} <span className="font-medium">{n.target}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.timestamp}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

### Key details
- Unread count badge uses `tabular-nums` to prevent width jitter as the number changes.
- Unread items have a small blue dot and a subtle background tint.
- "Mark all read" clears the unread state.
- Max height with scroll on the popover body (never let the notification list push the popover taller than the viewport).
- Individual click marks that notification as read.

Failure mode: using toasts as persistent notifications (they auto-dismiss and are gone). Also: no "mark all read" action.

## Analytics chart suites

When to use: any KPI visualization in dashboards. Recharts is the standard library in the shadcn ecosystem. The ChartContainer component handles theming, responsive sizing, and dark mode.

### Chart configuration pattern

```tsx
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig,
} from "@/components/ui/chart";
import {
  Area, AreaChart, Bar, BarChart, Line, LineChart, Pie, PieChart,
  CartesianGrid, XAxis, YAxis, ResponsiveContainer, Cell, Legend,
} from "recharts";

// Config maps data keys to labels and colors
const chartConfig: ChartConfig = {
  revenue: { label: "Revenue", color: "hsl(var(--chart-1))" },
  expenses: { label: "Expenses", color: "hsl(var(--chart-2))" },
};
```

### Area chart

```tsx
function RevenueChart({ data }: { data: { month: string; revenue: number; expenses: number }[] }) {
  return (
    <ChartContainer config={chartConfig} className="h-[300px]">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
        <XAxis dataKey="month" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false}
          tickFormatter={(v) => `$${v / 1000}k`} />
        <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
        <Area type="monotone" dataKey="revenue" stackId="a"
          fill="var(--color-revenue)" fillOpacity={0.3} stroke="var(--color-revenue)" strokeWidth={2} />
        <Area type="monotone" dataKey="expenses" stackId="a"
          fill="var(--color-expenses)" fillOpacity={0.3} stroke="var(--color-expenses)" strokeWidth={2} />
      </AreaChart>
    </ChartContainer>
  );
}
```

### Bar chart

```tsx
function MonthlyBarChart({ data }: { data: { name: string; total: number }[] }) {
  return (
    <ChartContainer config={{ total: { label: "Revenue", color: "hsl(var(--chart-1))" } }} className="h-[350px]">
      <BarChart data={data}>
        <XAxis dataKey="name" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false}
          tickFormatter={(v) => `$${v}`} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="total" fill="var(--color-total)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
```

### Line chart

```tsx
function TrendLineChart({ data }: { data: { date: string; value: number }[] }) {
  return (
    <ChartContainer config={{ value: { label: "Users", color: "hsl(var(--chart-1))" } }} className="h-[300px]">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
        <XAxis dataKey="date" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line type="monotone" dataKey="value" stroke="var(--color-value)"
          strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
      </LineChart>
    </ChartContainer>
  );
}
```

### Donut chart

```tsx
function StatusDonut({ data }: { data: { name: string; value: number; color: string }[] }) {
  const config: ChartConfig = Object.fromEntries(
    data.map((d) => [d.name, { label: d.name, color: d.color }])
  );

  return (
    <ChartContainer config={config} className="h-[200px] w-[200px]">
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent />} />
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={80} strokeWidth={2}>
          {data.map((d) => (
            <Cell key={d.name} fill={d.color} />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}
```

### Rules
1. Y-axis on bar charts starts at zero. Truncating the Y-axis exaggerates visual variance and is misleading.
2. Chart tooltips work on hover AND tap AND keyboard focus.
3. Every chart has an empty state, loading skeleton, and error state.
4. Color palette is diverging or qualitative and colorblind-safe. Never rely on red/green alone.
5. `ChartContainer` generates CSS custom properties for each config key, enabling dark mode color switching.
6. Sparklines (inline trend indicators) are 60-120px wide, 16-24px tall, no axes, no tooltip.

Failure mode: 3D charts, rainbow gradients, pie charts with more than 6 slices (use a horizontal bar chart instead). Also: tooltips that only work on hover (inaccessible on mobile and keyboard).

## Composition

These sub-topics combine into real pages. The most common compositions:

### Dashboard page
```
[Header with command palette + notifications]
[4-column KPI stat tiles]
[2/3 chart + 1/3 recent activity list]
[Full-width data table with faceted filters]
```

### CRUD admin page
```
[Header with breadcrumbs + "Add New" button]
[Filter toolbar with faceted filters]
[Data table with sort, select, inline edit, row actions]
[Pagination]
[Empty state when no data]
```

### Settings page
```
[Page title + description]
[Sidebar nav | Form section content]
[Save button per section]
```

### Onboarding + empty dashboard
```
[Onboarding checklist card]
[Empty state cards for each dashboard section]
```

### Conflict rules
- Toast and dialog should not appear simultaneously for the same action. If a dialog confirms a destructive action, the toast confirms after the dialog closes.
- Command palette (z-50) must be above modals (z-50). If both are open, close the command palette first.
- Skeleton loading replaces the entire content area. Do not show a skeleton AND partial real content.
- Multiple popovers (notification center + dropdown) should not stack. Opening one closes the other.

## Performance budget

| Target | Budget | Lever |
|---|---|---|
| First Contentful Paint | < 1.5s | Server components, streaming |
| Interaction to Next Paint (INP) | < 200ms | Avoid layout thrash on click |
| JS bundle (per route) | < 100kB gzipped | Lazy load heavy components (charts, data table) |
| DOM nodes on initial load | < 1500 | Virtualize lists > 50 items |
| TanStack Table re-render | < 16ms | Memoize columns, stable references |
| Chart render | < 200ms | Limit data points to 100-200 per chart |
| Toast queue | Max 3 visible | Auto-dismiss at 5s |

### What to cut first when over budget
1. Remove chart animations (the first thing to go).
2. Reduce data table default page size (50 -> 20).
3. Lazy load the chart library (`dynamic(() => import("recharts"), { ssr: false })`).
4. Replace inline sparklines with static trend arrows.
5. Defer notification center load to after first paint.

## Accessibility

### Required for all surfaces
```tsx
// Skip to content link - first element in layout
<a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:shadow-md">
  Skip to content
</a>

// Main content landmark
<main id="main" tabIndex={-1}>
  {/* page content */}
</main>
```

### Focus visible on all interactive elements
```css
*:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}
```

### Reduced motion
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Data table accessibility
- Column headers use `scope="col"`.
- Sortable columns announce sort direction via `aria-sort`.
- Row selection checkboxes have `aria-label="Select row"`.
- Pagination buttons have `aria-label="Go to previous/next page"`.
- Empty state is announced: `role="status"` on the "No results" row.

### Dialog/modal accessibility
- `role="dialog"` and `aria-modal="true"` (Radix handles automatically).
- `aria-labelledby` points to the dialog title.
- `aria-describedby` points to the dialog description.
- Focus trap: Tab cycles within the dialog.
- Escape to close.

### Toast accessibility
- Toasts are announced via `role="status"` and `aria-live="polite"`.
- Action buttons within toasts are keyboard-focusable.
- Auto-dismiss pauses while the toast has focus.

## Anti-slop rules

1. DO NOT use `window.confirm()` or `window.alert()`. Use AlertDialog.
2. DO NOT mix proportional and tabular-nums on the same page.
3. DO NOT use serifs in data UI typography. Neo-grotesque sans only.
4. DO NOT wrap every metric in a Card with 24px padding at cockpit density. Use hairlines.
5. DO NOT use green for decoration. Green = up/live/success only.
6. DO NOT render more than 500 DOM nodes in a list without virtualizing.
7. DO NOT store filter state only in React state. Sync to URL params.
8. DO NOT use toasts for errors that require user action. Inline the error or use AlertDialog.
9. DO NOT auto-scroll the chat when the user has scrolled up to read history.
10. DO NOT use `fetch()` for file uploads without progress feedback. Use XHR.
11. DO NOT show a mandatory multi-step tutorial that blocks the app. Use a dismissible checklist.
12. DO NOT show a blank page as an empty state. Every surface needs an empty state with a CTA.
13. DO NOT use `window.scrollTo` or force scroll inside a modal. Radix handles scroll lock.
14. DO NOT put all settings in one massive form with a single save button.
15. DO NOT use HTML5 drag-and-drop API for Kanban. Use dnd-kit.
16. DO NOT open command palette inside focused inputs or textareas.
17. DO NOT stack more than 2 modal layers. If you need a third, rethink the UX.
18. DO NOT use `top` positioning for virtualized list items. Use `transform: translateY`.
19. DO NOT use pie charts with more than 6 slices. Use a horizontal bar chart.
20. DO NOT forget `aria-label` on icon-only buttons.
21. DO NOT truncate Y-axis on bar charts. Start at zero.
22. DO NOT use a centered spinner for content-heavy page loads. Use skeleton.
23. DO NOT forget the "Today" button on calendar navigation.

## Ship checklist

- [ ] Every data table has sort, filter, pagination, and empty state
- [ ] All numeric displays use `tabular-nums` / `font-mono`
- [ ] Forms use react-hook-form + Zod with per-field error messages
- [ ] Wizard state survives page refresh (URL-backed or sessionStorage)
- [ ] Dialogs trap focus and return focus to trigger on close
- [ ] AlertDialog used for destructive confirmations (not Dialog)
- [ ] Toasts queue max 3, auto-dismiss 5s, hover pauses timer
- [ ] Destructive toasts have Undo action with 6s+ duration
- [ ] Command palette opens with Cmd+K, does not trigger in inputs
- [ ] Kanban uses dnd-kit with DragOverlay (not HTML5 DnD)
- [ ] Calendar shows today highlight and "+N more" on overflow days
- [ ] File upload shows per-file progress, retry on error, cancel
- [ ] Chat scroll anchors to bottom only when user is already at bottom
- [ ] Settings use sidebar nav with per-section save
- [ ] Onboarding checklist is dismissible and tracks completion
- [ ] Every list/table has a designed empty state with CTA
- [ ] Every list/table has a designed error state with retry button
- [ ] Skeletons match content shape (same count, similar dimensions)
- [ ] Lists with 500+ items are virtualized
- [ ] Faceted filters sync to URL search params
- [ ] Inline edit uses optimistic update with rollback on error
- [ ] Notification center has mark-all-read and unread indicator
- [ ] Charts have tooltips on hover, tap, and keyboard focus
- [ ] Chart Y-axes start at zero for bar charts
- [ ] Skip-to-content link is the first focusable element
- [ ] `focus-visible` rings on all interactive elements
- [ ] `prefers-reduced-motion` disables all animation
- [ ] All icon-only buttons have `aria-label`
- [ ] Sortable table headers announce sort direction via `aria-sort`
- [ ] Page loads under 1.5s FCP, under 200ms INP
