# TECHSTACK — Docket

How the app is built. Behaviour is defined in `PRD.md` (requirement IDs like FR-3 are referenced here); look and feel in `DESIGN.md`.

> **Versions:** pin the latest stable release of each package when the project is created and record them in `package.json`. Check Preline's install guide for the Tailwind version it currently supports before installing Tailwind.

---

## 1. Architecture at a glance

```
 Browser (localhost:5173)                Local server (127.0.0.1:8787)              Outside
 ┌──────────────────────────┐   HTTP    ┌──────────────────────────────┐   HTTPS   ┌──────────────┐
 │ React + Tailwind + Preline│ ───────▶ │ Hono API                     │ ────────▶ │ DeepSeek API │
 │ TanStack Query            │ ◀─────── │  ├─ routes (tasks, projects…)│           └──────────────┘
 │ dnd-kit (Kanban)          │          │  ├─ AI service + proposals   │ ────────▶ ┌──────────────┐
 └──────────────────────────┘           │  ├─ scheduler (reviews)      │           │ OpenRouter   │
                                        │  └─ Drizzle ORM              │           └──────────────┘
                                        │        │                     │
                                        │   data/app.db (SQLite)       │
                                        │   .env (API keys)            │
                                        └──────────────────────────────┘
```

Why a local server instead of browser-only storage:
- API keys stay in `.env` on the server, never in the browser (NFR-2).
- One SQLite file is easy to back up and restore (FR-27).
- The scheduler can generate reviews without the tab open (FR-19).
- Real SQL queries power filters, reviews and chat tools.

---

## 2. Stack

### Front end (`/web`)
| Concern | Choice | Notes |
|---|---|---|
| Build | **Vite** | React + TypeScript template |
| UI | **React** + **TypeScript** | TypeScript strongly recommended: the agent makes fewer mistakes with shared types |
| Styling | **Tailwind CSS** + **Inter** | Tokens in `DESIGN.md`; default palette only |
| Components | **Preline UI** | Preline's JS plugins (modal, dropdown, offcanvas) must be re-initialised after React renders/route changes — follow Preline's React guide (`HSStaticMethods.autoInit()` pattern) |
| Routing | **React Router** | Routes: `/`, `/inbox`, `/today`, `/tasks`, `/projects/:id`, `/reviews`, `/settings` |
| Server state | **TanStack Query** | Caching, optimistic updates, refetch after confirms |
| UI state | **Zustand** (small store) | Current view, filters, capture modal open/closed |
| Drag & drop | **dnd-kit** | Kanban, with keyboard sensor (NFR-7) |
| Dates | **date-fns** | Formatting ("Mon 16 Nov"), relative logic |
| Shortcuts | **react-hotkeys-hook** | `Ctrl/⌘ K` capture, `Esc`, `Enter` |
| Markdown (reviews, chat) | **react-markdown** | Render AI text safely (no raw HTML) |

### Server (`/server`)
| Concern | Choice | Notes |
|---|---|---|
| Runtime | **Node.js LTS** | |
| HTTP | **Hono** (with `@hono/node-server`) | Small, typed; bind to `127.0.0.1` only (NFR-3) |
| Database | **SQLite** via **better-sqlite3** | Single file `data/app.db`; WAL mode on. If native build fails on the work laptop, swap to `@libsql/client` (Drizzle supports both) |
| ORM / migrations | **Drizzle ORM** + **drizzle-kit** | Schema in TypeScript, versioned migrations |
| Validation | **Zod** | Request bodies and **all AI output** |
| AI client | **openai** npm SDK | Both DeepSeek and OpenRouter expose OpenAI-compatible endpoints; one client, different `baseURL` |
| Recurrence | **rrule** | Store RFC 5545 rule strings |
| Scheduler | **node-cron** | Daily/weekly reviews + catch-up on start |
| Env | **dotenv** | `.env` for keys and port |

### Shared (`/shared`)
Zod schemas and TypeScript types used by both web and server (task, project, proposal, settings). One source of truth for shapes.

### Tooling
- **pnpm** workspaces (or npm workspaces) for `/web`, `/server`, `/shared`.
- **concurrently** to run both with one `pnpm dev`.
- **Vitest** for unit tests (recurrence, proposal apply, filters). **Playwright** optional for smoke tests later.
- ESLint + Prettier.

---

## 3. Repository layout

