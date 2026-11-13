# DESIGN — [App name]

Visual and interaction spec for the app. The reference screens are the four concept artboards: **Dashboard**, **Project · Kanban**, **All tasks · Table**, **Quick capture · AI preview**. When building, match those screens; when something isn't covered there, follow the rules below.

> **For the coding agent:** use only the tokens in this file. Do not introduce new colours, font sizes, radii or shadows. Every colour below is a default Tailwind colour, so no custom colour config is needed.

---

## 1. Principles

1. **Quiet by default.** Neutral greys, white surfaces, one accent (blue). Colour carries meaning, never decoration.
2. **Content over chrome.** No gradients, no heavy shadows, no icons where a word is clearer. Borders, not boxes inside boxes.
3. **One action stands out.** Each screen or panel has at most one dark primary button.
4. **Keyboard first.** Everything reachable and operable without a mouse; shortcuts shown as subtle `kbd` chips.
5. **AI is a proposal, never a surprise.** Anything the AI produces appears in the preview panel before it touches data.

---

## 2. Design tokens

### 2.1 Colour

| Token | Hex | Tailwind | Use |
|---|---|---|---|
| `bg-page` | #fafafa | `zinc-50` | App background |
| `surface` | #ffffff | `white` | Sidebar, cards, panels, inputs |
| `ink` | #18181b | `zinc-900` | Primary text, primary button background, logo mark |
| `text-strong` | #3f3f46 | `zinc-700` | Body text in reviews, badge text |
| `text-secondary` | #52525b | `zinc-600` | Secondary text, inactive view tabs |
| `text-meta` | #71717a | `zinc-500` | Meta (counts, estimates, labels) — minimum 12 px |
| `border` | #e4e4e7 | `zinc-200` | All borders and dividers |
| `divider-soft` | #f4f4f5 | `zinc-100` | Row separators, chip fills, active nav background, progress track |
| `placeholder` | #a1a1aa | `zinc-400` | Decorative dots only — **never text** (fails contrast) |
| `accent` | #2563eb | `blue-600` | Links, progress fill, checkboxes, P2, focus ring |
| `accent-soft` | #eff6ff / #bfdbfe | `blue-50` / `blue-200` | Active milestone pill fill / border |
| `warn` | #c2410c | `orange-700` | Overdue dates, P1, overdue group label |
| `overlay` | #18181b at 40–50% | `zinc-900/50` | Modal backdrop |

Rules:
- Overdue and P1 always use `orange-700`; never red. Meaning is also carried by text ("Overdue", "P1"), never colour alone.
- Do not use green for "done"; done items are de-emphasised (strikethrough optional, `text-zinc-500`).

### 2.2 Typography

Font: **Inter** (400, 500, 600), fallback `system-ui, -apple-system, "Segoe UI", sans-serif`.

| Role | Size / weight | Tailwind |
|---|---|---|
| Page title | 24 px / 600, tracking −0.01em | `text-2xl font-semibold tracking-tight` |
| Section / panel title | 15 px / 600 | `text-[15px] font-semibold` |
| Body, task titles | 14 px / 400 | `text-sm` |
| Buttons, table cells, chips | 13 px / 400–500 | `text-[13px]` |
| Meta, labels, group headers | 12 px / 400–500 | `text-xs` |
| Tiny labels (field captions, status kind) | 11 px | `text-[11px]` — only in zinc-500 or darker |

Line height: `leading-normal` (1.5) for paragraphs, default elsewhere.

### 2.3 Spacing, radius, elevation

- Spacing scale: 4 px base. Common values: 8, 12, 16, 20, 24, 32 (`2, 3, 4, 5, 6, 8`).
- Page padding: 32 px horizontal, 24 px top (`px-8 pt-6`). Content max-width 1120 px on the dashboard (`max-w-[1120px] mx-auto`).
- Gaps: 24 px between major sections, 12 px within panels.

