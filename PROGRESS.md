# PROGRESS — [App name]

Working log for the build. Read after `docs/PRD.md`, `docs/TECHSTACK.md` and
`docs/DESIGN.md` at the start of every session.

- **Last updated:** 13 Nov 2026
- **Current step:** M1-S8 (next) — statuses settings, recurrence service + tests
- **Spec sources:** `docs/PRD.md` (behaviour), `docs/TECHSTACK.md` (implementation), `docs/DESIGN.md` (visuals)

---

## Build order status

| Step | Scope | Status |
|---|---|---|
| M1-S1 | Workspaces, Vite, Hono, `/api` proxy, Tailwind + Preline + Inter | ✅ Done |
| M1-S2 | Drizzle schema, migrations, seed statuses | ✅ Done |
| M1-S3 | Shared components (DESIGN §4) | ✅ Done |
| M1-S4 | App shell, sidebar, routing | ✅ Done |
| M1-S5 | Tasks CRUD + plain capture (`Ctrl/⌘ K`) | ✅ Done |
| M1-S6 | Projects, milestones, checklist, links, tags, move-to-project | ✅ Done |
| M1-S7 | List / Table / Kanban + shared filters + dnd-kit | ✅ Done |
| M1-S8 | Statuses settings; recurrence service + tests | ⬜ Next |
| M1-S9 | Dashboard endpoint + screen | ⬜ |
| M1-S10 | Backup / restore | ⬜ |
| M2-S11–13 | Settings, AI client/proposals, AI capture + breakdown | ⬜ |
| M3-S14–15 | Reviews + scheduler, chat drawer | ⬜ |
| M4-S16 | Undo, export, sort/group, state audit | ⬜ |

---

## M1-S1 — Workspace setup ✅

### Built

- git repo on `main`; npm workspaces `shared`, `server`, `web`.
- `shared` (`@app/shared`) consumed as TypeScript source — no build step;
  exports `APP_NAME` from `src/constants.ts` (single rename point; also sets
  `document.title`).
- `server`: Hono + `@hono/node-server` bound to **127.0.0.1:8787**, CORS limited
  to the Vite origin, `GET /api/health`. Env loaded from the repo-root `.env` and
  validated with Zod; `DATABASE_PATH` resolved from the repo root.
- `web`: Vite + React 19 + TS, Tailwind 4 via `@tailwindcss/vite`, Preline 5 CSS
  variants + forms, self-hosted Inter 400/500/600.
- Vite on **127.0.0.1:5173** with `/api` proxy.
- `PrelineInit` runs `cleanCollection()` + `autoInit()` after render
  (StrictMode-safe).
- Root scripts `dev`, `dev:web`, `dev:server`, `typecheck`, `test`, `build`;
  Vitest configured.

### Verification performed

```bash
npm run typecheck   # clean
npm test            # exit 0
npm run build       # clean
npm run dev
curl -s http://127.0.0.1:8787/api/health
curl -s http://127.0.0.1:5173/api/health   # via proxy
lsof -nP -iTCP:8787 -sTCP:LISTEN           # 127.0.0.1 only
lsof -nP -iTCP:5173 -sTCP:LISTEN           # 127.0.0.1 only
```

Playwright: title `[App name]`, h1 24 px/600, Inter applied, `zinc-50`
background, `Server: ok`, no console errors.

### PRD IDs advanced

NFR-1, NFR-2, NFR-3, NFR-8 (foundation only).

---

## M1-S2 — Schema, migrations, seed statuses ✅

### Built

- **12 tables** in `server/src/db/schema.ts` covering TECHSTACK §4: `statuses`,
  `projects`, `milestones`, `tasks`, `checklist_items`, `task_links`, `tags`,
  `task_tags`, `reviews`, `ai_settings`, `app_settings`, `proposals`.
- Drizzle relations for projects → milestones → tasks, status, checklist, links
  and tags (used by services and, later, chat tools).
- Constraints and indexes:
  - `statuses.category` CHECK `open|active|done`; unique status name; position
    index.
  - `tasks.priority` CHECK `1|2|3`; estimate CHECK `> 0`; indexes on
    `(project_id, position)`, `status_id`, `(due_date, due_time)`,
    `completed_at`, `recurrence_parent_id`.
  - Unique tag name; composite PK `task_tags(task_id, tag_id)`.
  - CHECKs on `reviews.kind`, `ai_settings.feature|provider`,
    `proposals.feature|status`.
- Foreign-key actions: project → tasks `SET NULL`; milestone → tasks `SET NULL`;
  status → tasks `RESTRICT` (US-10); project → milestones `CASCADE`; checklist,
  links and tag links → `CASCADE` on task delete; recurrence parent `SET NULL`.
- Connection (`server/src/db/client.ts`): WAL, `synchronous = NORMAL`,
  `foreign_keys = ON`, `busy_timeout = 5000`.