```
/
├─ PRD.md  DESIGN.md  TECHSTACK.md
├─ package.json            # workspaces + "dev" script
├─ .env.example
├─ data/                   # app.db, backups/ (git-ignored)
├─ shared/
│  └─ src/schemas.ts       # zod: Task, Project, Proposal, Settings…
├─ server/
│  └─ src/
│     ├─ index.ts          # Hono app, 127.0.0.1 binding
│     ├─ db/schema.ts      # Drizzle tables
│     ├─ db/migrations/
│     ├─ routes/           # tasks, projects, milestones, statuses, tags, reviews, settings, ai, backup
│     ├─ ai/
│     │  ├─ client.ts      # provider → OpenAI client
│     │  ├─ prompts/       # capture.md, breakdown.md, review.md, chat.md
│     │  ├─ tools.ts       # read-only tools for chat
│     │  └─ proposals.ts   # validate + apply proposals
│     ├─ services/recurrence.ts
│     └─ scheduler.ts
└─ web/
   └─ src/
      ├─ main.tsx  App.tsx  routes/
      ├─ components/       # Button, Badge, Kbd, TaskRow, ViewSwitcher, KanbanBoard, DataTable, ProposalModal…
      ├─ views/            # ListView, TableView, KanbanView (same props: tasks + filters)
      ├─ api/              # typed fetch + TanStack Query hooks
      └─ store/ui.ts
```

---

## 4. Data model

All IDs are text UUIDs; timestamps are ISO strings (UTC) with display in local time.

**statuses** — `id, name, category ('open'|'active'|'done'), position`
Seed: Backlog (open), To do (open), In progress (active), Waiting (active), Done (done).

**projects** — `id, name, description, target_date?, archived (bool), ai_excluded (bool), position, created_at, updated_at`

**milestones** — `id, project_id → projects, name, position, completed_at?, created_at`

**tasks** — `id, title, notes?, project_id? → projects, milestone_id? → milestones, status_id → statuses, priority (1|2|3, default 3), due_date?, due_time?, estimate_minutes?, recurrence_rule? (RRULE string), recurrence_parent_id? → tasks, position, completed_at?, created_at, updated_at`
- Inbox = `project_id IS NULL`.
- `milestone_id` must belong to `project_id` (enforced in the service layer).

**checklist_items** — `id, task_id → tasks (cascade), title, done (bool), position`

**task_links** — `id, task_id → tasks (cascade), url, label` (label derived on save, e.g. `ZD-48213`, `OPS-112`)

**tags** — `id, name (unique)`; **task_tags** — `task_id, tag_id`

**reviews** — `id, kind ('daily'|'weekly'|'manual'), period_start, period_end, content_md, model, created_at, opened_at?`

**ai_settings** — `feature ('capture'|'breakdown'|'review_daily'|'review_weekly'|'chat'), provider ('deepseek'|'openrouter'), model`

**app_settings** — key/value: `daily_review_time`, `weekly_review_day`, `weekly_review_time`, `last_daily_review_at`, `last_weekly_review_at`

**proposals** — `id, feature, input_text, payload_json, status ('pending'|'applied'|'discarded'), created_at, resolved_at, accepted_count, edited_count` (audit trail for FR-23 and the success metrics)

**Recurrence (PRD open question 3) — recommended:** one row per occurrence. Completing a recurring task sets `completed_at`, then creates a new task copying title, fields, checklist (unticked) and links, with the next due date from the RRULE and `recurrence_parent_id` pointing at the first task in the series. Keeps history simple.

---

## 5. API (REST, JSON)

```
GET    /api/dashboard                      → overdue, today, inbox, activeProjects, latestReview
GET    /api/tasks?status=&project=&priority=&tag=&due_from=&due_to=&q=&sort=&group=
POST   /api/tasks                          (plain capture: { title } is enough)
PATCH  /api/tasks/:id
POST   /api/tasks/:id/complete             (handles recurrence)
POST   /api/tasks/:id/move                 { projectId|null, milestoneId|null }
DELETE /api/tasks/:id
POST   /api/tasks/:id/checklist  PATCH/DELETE /api/checklist/:id
CRUD   /api/projects   /api/projects/:id/milestones   /api/statuses   /api/tags
GET    /api/reviews   GET /api/reviews/:id   POST /api/reviews/generate { kind }
GET/PUT /api/settings   GET/PUT /api/settings/ai
POST   /api/ai/capture      { text }               → Proposal
POST   /api/ai/breakdown    { projectId }          → Proposal
POST   /api/ai/chat         { messages }           → { reply, proposal? }
POST   /api/proposals/:id/apply  { items: EditedProposalItem[] }
POST   /api/proposals/:id/discard
POST   /api/backup   GET /api/backups   POST /api/restore { file }   GET /api/export?format=json
```

The UI never writes AI output directly; it always goes `AI endpoint → Proposal → user edits → /apply`.

---

## 6. AI layer

### 6.1 Providers
```ts
// server/src/ai/client.ts (sketch)
const BASE_URLS = {
  deepseek:   'https://api.deepseek.com',
  openrouter: 'https://openrouter.ai/api/v1',
};
// new OpenAI({ apiKey: process.env.DEEPSEEK_API_KEY, baseURL: BASE_URLS.deepseek })
```
- Model per feature comes from `ai_settings`; Settings UI lists provider + free-text or fetched model IDs.
- Confirm current model IDs in each provider's docs/dashboard; don't hard-code them.