| Radius | Use | Tailwind |
|---|---|---|
| 6 px | Badges, kbd, small chips | `rounded-md` |
| 8 px | Buttons, nav items, rows | `rounded-lg` |
| 10 px | Inputs, capture bar, Kanban cards | `rounded-[10px]` |
| 12 px | Panels, project cards, proposal items | `rounded-xl` |
| 16 px | Modals | `rounded-2xl` |
| full | Milestone pills | `rounded-full` |

Elevation: flat. Borders (`border border-zinc-200`) separate surfaces. Only two shadows exist:
- Active segmented tab: `shadow-sm`.
- Modal: `shadow-2xl`.

### 2.4 Sizing & targets

- Interactive targets ≥ 40 px tall (`min-h-10`); task rows and table rows 44–48 px.
- Checkboxes 16 px, `accent-blue-600`.
- Sidebar ~220–240 px wide.

---

## 3. Layout

**App shell** (all screens): left sidebar + main content in a wrapping flex row.
- Sidebar (`bg-white border-r border-zinc-200 px-3 py-5`): logo mark (22 px `zinc-900` square, `rounded-md`) + app name; primary nav (Dashboard, Inbox, Today, All tasks, Reviews) with right-aligned counts; "Projects" label + project list with a small dot; Settings pinned to bottom.
- Active nav item: `bg-zinc-100 font-medium`.
- Main: `flex-1 min-w-0 px-8 pt-6 pb-12`.
- Below ~900 px the sidebar stacks above content (no hamburger needed for v1, since the PRD targets ≥ 1280 px).

---

## 4. Components

Preline column names the closest Preline UI component to start from; restyle it to these tokens.