- Seed (`server/src/db/seed-data.ts` + `seed.ts`), idempotent:
  - five statuses — Backlog (open), To do (open), In progress (active),
    Waiting (active), Done (done);
  - app settings — `daily_review_time=07:30`, `weekly_review_day=1` (ISO Monday),
    `weekly_review_time=07:30`.
- `db:generate` / `db:migrate` / `db:seed` / `db:studio` at root and in `server`.
- `/api/health` now reports `database: { ready, statuses }`.
- 9 Vitest tests: migrations apply, seed order/categories, seed idempotency,
  app-setting preservation, project-delete → Inbox, status-in-use deletion
  blocked, task-delete cascade, priority CHECK, tag uniqueness.

### Verification performed

```bash
npm run db:generate   # 12 tables, 0000_natural_manta.sql
npm run db:migrate    # applied successfully
npm run db:seed       # +5 statuses, +3 settings
npm run db:seed       # +0, +0 (idempotent)
sqlite3 data/app.db "select position, name, category from statuses order by position;"
sqlite3 data/app.db "pragma journal_mode;"   # wal
npm test              # 9 passed
npm run typecheck     # clean
npm run build         # clean
curl -s http://127.0.0.1:8787/api/health
# {"ok":true,"app":"[App name]","database":{"ready":true,"statuses":5},...}
```

### PRD IDs advanced

FR-4 (all task fields now persisted), FR-14 (status set + categories seeded;
settings UI still in M1-S8), storage for FR-6/7/8/15/30, NFR-4 (indexes), NFR-6
(FKs and single-file durability groundwork).

---

## M1-S3 — Shared components (DESIGN §4) ✅

### Built

All DESIGN §4 primitives live in `web/src/components/` and are reused everywhere
from here on:

| Component | Notes |
|---|---|
| `Button` | `primary` (zinc-900, 40 px min height) and `secondary` (white + zinc-200 border). |
| `Kbd` | 12 px chip on a zinc-200 border. |
| `Badge` | `soft` / `outline` base; `LocationChip`, `StatusChip` and `TagChip` are thin wrappers so the treatment stays identical (D9). |
| `LinkBadge` | Outline badge as an anchor, `target="_blank" rel="noreferrer"` (FR-16). |
| `PriorityLabel` | Text only, 12 px / 500: P1 orange-700, P2 blue-600, P3 zinc-500. |
| `DueLabel` | `list` / `table` variants; orange-700 when overdue; absolute time in `title`. |
| `GroupHeader` | Label + count, `tone="overdue"` for the Overdue group. |
| `ProgressBar` | 6 px zinc-100 track, blue-600 fill, `role="progressbar"` + aria values. |
| `Checkbox` | 16 px native input, `accent-blue-600`, `aria-label` describing the action. |
| `ViewSwitcher` | List / Table / Kanban segmented control, `aria-pressed`. |
| `TaskRow` | Checkbox, title, then meta cluster: link, repeat, estimate, checklist progress, priority, due, location, tags. Wraps at narrow widths. |

Supporting modules:

- `web/src/lib/cx.ts` — class-name join helper (no dependency).
- `web/src/lib/estimate.ts` — `30m` / `1h` / `1h 30m` formatting.
- `web/src/lib/due.ts` — local `YYYY-MM-DD` + `HH:mm` handling (D17); date-only
  tasks only become overdue after their day ends, timed tasks at their moment.
- `date-fns@4.4.0` added to `web` (already approved in TECHSTACK §2).
- `ComponentGallery.tsx` + `ApiStatus.tsx` are **temporary** scaffolding that
  replaces the S1 placeholder screen; both are deleted in M1-S4 when the shell
  and real screens land.

### Deferred deliberately

- **Form primitives** (Input, Textarea, Select, Field label, Drawer, Modal) —
  DESIGN §4 has no form specifications. Inventing them now would create tokens
  and states the design doc does not define, so they are built in M1-S5
  alongside the task drawer that actually needs them.
- **Hover colours** — no hover background/colour tokens exist in DESIGN §2, so
  components ship without them. Only `LinkBadge` has `hover:underline`, which is
  decoration, not colour. Add hover tokens in M4-S16 if the audit asks for them.

### Verification performed

```bash
npm run typecheck   # clean
npm test            # 20 passed (9 server + 11 web)
npm run build       # clean
npm run dev         # gallery at http://127.0.0.1:5173/
```

Playwright at 1280 px and 420 px, zero console errors:

- rows 44 px, long-title row 61 px; no horizontal overflow at 420 px
  (`scrollWidth === innerWidth`), meta cluster wraps under the title;
- checkbox 16 px, primary button 40 px with zinc-900 background;
- active tab white with `shadow-sm`; `aria-pressed` true only on List;
- P1 and overdue both orange-700; progress fill blue-600;
- focus ring white 2 px + blue-600 4 px;
- `aria-label` present on all 8 checkboxes, correct wording for the done row;
- progressbar aria values 0/34/58/100 match their labels;
- LinkBadge `target="_blank" rel="noreferrer"`;
- status line reads `API: ok · database ready · 5 statuses`.

### PRD IDs advanced