### 6.2 Proposal flow (FR-23)
1. Server builds a prompt with: the user input, today's date and time zone, the list of statuses, projects and milestones (names + IDs) — **excluding `ai_excluded` projects and their tasks** (FR-25).
2. Request JSON output (JSON mode / `response_format` where the model supports it; otherwise instruct "JSON only").
3. Strip code fences, parse, validate with the Zod `Proposal` schema. Invalid → one retry with the validation error; still invalid → return an error, change nothing (NFR-9).
4. Resolve names to IDs server-side; anything unmatched goes to Inbox with an `aiNote` explaining it.
5. Save as `proposals` row (pending) and return it.
6. UI shows ProposalModal; user edits/unticks; `POST /apply` runs **in one SQLite transaction** (NFR-6).

```ts
// shared/src/schemas.ts (sketch)
ProposalItem = { op: 'create_task'|'update_task'|'move_task'|'delete_task'|'create_milestone',
                 targetId?: string, fields: Partial<TaskFields>, aiNote?: string }
Proposal     = { id, feature, items: ProposalItem[] }
```

### 6.3 Features
| Feature | Input | Output |
|---|---|---|
| Capture | free text | `create_task` items |
| Breakdown | project name + description + existing milestones/tasks | `create_milestone` + `create_task` items |
| Reviews | tasks completed / overdue / due in period, project progress (aggregated server-side) | Markdown stored in `reviews` (read-only, no proposal) |
| Chat | message history | text reply; may include a proposal |

### 6.4 Chat tools (read-only)
`list_tasks(filters)`, `get_task(id)`, `list_projects()`, `get_project_summary(id)`, `get_review(kind, date)`. Tools query SQLite with the same filter code as the UI and always skip `ai_excluded` projects. Writes are only possible by returning a proposal. Tool calling support varies by model — fall back to pre-loading a compact data summary into the prompt if the chosen model lacks it.

### 6.5 Prompts
Keep prompts as Markdown files under `server/src/ai/prompts/` so they can be tuned without code changes. Each includes: role, today's date, allowed values (statuses, priorities P1–P3), the JSON schema, 2–3 examples.

---

## 7. Scheduler (FR-19, FR-20)
- `node-cron` jobs for daily and weekly reviews at times in `app_settings`.
- On server start: if `last_daily_review_at` is before today's scheduled time and that time has passed, generate now (same for weekly).
- Reviews only run while the server runs. Optional later: start the server at login (Windows Task Scheduler / macOS launchd) or a desktop wrapper.

---

## 8. Security & privacy
- Server listens on `127.0.0.1` only; CORS allows only the Vite dev origin.
- Keys live in `.env` (git-ignored); Settings shows only "Configured / Not configured". Keys are never sent to the browser.
- `ai_excluded` enforced in one server function used by every AI path; add a unit test for it.
- Render AI text with react-markdown without raw HTML.
- Confirm company policy before using AI on real work data (PRD open question 1).

---

## 9. Backup & restore (FR-27, FR-28)
- Backup: SQLite online backup API (better-sqlite3 `db.backup()`) to `data/backups/app-YYYYMMDD-HHmm.db`; keep last 14 automatically plus manual ones.
- Restore: stop writes, replace `app.db` with chosen backup, re-open connection.
- Export: JSON dump of all tables (Could).

---

## 10. Environment & scripts

`.env.example`
```
PORT=8787
DATABASE_PATH=./data/app.db
DEEPSEEK_API_KEY=
OPENROUTER_API_KEY=
```

Scripts (root `package.json`)
```
dev        → concurrently "pnpm -C server dev" "pnpm -C web dev"
db:generate→ drizzle-kit generate
db:migrate → drizzle-kit migrate
db:seed    → seed statuses + sample data
test       → vitest
```
Vite dev server proxies `/api` to `http://127.0.0.1:8787`.

---

## 11. Build order for the coding agent (maps to PRD milestones)

**M1 — Core**
1. Workspaces, Vite app, Hono server, `/api` proxy, Tailwind + Preline + Inter.
2. Drizzle schema, migrations, seed statuses.
3. Shared components from `DESIGN.md` §4 (Button, Badge, Kbd, PriorityLabel, DueLabel, TaskRow, ViewSwitcher).
4. App shell + sidebar + routing.
5. Tasks CRUD + plain capture (`Ctrl K`).
6. Projects, milestones, checklist, links, tags, move-to-project.
7. List / Table / Kanban views sharing one filter state; dnd-kit.
8. Statuses settings; recurrence service + tests.
9. Dashboard endpoint + screen.
10. Backup / restore.

**M2 — AI capture & planning**
11. Settings: providers, per-feature models, AI exclusion.
12. AI client, Zod proposal schema, proposals table, ProposalModal.
13. AI capture; then project breakdown.

**M3 — Reviews & chat**
14. Review generation + scheduler + catch-up + Reviews screen.
15. Chat drawer + read-only tools.

**M4 — Polish**
16. Undo, export, table sort/group, empty/error states audit.

Work one step per session; after each UI step, compare against the matching artboard and `DESIGN.md`.