| Component | Spec | Preline starting point |
|---|---|---|
| **Sidebar / NavItem** | 40 px rows, 14 px text, count in `text-xs text-zinc-500` | Sidebar (Application layout) |
| **CaptureBar** | White, `border-zinc-200 rounded-[10px] min-h-12 px-3`; plus icon (zinc-500), borderless input, `Ctrl K` kbd chip on the right. Placeholder shows an example: "reply to ZD-48213 tomorrow 10am p1 30m" | Input with add-on |
| **Kbd** | `text-xs text-zinc-600 border border-zinc-200 rounded-md px-1.5 py-0.5` | — |
| **Button / primary** | `bg-zinc-900 text-white rounded-lg min-h-10 px-3.5 text-[13px]` — one per panel | Buttons (solid) |
| **Button / secondary** | `bg-white border border-zinc-200 text-zinc-900 rounded-lg min-h-10 px-3.5 text-[13px]` | Buttons (white) |
| **ViewSwitcher** | Segmented control: track `bg-zinc-100 rounded-lg p-[3px]`; tabs `min-h-9 px-3.5 text-[13px]`; active `bg-white shadow-sm font-medium text-zinc-900`, inactive `text-zinc-600`. Uses `aria-pressed`. Order: List · Table · Kanban | Button group |
| **TaskRow** (List view) | 44 px min, `px-3 rounded-lg border-t border-zinc-100`; checkbox · title (14 px, flexible) · meta cluster (12 px zinc-500, gap 8): LinkBadge, ↻ repeat, estimate, PriorityLabel, DueLabel, LocationChip. Meta wraps under title when narrow | List group |
| **GroupHeader** | 12 px / 500, label + count; Overdue label in `orange-700` | — |
| **PriorityLabel** | Text only, 12 px / 500: P1 `orange-700`, P2 `blue-600`, P3 `zinc-500` | — |
| **DueLabel** | 12 px; `orange-700` when overdue, else `zinc-500` (List) / `zinc-700` (Table). Formats: "10:00" (today with time), "Today", "Mon 16 Nov", "Thu 12 Nov" | — |
| **LocationChip** | Project name or "Inbox": `bg-zinc-100 text-zinc-700 rounded-md px-2 py-0.5 text-xs` | Badge (soft) |
| **LinkBadge** | Short ID derived from URL ("ZD-48213", "OPS-112"): `border border-zinc-200 rounded-md px-1.5 text-xs text-zinc-700`; opens in new tab | Badge (outline) |
| **StatusChip** (Table) | `bg-zinc-100 text-zinc-700 rounded-md px-2 py-0.5` | Badge (soft) |
| **ProjectCard** | White panel `rounded-xl px-[18px] py-4 gap-2.5`: name (14/600) + % (12, zinc-600); current milestone (12, zinc-500); ProgressBar; footer "11 of 19 tasks" · "Next: …" (12, zinc-600). Whole card is a link | Card |
| **ProgressBar** | Track `h-1.5 bg-zinc-100 rounded-full`, fill `bg-blue-600` | Progress |
| **MilestonePill** | `rounded-full border min-h-10 px-3.5 text-[13px]`: name (500) + state (zinc-600: "Done", "7 of 12", "Not started"). Current milestone: `bg-blue-50 border-blue-200`; others white/zinc-200. "Add milestone" pill uses dashed `border-zinc-300` | Badge / Button |
| **KanbanColumn** | Header: name (13/600) + count (zinc-500) + category tag (11 px outline: Open / Active / Done); cards stacked with 10 px gap; "+ Add task" ghost button at bottom. Columns min 210 px, horizontal scroll container | — (custom + dnd-kit) |
| **KanbanCard** | White, `border-zinc-200 rounded-[10px] px-3.5 py-3 gap-2.5`: title (14, leading-snug); meta row (Priority, Due, Estimate, ↻); optional footer (☑ 1/4 checklist, LinkBadge). Dragging: `shadow-md`, slight opacity on origin | Card |
| **DataTable** | White panel `rounded-xl` with `overflow-x-auto`; header 13 px / 500 zinc-600 with bottom border; rows 48 px, `border-b border-zinc-100`; columns: ☐ · Task · Project · Milestone · Status · Priority · Due · Estimate · Repeat · Links. Footer line under table in 12 px zinc-500 ("10 of 51 open tasks · sorted by due date") | Table |
| **FilterChip** | Secondary-button style, label "Field: value" (e.g. "Status: Open, Active"); opens a dropdown | Dropdown |
| **ReviewCard** | Panel: title "Daily review" (15/600) + "Generated automatically at 07:30 · Daily review model" (12, zinc-500); actions Regenerate (secondary) + Open review (primary); 2–4 bullet insights, 14 px zinc-700 | Card |
| **ProposalModal** (AI preview) | Backdrop `zinc-900/50`; modal `max-w-[760px] rounded-2xl shadow-2xl`. Header: title + "Parsed by: <feature> model · Change in Settings". Input textarea `rounded-[10px]`. Body: "N tasks proposed" + per-item ProposalItem. Footer: hint "Enter to add · Esc to cancel · nothing is saved until you confirm"; Discard (secondary) + "Add N tasks" (primary; N updates with ticked items) | Modal (Overlay) |
| **ProposalItem** | `border-zinc-200 rounded-xl px-4 py-3.5`: checkbox (default ticked) + editable title + tag ("New task" / "Update" / "Move" / "Delete" in zinc-100 chip); 4-column field grid (caption 11 px zinc-500, value 13 px) — Project, Milestone, Status, Priority, Due, Estimate, Repeat, Link; optional AI note in `bg-zinc-50 rounded-lg text-xs` explaining guesses | — |

### 4.1 Proposal panel — change types

The same modal is reused by capture, project breakdown and chat. Item tags:
- **New task / New milestone** — all fields shown.
- **Update** — show only changed fields as "old → new" (old in zinc-500 strikethrough).
- **Move** — "Inbox → Knowledge base cleanup · Audit".
- **Delete** — title in zinc-500 with strikethrough; never ticked by default.

---

## 5. Screens

### 5.1 Dashboard (home) — reference artboard "Dashboard"
1. CaptureBar (flex-1) + "Ask assistant" secondary button.
2. Header row: date as page title ("Friday, 13 November") + summary line right-aligned ("6 due today · 2 overdue · 3 in inbox").
3. ReviewCard (latest daily review).
4. Two columns (3 : 2, wrap below ~900 px):
   - **Tasks panel**: "Tasks" + "Open in table" link; groups Overdue → Today → Inbox · unsorted, each with TaskRows.
   - **Active projects**: "Active projects" + "New project" link; ProjectCards.