FR-10 (task rows expose title, priority, due, estimate, project, tags, link,
checklist progress), FR-12 (status/priority/estimate/due display surfaces),
FR-16 (link badges), NFR-7 (keyboard-reachable controls, aria labels, progress
semantics), plus the visual half of NFR-1/NFR-8.

---

## M1-S4 — App shell, sidebar, routing ✅

### Built

- **Routing** (`web/src/routes/router.tsx`) with React Router 8.5.1 data router:
  `/`, `/inbox`, `/today`, `/tasks`, `/projects/:id`, `/settings`, plus a
  catch-all 404. `/reviews` is absent until M3 (D10). Root route renders
  `AppShell`; `errorElement` is a quiet recovery screen with one link home.
- **App shell** (`components/AppShell.tsx`): wrapping flex row, `min-h-full`,
  main column `flex-1 min-w-0 px-8 pt-6 pb-12` (DESIGN §3). Below 900 px the
  sidebar stacks above the content via `min-[900px]:` variants — no hamburger,
  as specified.
- **Sidebar** (`components/Sidebar.tsx`): 232 px on desktop, white with a
  zinc-200 right border, logo mark (22 px zinc-900) + app name, primary nav
  (Dashboard, Inbox, Today, All tasks) with right-aligned open-work counts,
  Projects label + project rows with the zinc-400 decorative dot, Settings
  pinned to the bottom. Below 900 px it becomes full width with a bottom border.
- **`NavItem`** (DESIGN §4): 40 px row, 14 px text, `bg-zinc-100` + medium
  weight when active, `aria-current="page"` from `NavLink`. Project rows reuse it
  through a `dot` prop.
- **`PageHeader`** and **`EmptyState`** — the page-title role from DESIGN §2 and
  the empty-list state from DESIGN §6, so every screen shares one header and one
  empty treatment.
- **Data layer**: `shared/src/schemas.ts` (Zod `navSummarySchema`), typed
  `apiGet` that validates every response with the shared schema, and a
  `useNavSummary` TanStack Query hook (`staleTime` 15 s, one retry).
- **Server**: `createApp(db)` extracted from the listener so tests can call
  `app.request` (D13), plus `GET /api/nav` returning sidebar counts and active
  projects (D24). `server/src/lib/dates.ts` supplies the local calendar day.
- **Placeholder screens** for Dashboard, Inbox, Today, All tasks, Project,
  Settings and 404. Each is a real route with the real page title; the body says
  which step fills it in. `ProjectRoute` already resolves its title from the
  nav data, so a bookmarked URL shows the project name.
- **Deleted**: `ComponentGallery`, `ApiStatus`, `PrelineInit`. The full
  `preline/non-auto` bundle (406 kB) is gone; Preline JS returns per plugin when
  the drawer/dropdown lands (D25).

### Verification performed

```bash
npm run typecheck   # clean
npm test            # 29 passed (9 db + 5 app/nav + 11 web lib + 4 api client)
npm run build       # clean, one 427 kB chunk (131 kB gzip), no Preline chunk
DATABASE_PATH=./data/verify.db npm run dev
curl -s http://127.0.0.1:8787/api/nav
curl -s http://127.0.0.1:5173/api/nav        # identical via the Vite proxy
```

Verified against a throwaway copy of the database (deleted afterwards; the real
`data/app.db` still has 0 tasks and 0 projects):

- `GET /api/nav` → `{"counts":{"inbox":3,"today":2,"all":5},"projects":[p1,p2]}`;
  the archived project is excluded, done tasks are not counted, and Today counts
  overdue + due today.
- Playwright at 1280 px: sidebar exactly 232 px, white, 1 px zinc-200 right
  border; main padding `24px 32px 48px`; all nav rows exactly 40 px; active row
  `bg-zinc-100` + weight 500; Settings sits at y=840 in a 900 px viewport;
  no horizontal overflow.
- Clicking Inbox navigates client-side to `/inbox`, `aria-current` moves to
  Inbox only, and the page title becomes "Inbox". `/projects/p1` titles the page
  "Onboarding playbook v2" and highlights that project row. `/nope` renders
  "Not found" with a single "Go to dashboard" link.
- At 700 px the sidebar is full width with a bottom border and the main column
  starts below it; at 1024 px they sit side by side (232 px + 792 px). No
  overflow at either width.
- Zero console errors on first load.

### PRD IDs advanced

App shell and navigation for every PRD §5 screen; FR-14-adjacent project list
read-only; NFR-3 (local-only API unchanged), NFR-7 (labelled nav landmark,
`aria-current`, 40 px targets, shared focus ring), NFR-8 (one header/empty
pattern reused).

---

## M1-S5 — Tasks CRUD + plain capture ✅

### Built

- **Shared contracts** (`shared/src/schemas.ts`): `statusSchema` /
  `statusListSchema`, `taskSchema` / `taskListSchema` / `taskResponseSchema`,
  `prioritySchema`, `localDateSchema` (`YYYY-MM-DD`) and `localTimeSchema`
  (`HH:mm`). Request bodies are `z.strictObject`, so an unknown field is a 400
  rather than a silent no-op. `null` clears a field on PATCH; an absent key
  leaves it alone.
