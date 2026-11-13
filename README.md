# [App name]

Personal task & project manager. Local-only: one SQLite file, one API bound to
`127.0.0.1`, no cloud sync.

- `docs/PRD.md` — behaviour (what and why)
- `docs/TECHSTACK.md` — architecture, data model, API, build order
- `docs/DESIGN.md` — tokens, components, screens
- `PROGRESS.md` — what is built, decisions, open questions

## Requirements

- Node.js 24+ and npm 10+ (developed with Node 24.16.0, npm 11.13.0)
- Chrome or Edge, viewport ≥ 1280 px

## Run

```bash
npm install
cp .env.example .env     # first time only
npm run db:migrate       # create data/app.db from the migrations
npm run db:seed          # five default statuses + review schedule defaults
npm run dev
```

- Web: <http://127.0.0.1:5173>
- API: <http://127.0.0.1:8787/api/health>

Both bind to loopback only. `npm run dev` starts the Hono server and the Vite
dev server together; Vite proxies `/api` to port 8787.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Server + web dev servers |
| `npm run dev:web` | Web only |
| `npm run dev:server` | API only |
| `npm run db:generate` | Generate a migration from `server/src/db/schema.ts` |
| `npm run db:migrate` | Apply pending migrations to `data/app.db` |
| `npm run db:seed` | Seed default statuses and app settings (idempotent) |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run typecheck` | TypeScript across all workspaces |
| `npm test` | Vitest |
| `npm run build` | Type-check and production build of the web app |

## Layout

```
shared/   Zod schemas, shared types, constants (APP_NAME)
server/   Hono API, Drizzle schema and services
web/      React + Vite + Tailwind + Preline
data/     app.db and backups (git-ignored)
```

## Keys

AI provider keys live in the root `.env` and are read by the server only. They
are never sent to the browser and never stored in browser storage (NFR-2).