### 5.2 Project detail — reference artboard "Project · Kanban"
1. Breadcrumb "Projects / <name>" (13 px zinc-500).
2. Title row: project name (24/600) + "Break down with AI" (secondary) + "New task" (primary).
3. Description (14 px zinc-600, max-width 720 px).
4. Milestone pills row + "Add milestone".
5. Toolbar: ViewSwitcher (left) + "Showing: <milestone>" (right), bottom border.
6. View body: Kanban (columns = global statuses in order), List or Table.

### 5.3 All tasks — reference artboard "All tasks · Table"
Title + ViewSwitcher; filter row (search input 240 px + FilterChips); DataTable; footer count line.

### 5.4 Quick capture — reference artboard "Quick capture · AI preview"
Opened by `Ctrl K` (or `⌘K`). Two modes:
- **Plain:** type + Enter → saved straight to Inbox; modal closes.
- **AI:** `Ctrl Enter` (or a toggle) → shows loading state, then ProposalItems; Enter confirms, Esc cancels.

### 5.5 Not yet mocked (follow the same tokens)
- **Inbox / Today:** List view of TaskRows with the same header pattern as All tasks.
- **Reviews:** left list of past reviews (date + type), right pane with review content; "Generate now" primary button.
- **Chat:** right-side drawer (Preline Offcanvas), 420 px; messages as plain text blocks (assistant on white, user on `zinc-100` rounded-xl); input at bottom; any proposed changes open the ProposalModal.
- **Settings:** single column, max-width 720 px, sections separated by `border-t`: *Statuses* (sortable rows: name, category select, delete), *AI providers* (key status "Configured / Not configured", test button), *AI features* (rows: Capture, Breakdown, Daily review, Weekly review, Chat — each with provider select + model select), *Schedules* (daily time, weekly day/time), *Privacy* (projects excluded from AI), *Data* (Backup now, Restore, Export).
- **Task detail:** right-side drawer (Offcanvas) with all fields, checklist and links; opens on clicking a task title.

---

## 6. States

| State | Treatment |
|---|---|
| Empty list | One line of zinc-500 text + one secondary action (e.g. "Inbox is empty. Press Ctrl K to capture."). No illustrations. |
| AI loading | Proposal area shows "Thinking…" with a small spinner (Preline Spinner, zinc-400 border only) and a Cancel button. |
| AI error | Inline message in zinc-700 on `bg-zinc-50 rounded-lg`: what failed + Retry. Never a toast that disappears. |
| AI not configured | AI buttons remain visible but open a short message linking to Settings. |
| Saving | Optimistic update; on failure, revert and show inline error. |
| Done tasks | Checkbox ticked, title `text-zinc-500 line-through`, moves to bottom of group. |
| Focus | `focus-visible:ring-2 ring-blue-600 ring-offset-2` on all interactive elements. |

---

## 7. Accessibility checklist

- Real `<button>`, `<a>`, `<input>` and `<label>` everywhere; never click handlers on `div`/`span`.
- Icon-only buttons have `aria-label`.
- View switcher uses `aria-pressed`; modal uses Preline's focus trap and returns focus on close.
- Kanban drag-and-drop has a keyboard alternative (status select in the card menu, or dnd-kit keyboard sensor).
- Text contrast ≥ 4.5:1: never put text in `zinc-400` or lighter.

---

## 8. Do / Don't for the coding agent

**Do**
- Build shared components first (Button, Badge, Kbd, TaskRow, PriorityLabel, DueLabel, ViewSwitcher) and reuse them across views.
- Compare each finished screen against its reference artboard before moving on.
- Keep Inter loaded once in `index.html`.

**Don't**
- Add colours, gradients, emoji or decorative icons.
- Add shadows to cards or panels.
- Use red/green to signal state.
- Put more than one primary (dark) button in a panel.