- **Task service** (`server/src/services/tasks.ts`): list (project / `due_to` /
  `q` over title + notes), get, create, update, `setDone`, delete. Ordering is
  the List order: open first, then due date (undated last), then manual
  position. `milestone_id must belong to project_id` is enforced here (D20), and
  moving a task out of a project drops its milestone (D7).
- **Status service** (`server/src/services/statuses.ts`): list in configured
  order, plus the three lookups that encode D6 — `defaultOpenStatusId` prefers
  the status named "To do" and falls back to the first `open` status (Backlog
  sorts first but is not the default), `firstDoneStatusId` for completion.
- **Routes**: `GET/POST /api/tasks`, `PATCH/DELETE /api/tasks/:id`,
  `POST /api/tasks/:id/complete` (separate from PATCH because completion stamps
  `completed_at` and will create the next recurrence in M1-S8) and
  `GET /api/statuses`. `ServiceError` + `app.onError` map service failures to
  400/404/500 and log anything unexpected.
- **Web data layer**: `api/client.ts` (`ApiError`, `apiGet`, `apiMutate`,
  `apiDelete`, every response parsed with its shared Zod schema),
  `api/tasks.ts` (`useTasks`, `useCreateTask`, `useUpdateTask`,
  `useCompleteTask` with an optimistic patch + snapshot revert, `useDeleteTask`),
  `api/statuses.ts` (`useStatuses`, cached for the session).
- **UI state**: `store/ui.ts` (Zustand 5.1.0) holds only `captureOpen` and the
  `drawerTask`; server data stays in TanStack Query.
- **Form primitives** (the part deferred from M1-S3 by D23):
  `Field`/`Input`/`Textarea`/`Select` — 11 px zinc-500 captions, 10 px radius,
  40 px minimum height, zinc-500 placeholders (never zinc-400 text) — and
  `InlineError` (DESIGN §6: message stays on screen, optional Retry).
- **`CaptureDialog`** (DESIGN §5.4 plain mode): `Ctrl/⌘ K` from any screen via
  `react-hotkeys-hook` 5.3.0 (`enableOnFormTags`), Enter saves to the Inbox and
  closes, Esc closes, kbd hints for both. "Quick capture" title, one dark button.
- **`TaskDrawer`** (DESIGN §5.5): 420 px right drawer with title, notes, status,
  priority, due date, due time and estimate. Only changed fields are PATCHed,
  Enter or Save commits, Esc closes, delete is two-step.
- **`TaskListPanel`** + real **Inbox** (`GET /api/tasks?project=none`) and
  **Today** (`due_to=<local today>`, grouped Overdue / Today) screens, with
  loading, empty and error states from DESIGN §6. Ticking a row calls
  `/complete`; clicking a title opens the drawer.
- **Server tests**: `server/src/routes/tasks.test.ts` (create defaults, inbox
  ordering, strict bodies, milestone/project rule, PATCH clearing, completion
  round trip, delete, due filter, search) and a shared `createTestDb` helper.

### Notes / deliberate deviations

- **No `GET /api/tasks/:id`**: TECHSTACK §5 does not define one, so the drawer is
  seeded from the row's task object and refreshed from each mutation response
  instead of adding an endpoint the spec does not have.
- **Capture placeholder is "What needs doing?"**, not DESIGN §4's
  `reply to ZD-48213 tomorrow 10am p1 30m`. That example promises parsing, which
  only exists once AI capture lands in M2; the AI capture bar gets it then.
- Deferred to M1-S6/S7: project/milestone/tags/links/checklist in the drawer,
  move-to-project, and the search box in the UI (`?q=` is already served).

### Verification performed

```bash
npm run typecheck   # clean (shared + server + web)
npm test            # 42 passed (9 db + 5 nav + 11 web lib + 4 api client + 13 tasks)
npm run build       # clean, 476 kB chunk (143 kB gzip)
```

API, against a throwaway copy of the database (`sqlite3 .backup`, deleted after;
`data/app.db` still has 0 tasks and 0 projects):

- `POST /api/tasks {"title":"  Reply on vendor escalation  "}` → 201, title
  trimmed, `statusName: "To do"`, `priority: 3`, no project/milestone, `201`.
- `POST` with due date, time, P1 and a 30 m estimate → stored and returned
  unchanged; `{"title":"   "}` → 400; an unknown field → 400.
- `GET /api/tasks?project=none` → due-date order, undated last.
- `POST /:id/complete {}` → `Done` / `done` / `completedAt` set; with
  `{"done":false}` → `To do` / `open` / `completedAt: null`.
- `PATCH` with `{"dueDate":null,"dueTime":null}` → cleared; `DELETE` → 204, then
  404; `GET /api/nav` counts followed every write (3 → 2 → 1).
- `?due_to=` filtered out a task moved off the date; `?q=vendor` matched.

