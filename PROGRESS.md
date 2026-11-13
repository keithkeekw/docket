# PROGRESS — [App name]

Working log for the build. Read after `docs/PRD.md`, `docs/TECHSTACK.md` and
`docs/DESIGN.md` at the start of every session.

- **Last updated:** 13 Nov 2026
- **Current step:** M1-S4 (next) — app shell, sidebar, routing
- **Spec sources:** `docs/PRD.md` (behaviour), `docs/TECHSTACK.md` (implementation), `docs/DESIGN.md` (visuals)

---

## Build order status

| Step | Scope | Status |
|---|---|---|
| M1-S1 | Workspaces, Vite, Hono, `/api` proxy, Tailwind + Preline + Inter | ✅ Done |
| M1-S2 | Drizzle schema, migrations, seed statuses | ✅ Done |
| M1-S3 | Shared components (DESIGN §4) | ✅ Done |
| M1-S4 | App shell, sidebar, routing | ⬜ Next |
| M1-S5 | Tasks CRUD + plain capture (`Ctrl/⌘ K`) | ⬜ |
| M1-S6 | Projects, milestones, checklist, links, tags, move-to-project | ⬜ |
| M1-S7 | List / Table / Kanban + shared filters + dnd-kit | ⬜ |
| M1-S8 | Statuses settings; recurrence service + tests | ⬜ |
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

## Follow-ups / known gaps

- **ESLint + Prettier** not installed yet — decide in M4-S16 (the state audit
  step) or ask Keith sooner if lint drift becomes a problem.
- `preline/non-auto` is a ~400 kB (96 kB gzip) chunk; switch to per-plugin imports
  in M1-S4.
- `npm audit` reports 4 moderate advisories from drizzle-kit's bundled
  `@esbuild-kit/esm-loader` (old esbuild). Dev-only CLI, not shipped, no dev
  server involved; **do not** run `npm audit fix --force` (it would downgrade
  drizzle-kit to 0.18.1).
- `db:seed:perf` (5,000 tasks / 50 projects for NFR-4) not written yet.
- PRD open questions for Keith: Q1 (company AI policy), Q5 (final app name).
  Neither blocks M1.

## Next step — M1-S4

Build the app shell: sidebar navigation (Today, Inbox, Upcoming, Projects,
Review hidden in M1 per D10), header with page title + primary action + view
switcher, client-side routing, and a responsive collapse. Replace
`ComponentGallery`/`ApiStatus` with the real layout, switch Preline to
per-plugin imports to cut the 400 kB chunk, and keep every surface on the
DESIGN §4 primitives built in M1-S3. Deliverables feed PRD §5 screens (US-1
entry point, US-8 view switching) and NFR-7.
