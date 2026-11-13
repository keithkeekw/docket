# PROGRESS — [App name]

Working log for the build. Read after `docs/PRD.md`, `docs/TECHSTACK.md` and
`docs/DESIGN.md` at the start of every session.

- **Last updated:** 13 Nov 2026
- **Current step:** M1-S2 (next) — Drizzle schema, migrations, seed statuses
- **Spec sources:** `docs/PRD.md` (behaviour), `docs/TECHSTACK.md` (implementation), `docs/DESIGN.md` (visuals)

---

## Build order status

| Step | Scope | Status |
|---|---|---|
| M1-S1 | Workspaces, Vite, Hono, `/api` proxy, Tailwind + Preline + Inter | ✅ Done |
| M1-S2 | Drizzle schema, migrations, seed statuses | ⬜ Next |
| M1-S3 | Shared components (DESIGN §4) | ⬜ |
| M1-S4 | App shell, sidebar, routing | ⬜ |
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

- git repo initialised on `main`; npm workspaces `shared`, `server`, `web`.
- `shared` package (`@app/shared`) consumed as TypeScript source — no build step;
  exports `APP_NAME` from `src/constants.ts` (single rename point; also sets
  `document.title`).
- `server`: Hono + `@hono/node-server`, bound to **127.0.0.1:8787**, CORS limited
  to the Vite origin, `GET /api/health`. Env loaded from the repo-root `.env` and
  validated with Zod; `DATABASE_PATH` resolved from the repo root, not the
  workspace cwd.
- `web`: Vite + React 19 + TypeScript, Tailwind 4 via `@tailwindcss/vite`,
  Preline 5 CSS variants + forms plugin, self-hosted Inter 400/500/600.
- Vite dev server on **127.0.0.1:5173** with `/api` proxy to the API.
- `PrelineInit` component runs `HSStaticMethods.cleanCollection()` +
  `autoInit()` after render (StrictMode-safe).
- Root scripts: `dev`, `dev:web`, `dev:server`, `typecheck`, `test`, `build`.
- Vitest configured (`passWithNoTests`, no tests yet).
- `data/` and `data/backups/` exist and are git-ignored (except `.gitkeep`).

### Pinned versions (exact, no ranges)

| Package | Version |
|---|---|
| vite | 8.3.8 |
| @vitejs/plugin-react | 6.3.0 |
| react / react-dom | 19.2.9 |
| @types/react / @types/react-dom | 19.3.0 |
| typescript | 5.9.3 |
| tailwindcss / @tailwindcss/vite | 4.3.5 |
| @tailwindcss/forms | 0.5.11 |
| preline | 5.1.0 |
| hono | 4.13.18 |
| @hono/node-server | 2.1.8 |
| zod | 4.6.7 |
| dotenv | 18.0.10 |
| tsx | 4.23.15 |
| @types/node | 24.19.2 |
| concurrently | 10.0.7 |
| vitest | 5.1.0 |

### Verification performed

```bash
npm install
npm run typecheck        # shared + server + web, clean
npm test                 # vitest, no test files, exit 0
npm run build            # type-check + production build, clean
npm run dev
curl -s http://127.0.0.1:8787/api/health   # {"ok":true,"app":"[App name]",...}
curl -s http://127.0.0.1:5173/api/health   # same, via Vite proxy
lsof -nP -iTCP:8787 -sTCP:LISTEN           # 127.0.0.1:8787 only
lsof -nP -iTCP:5173 -sTCP:LISTEN           # 127.0.0.1:5173 only
```

Browser check (Playwright): title `[App name]`, `h1` 24 px / 600, computed font
family starts with `Inter`, page background `zinc-50`, status line reads
`Server: ok`, no console errors.

### PRD IDs advanced

NFR-1, NFR-2, NFR-3, NFR-8 (foundation only; no FR closed yet).

---

## Decisions

| # | Decision |
|---|---|
| D1 | **Vite 8.3.8 + plugin-react 6.3.0** instead of the approved 7.3.8/5.2.0. Vitest 5.1.0 depends on Vite 8, and npm hoisted a second Vite copy, which broke plugin types (`hotUpdate` incompatibility). One Vite version is the safer stack; Preline 5.1.0 is framework-agnostic and works on it. |
| D2 | npm workspaces (pnpm not installed). |
| D3 | `tsx` runs the server in dev (`tsx watch`). |
| D4 | Inter self-hosted as three woff2 files in `web/public/fonts` — no CDN, satisfies NFR-1. |
| D5 | Tailwind 4 via `@tailwindcss/vite`; Preline `variants.css` imported, `theme.css` deliberately **not** imported so DESIGN tokens stay authoritative. |
| D6 | New/inbox tasks default to status "To do"; ticking a checkbox sets the first `done` status ("Done"), unticking returns "To do". |
| D7 | Delete project → confirm, tasks move to Inbox; archive hides the project only (tasks stay visible); delete milestone → its tasks move to project level. |
| D8 | Project % = done tasks ÷ non-archived tasks; current milestone = lowest-position incomplete; Next = earliest-due incomplete task. Today = overdue + due today; dashboard groups them separately. |
| D9 | TagChip reuses LocationChip styling (max 2 + "+N" on rows); checklist progress added to TaskRow. |
| D10 | M1 hides "Ask assistant" and the Reviews nav; ReviewCard renders only when a review exists. Task detail drawer is built in M1-S5. |
| D11 | Restore lists `data/backups/*.db` server-side and restores by filename; download action included. No upload in M1. |
| D12 | Recurrence keeps one row per occurrence (TECHSTACK §4 recommendation, closes PRD Q3 for engineering). Full schema including `reviews`, `proposals`, `ai_settings` is created in M1-S2. |
| D13 | Vitest + Hono `app.request` for tests; no React Testing Library yet. `db:seed:perf` with 5,000 tasks / 50 projects for NFR-4. |
| D14 | Search covers title + notes. |
| D15 | Specs stay in `docs/`; TECHSTACK §3's root-level paths are treated as illustrative. |
| D16 | All env paths resolve from the repo root; `shared` is imported as TS source (no build artifact). |

## Follow-ups / known gaps

- **ESLint + Prettier** (TECHSTACK §2 tooling) not installed yet — decide whether to
  add before M1-S3 or in M4-S16.
- `preline/non-auto` currently ships as a ~400 kB (96 kB gzip) dynamic chunk.
  Switch to per-plugin imports (`preline/plugins/*`) in M1-S4 when the sidebar,
  offcanvas and modal are actually used.
- No tests yet; first real ones arrive with recurrence in M1-S8 (plus Hono route
  tests).
- PRD open questions for Keith: Q1 (company AI policy), Q5 (final app name).
  Neither blocks M1.

## Next step — M1-S2

Drizzle schema for all tables in TECHSTACK §4, versioned migrations, WAL mode,
seed the five statuses, `db:generate` / `db:migrate` / `db:seed` scripts.
Delivers FR-4 and FR-14 (seed), storage for FR-6/7/8/15/30.