UI, headless Chrome at 1280 × 820 driven over CDP (no Playwright in the stack):

- Inbox renders the three seeded tasks in due-date order with P1 in orange-700.
- `⌘K` opens Quick capture with focus in the title field; typing and pressing
  Enter closes the dialog and the new row appears in Inbox.
- Clicking a title opens the 420 px drawer with every field populated; editing
  the title and pressing Enter saves, closes and updates the row.
- Esc closes both dialogs.
- Ticking a row strikes the title through and sinks it below open work.
- Delete is two-step ("Delete" → "Confirm delete" / "Cancel") and removes the
  task; the sidebar count drops with it.
- Today groups Overdue 1 / Today 1 for an overdue task and one due today.
- Backdrop sampled at `#8b8b8d` — `zinc-900/50` over `zinc-50`, per DESIGN §2.1.

### PRD IDs advanced

- **FR-1, FR-2 — done.** Global capture, keyboard-opened, Enter saves to Inbox
  with no AI call.
- **FR-4 — partial.** Title, notes, status, priority, due date, due time and
  estimate are real and persisted; tags, links, checklist and recurrence arrive
  in S6/S8.
- **FR-5 — API complete, UI in S6.** `projectId`/`milestoneId` are validated and
  PATCHable; the drawer's project picker lands with the projects step.
- **FR-10 — partial.** List view for Inbox and Today; Table/Kanban in S7.
- **NFR-4** (capture is a single write), **NFR-7** (real inputs and labels,
  40 px targets, shared focus ring, Esc + Enter paths, no zinc-400 text).

---

## M1-S6 — Projects, milestones, checklist, links, tags ✅

### Built

- **Shared contracts**: task rows now carry `tags`, `link` (first link) and
  `checklist: {done,total}`; `taskDetailSchema` adds `links` and
  `checklistItems`. New schemas for projects (`projectSummarySchema` with a
  derived `progress`), milestones (with `done`/`total`), tags, checklist items
  and links, plus strict bodies for every write.
- **Projects** (`server/src/services/projects.ts`): list (active or archived),
  get, create, patch (name, description, target date, archived, aiExcluded,
  position), delete. Progress is derived per request (D8): done ÷ all tasks,
  lowest-position incomplete milestone, earliest due open task — three grouped
  queries for the whole list.
- **Milestones**: list with task counts, create, patch (name, position,
  `completedAt`), delete. Deleting leaves tasks in the project (D7).
- **Checklist, links, tags**: add/rename/toggle/delete items; add a link with a
  derived label (`KEY-123` → `OPS-112`, Zendesk ticket → `ZD-48213`, else the
  last path segment) or an explicit one; replace a task's tag set by name,
  creating tags on the fly and de-duplicating case-insensitively.
- **`POST /api/tasks/:id/move`** (FR-5) plus `GET /api/tasks/:id` (D28), and a
  `?tag=` filter on the task list. Moving a task appends it to the end of its
  new collection.
- **Web data layer**: `api/projects.ts` (projects, detail, milestones + their
  mutations), `api/taskDetail.ts` (detail, tags, and the checklist/link/tag
  mutations that invalidate the row badges too).
- **Project screen** (DESIGN §5.2): breadcrumb, title + "Edit project"/"New
  task", description, milestone pills with live "7 of 12" state and the current
  milestone tinted blue-50, dashed "Add milestone", ViewSwitcher with
  "Showing: <milestone>", and the task list filtered by the selected pill.
  Table and Kanban stay placeholders until M1-S7.
- **`ProjectDialog`** (D29): create and edit, archive/restore, two-step delete,
  and milestone management (rename on blur, Done, Up/Down, Delete, add).
  Opened from the sidebar's "New project" row or the project screen.
- **Task drawer** now covers the whole FR-4 field set: project and milestone
  selects (milestone resets when the project changes), plus checklist, links and
  tags sections that save immediately. The checklist count appears on the row.
- **Field** now renders its hint outside the `<label>` so screen readers do not
  read "Optional." as part of the field name.

### Verification performed

```bash
npm run typecheck   # clean
npm test            # 66 passed (9 db + 5 nav + 11 web lib + 4 api client + 13 tasks + 11 projects + 13 task details)
npm run build       # clean, 500 kB chunk (148 kB gzip)
```

API, against a throwaway copy of the database (deleted after; `data/app.db`
still has 0 tasks and 0 projects):

- Created a project, two milestones, two tasks; `GET /api/projects/:id` reported
  `done=0 total=2 pct=0 current=Phase 1 next=Book the venue` (earliest due open
  task).
- Checklist add → row summary `check=0/2`; link add → `ZD-48213` derived from
  `https://acme.zendesk.com/agent/tickets/48213`; tags `["Vendor","docs"]` →
  row `tags=Vendor,docs`; detail returned 1 link and 2 checklist items.
- `POST /move` between milestones → `milestoneId` changed; deleting the project
  returned 204 and both tasks came back with `projectId=null`,
  `milestoneId=null`.

UI, Playwright at 1280 × 860 against the throwaway database:

- Sidebar "New project" → dialog → Create → lands on `/projects/:id`, sidebar
  lists the project, breadcrumb and description render.
- "Add milestone" inline → pill appears ("Phase 1 · Not started", blue = current).
- "New task" opens capture with "Saves to this project." and "Add task"; Enter
  adds the task to the project (not the Inbox).
- Task drawer: project preselected, milestone select lists the project's
  milestones, checklist item and link and tag added live — the row then shows
  `ZD-48213`, `☑ 0/1` and the tag chips.
- Selecting a milestone pill filters to "Showing: Phase 2" with an empty state
  naming that milestone; clicking again clears it.
- Edit project → Phase 1 marked Done, Phase 2 moved up: pills reorder and read
  "Phase 2 · Not started" / "Phase 1 · Done".
- Archive → project disappears from the sidebar, screen still renders with "This
  project is archived."; Restore brings it back. Delete project → confirm →
  lands on `/inbox` with all tasks and no project.
- Fixed during the pass: a nested `<form>` in the project dialog (React logged
  it as an invalid-DOM error) and project-detail 404 refetches right after a
  delete. Console is clean afterwards.

### PRD IDs advanced

- **FR-4 — complete.** Title, notes, status, priority, tags, due date, due time,
  estimate, external links and checklist items all persist. Recurrence is the
  remaining field (FR-15, M1-S8).
- **FR-5 — done.** Move between Inbox, project and milestone, in the drawer and
  through `/move`.
- **FR-6 — done.** Create, edit, archive, restore and delete projects.
- **FR-7 — done.** Create, rename, reorder, complete and delete milestones.
- **FR-8, FR-16, FR-30 — done.** Checklist with row progress, link badges with
  derived labels, tags created on the fly (API filter ready, UI in S7).
- **FR-9 — service done**: progress, current milestone, done/total, next due
  task are exposed on every project; the dashboard cards that render them land
  in M1-S9.
- **FR-10 — partial.** Project screen has the List view; Table and Kanban in S7.

---

## M1-S7 — List / Table / Kanban, shared filters, dnd-kit ✅

### Built

- **Server**: `GET /api/tasks` now accepts `status` and `priority` (comma lists)
  and `due_from`, on top of `project`, `due_to`, `q` and `tag`. Task rows carry
  `milestoneName` so the Table column needs no extra request.
- **Status ↔ completion** (D34): `PATCH /api/tasks/:id` derives `completed_at`
  from the new status category, so the drawer and Kanban produce the same
  `done` state as the checkbox.
- **Filter layer** (`lib/taskFilters.ts`): one `TaskFilter` type for the server
  and the UI, a stable `taskFilterQuery` (sorted lists → stable cache keys),
  `resolveDueRange` (overdue / today / next 7 days → concrete local dates) and
  `hasActiveFilters`. 12 unit tests, including a midnight rollover.
- **`useViewStore`** (Zustand): `view` plus the filter set, so switching views
  keeps every filter (FR-11, D33).
- **Components**: `FilterChip` (native disclosure, D32), `DataTable` (DESIGN §4
  columns, 48 px rows, footer count), `KanbanBoard` (columns = statuses in order,
  category tags, `+ Add task`, drag overlay) and `TaskViewBody`, which both
  screens share so the three views cannot drift.
- **All tasks** (DESIGN §5.3): title + ViewSwitcher, 240 px search with a 200 ms
  debounce, Status / Priority / Project / Tag / Due chips, "Clear filters", then
  the shared body.
- **Project screen**: Table and Kanban are real now; the milestone pills filter
  all three views, and "+ Add task" on a column captures into that project and
  status.
- **dnd-kit** 6.3.1 with `PointerSensor` (6 px activation) and `KeyboardSensor`
  using a column-aware coordinate getter (D35).

### Verification performed

```bash
npm run typecheck   # clean
npm test            # 84 passed (9 db + 5 nav + 11 web lib + 12 filters + 4 client + 16 tasks + 12 projects + 15 task details)
npm run build       # clean, 554 kB chunk (164 kB gzip) — over Vite's 500 kB warning
```

API, against a throwaway copy of the database with a project, two milestones and
seven tasks:

- `GET /api/tasks?status=<backlog>,<todo>&priority=1` returned only the matching
  rows; `?due_from=&due_to=` bounded the range; `?priority=9` was ignored.
- `PATCH {statusId: Done}` set `completedAt` and project progress moved to
  `done=1 total=4 percent=25`; patching back to an open status cleared it.
- Milestone names came back on rows (`milestoneName: "Phase 1"`).

UI, Playwright at 1280 × 860:

- All tasks: List → Table → Kanban all show the same 7–8 tasks; the Table
  renders every DESIGN column (Done, Task, Project, Milestone, Status, Priority,
  Due, Estimate, Repeat, Links) and the footer "8 tasks · sorted by due date".
- Status: Done → 2 rows, and the filter survived the switch to Table (FR-11).
  "Clear filters" appears only while a filter is active.
- Search "zzzz" → "No tasks match these filters."; "venue" → 1 row.
- Kanban: mouse drag moved *Book the venue* from In progress to To do; dragging
  *Draft the welcome doc* into Done stamped `completedAt` and the sidebar count
  dropped 5 → 4.
- Keyboard: focus a card, Space, ArrowRight, Space moved *Water the plants* from
  Backlog to To do in one column step.
- "+ Add task" inside Waiting opened capture and created the task in Waiting.
- Project screen: pills showed live counts ("Phase 1 2 of 2"), Kanban rendered
  only that project's tasks, and selecting Phase 2 filtered to its single task.
- Console clean; the done row's date is neutral instead of orange (D36).

### PRD IDs advanced

- **FR-10 — done.** List, Table and Kanban for All tasks and a project.
- **FR-11 — done.** Status, project, priority, tag and due-range filters plus
  search, all preserved across view switches.
- **FR-12 — done.** Drag between status columns with a keyboard path
  (Space / arrows / Space) and the drawer's status select as a second route.
- **FR-30 — done.** Tag filter shipped.
- **FR-13 — not yet.** Table sorting and grouping stay in M4-S16 as TECHSTACK
  §11 plans; the Table currently follows the List order by due date.

---

## Decisions

| # | Decision |
|---|---|
| D1 | **Vite 8.3.8 + plugin-react 6.3.0** instead of the approved 7.3.8/5.2.0. Vitest 5.1.0 depends on Vite 8 and npm hoisted a second copy, breaking plugin types. One Vite version is safer; Preline is framework-agnostic. |
| D2 | npm workspaces (pnpm not installed). |
| D3 | `tsx` runs the server in dev. |
| D4 | Inter self-hosted as three woff2 files — no CDN (NFR-1). |
| D5 | Tailwind 4 via `@tailwindcss/vite`; Preline `variants.css` only, never `theme.css`, so DESIGN tokens stay authoritative. |
| D6 | New/inbox tasks default to "To do"; checkbox → first `done` status ("Done"), untick → "To do". |
| D7 | Delete project → confirm, tasks move to Inbox; archive hides the project only; delete milestone → tasks move to project level. |
| D8 | Project % = done ÷ non-archived tasks; current milestone = lowest-position incomplete; Next = earliest-due incomplete. Today = overdue + due today, grouped separately. |
| D9 | TagChip reuses LocationChip styling (2 + "+N"); checklist progress shown on TaskRow. |
| D10 | M1 hides "Ask assistant" and the Reviews nav; ReviewCard only when a review exists. Task drawer built in M1-S5. |
| D11 | Restore from `data/backups/*.db` list + download; no upload in M1. |
| D12 | One row per recurrence occurrence; full schema created up front. |
| D13 | Vitest + Hono `app.request`; no RTL yet. `db:seed:perf` still to add. |
| D14 | Search covers title + notes. |
| D15 | Specs stay in `docs/`. |
| D16 | Env paths resolve from the repo root; `shared` is imported as TS source. |
| D17 | Calendar values (`due_date`, `target_date`, review periods) are local `YYYY-MM-DD`; `due_time` is `HH:mm` local; timestamps are ISO UTC. |
| D18 | `db:seed` seeds only required data (statuses + review schedule). Demo/sample data will be a separate opt-in script so the real DB never gets invented tasks. |
| D19 | Status names and tag names are unique (index). |
| D20 | `milestone_id must belong to project_id` is a **service-layer** rule (TECHSTACK §4), not a DB CHECK: the CHECK blocked SQLite's `ON DELETE SET NULL` ordering when deleting a project. |
| D21 | `drizzle-orm` is declared in **both** root devDependencies and `server` dependencies. drizzle-kit is hoisted to the root and resolves `drizzle-orm/version` from there; without the root declaration npm nested drizzle-orm under `server/` and `db:generate` failed. |
| D22 | `updated_at` is set explicitly by services; no trigger. |
| D23 | DESIGN §4 defines no form primitives, so Input/Textarea/Select/Field/Drawer/Modal are **deferred to M1-S5**, where the task drawer provides a concrete use case. No form tokens are invented ahead of need. |
| D24 | The sidebar reads `GET /api/nav` (counts + active projects) instead of calling `/api/tasks` and `/api/projects`. Counts are **open work only** (status category ≠ done); "Today" is overdue + due today. `/api/dashboard` (M1-S9) will reuse the same service functions rather than replace this endpoint. |
| D25 | Preline's `preline/non-auto` bundle was removed in M1-S4 because no Preline JS plugin is used yet; that drops a 406 kB chunk. When the task drawer, dropdown filters or modal arrive, import only the specific plugin modules (for example `preline/offcanvas`) and re-add `PrelineInit` with route-aware cleanup. `variants.css` and the `@source` scan stay in place. |
| D26 | Quick capture and the task drawer use a **native `<dialog>`** with `showModal()`, not Preline. Preline 5.1.0 ships no modal/offcanvas plugin (only `overlay`), and its markup contract would need `PrelineInit` plus route-aware teardown to get a focus trap the browser already provides. `showModal()` gives the top layer, focus trap, Esc and `::backdrop`; the only styling needed is `backdrop:bg-zinc-900/50`. Revisit Preline JS only where it earns its place (dropdowns in S7, datepicker if the native one proves too plain). |
| D27 | ~~The task drawer is seeded from the row's task object instead of a `GET /api/tasks/:id` call.~~ Superseded by D28 in M1-S6, once the drawer needed links and checklist items. |
| D28 | `GET /api/tasks/:id` **is** added in M1-S6. The task list row carries a summary (`tags: string[]`, `link` = first link, `checklist: {done,total}`) built from three grouped queries, so a list never does per-row work (NFR-4); the drawer reads the full detail (`links`, `checklistItems`) from the new route. |
| D29 | DESIGN §5.5 has no projects screen, so project create/edit/archive/delete live in one `ProjectDialog` opened from a sidebar "New project" row or the project screen's "Edit project" button. Delete keeps the work: tasks fall back to the Inbox (D7). |
| D30 | Milestone management (rename, done, reorder, delete) sits inside `ProjectDialog`. Reordering rewrites `position` to the new index order, which also normalises gaps left by deletes; there is no separate reorder endpoint. |
| D31 | Capture from a project screen keeps the project: `openCapture({projectId})` stores the target and the capture dialog creates the task there ("Add task" instead of "Add to Inbox"). M1-S7 extends the same call with `statusId`, so a Kanban column's "+ Add task" captures into that column. |
| D32 | `FilterChip` is a native `<details>`/`<summary>` disclosure, not a Preline dropdown. It keeps the DESIGN §4 look and gets keyboard toggling and screen-reader semantics for free; Preline's JS stays out of the bundle (D26). |
| D33 | One `useViewStore` holds the active view and the All-tasks filter set, so List → Table → Kanban and back keeps every filter (FR-11). The project screen reads the same `view` but takes its scope from the route, not from the filter's `project` — a stale "Project: Inbox" chip can never empty a project screen. The project screen keeps its milestone pill filter local. |
| D34 | `completed_at` follows the status **category**: PATCHing `statusId` to a `done` status stamps it (or keeps the original stamp), any other status clears it. Before this, picking "Done" in the drawer left the task counted as open in project progress, nav counts and list ordering. `/complete` stays the checkbox path and records the same truth. |
| D35 | Kanban uses `@dnd-kit/core` 6.3.1 only (no `sortable`/`utilities`). The keyboard path is a custom `KeyboardCoordinateGetter` that jumps to the neighbouring column's centre, because dnd-kit's default moves 25 px per arrow press; Space picks up and drops, Enter still opens the drawer. |
| D36 | A finished task never shows its due date in `orange-700`; `DueLabel` takes `isDone` and falls back to the neutral tone. Overdue only means something while the work is open. |

## Follow-ups / known gaps

- **ESLint + Prettier** not installed yet — decide in M4-S16 (the state audit
  step) or ask Keith sooner if lint drift becomes a problem.
- `preline/non-auto` chunk: **resolved in M1-S4** by removing the bundle (D25).
  The task drawer and quick capture landed on a native `<dialog>` instead of a
  Preline plugin (D26), so no Preline JS is loaded yet.
- Placeholder bodies remain on Dashboard (S9) and Settings (S8).
- The web bundle crossed Vite's 500 kB warning in M1-S7 (554 kB, 164 kB gzip)
  when dnd-kit landed. Fine for a local app; revisit with route-level
  `import()` splitting if it keeps growing.
- The Table's Links column shows the task's first link only — the list payload
  carries one link per task on purpose (D28).
- Kanban supports moving between columns, not reordering within a column; the
  card's `position` is unchanged by a status move.
- Server-side `sort`/`group` parameters from TECHSTACK §5 are still unwritten;
  they belong to M4-S16 with FR-13.
- `npm audit` reports 4 moderate advisories from drizzle-kit's bundled
  `@esbuild-kit/esm-loader` (old esbuild). Dev-only CLI, not shipped, no dev
  server involved; **do not** run `npm audit fix --force` (it would downgrade
  drizzle-kit to 0.18.1).
- `db:seed:perf` (5,000 tasks / 50 projects for NFR-4) not written yet.
- PRD open questions for Keith: Q1 (company AI policy), Q5 (final app name).
  Neither blocks M1.

## Next step — M1-S8

Statuses settings and recurrence. The Settings screen gets its *Statuses*
section (add, rename, recategorise, reorder, delete with the "move tasks first"
guard from US-10), and the task service gains the FR-15 recurrence path: an
RRULE string on completion creates the next occurrence, copying title, fields,
links and checklist (unticked), with `recurrence_parent_id` pointing at the first
task in the series (TECHSTACK §4). Add `rrule` to the task drawer's Repeat field.
Deliverables feed FR-14, FR-15.
