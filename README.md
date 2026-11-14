# Docket

A personal task and project manager built around quick capture and long-running
projects, with an optional AI assistant that never changes data without your
confirmation.

Local-only: one SQLite file, one API bound to `127.0.0.1`, no cloud sync.
Current version: **1.1.0**.

## Contents

- [Features](#features)
- [Requirements](#requirements)
- [Getting started](#getting-started)
- [AI setup](#ai-setup)
- [Keyboard shortcuts](#keyboard-shortcuts)
- [Your data](#your-data)
- [Updates](#updates)
- [Development](#development)
- [Documentation](#documentation)
- [License](#license)

## Features

**Capture and organise**

- Quick capture from any screen (`⌘/Ctrl K`), with optional AI parsing of free
  text into title, due date, priority, tags and estimate.
- Inbox for unsorted tasks; move them into a project later.
- Projects → milestones/phases → tasks → checklist items.
- Rich tasks: priority, tags, Markdown notes, due date and time, time estimate,
  recurrence, external links (Zendesk, Jira, …) and file attachments.
- One custom status set used everywhere, each status mapped to Open, Active or
  Done.

**See your work**

- **Dashboard** home screen: overdue and due-today tasks, project progress,
  calendar, world clocks and year progress.
- **Today**, **All Tasks**, **Logbook** (completed work) and archived projects.
- **List**, **Table** and **Kanban** views with shared filters, sorting,
  grouping and drag-and-drop.
- Command palette (`⌘/Ctrl P`), undo for deletes, light/dark theme, English and
  Chinese (中文) interface, responsive layout with a mobile tab bar.

**AI assistant (optional)**

| Feature | What it does |
|---|---|
| Capture | Parses a free-text task into structured fields |
| Breakdown | Turns a project idea into milestones and tasks |
| Checklist | Generates a task checklist, using text from attached `.txt`, `.md`, `.json`, `.doc` and `.docx` files (uses the Capture model) |
| Summarize | Writes a project summary |
| Daily / weekly review | Scheduled or on-demand reviews, shown on the **Reviews** screen |
| Chat | A drawer for questions about your tasks (read-only tools) |

Every AI change is shown as a proposal you confirm or discard. Each feature can
use its own provider and model, and the prompts can be edited in
**Settings → Prompt Management**. The app works fully without AI.

## Requirements

- Node.js 24+ and npm 10+ (developed with Node 24.16.0, npm 11.13.0)
- Git (for in-app updates)
- Chrome or Edge; designed for desktop (≥ 1280 px), usable on smaller screens

## Getting started

```bash
git clone https://github.com/keithkeekw/docket.git
cd docket
npm install
cp .env.example .env     # first time only
npm run db:migrate       # create data/app.db from the migrations
npm run db:seed          # five default statuses + review schedule defaults
```

### Run for daily use

```bash
npm start
```

- App: <http://127.0.0.1:9000>
- Builds the web app, starts the API and static server, and supervises it so
  the in-app updater can restart it after an update.
- The sidebar shows the running version (`v1.1.0`) above **Shortcuts**.
- Stop it with `Ctrl+C`.

### Run in development

```bash
npm run dev
```

- Web: <http://127.0.0.1:5173>
- API: <http://127.0.0.1:9000/api/health>

`npm run dev` starts the Hono server and the Vite dev server together; Vite
proxies `/api` to port 9000. Both bind to loopback only. In-app updates are
disabled in dev mode.

## AI setup

1. Add one or both provider keys to the root `.env`:

   ```bash
   DEEPSEEK_API_KEY=sk-...
   OPENROUTER_API_KEY=sk-or-...
   ```

   Optional overrides: `DEEPSEEK_BASE_URL` (default `https://api.deepseek.com`)
   and `OPENROUTER_BASE_URL` (default `https://openrouter.ai/api/v1`).
2. Restart the server.
3. In **Settings → AI**, choose a provider and model for each feature. The model
   list is fetched from the provider.

Keys are read by the server only. They are never sent to the browser, never
stored in browser storage and never committed (`.env` is git-ignored).

## Keyboard shortcuts

| Action | Default |
|---|---|
| Quick capture | `⌘/Ctrl K` |
| Capture with AI parsing | `⌘/Ctrl Enter` |
| Command palette | `⌘/Ctrl P` |
| Shortcut help | `Shift Space` |
| Toggle sidebar | `X` |
| Go to Dashboard / Inbox / Today / All Tasks | `D` / `I` / `T` / `A` |
| Go to Reviews / Logbook / Settings | `R` / `L` / `S` |

Rebind any shortcut in **Settings → Key Bindings**.

## Your data

Everything lives under `data/` (git-ignored):

| Path | Contents |
|---|---|
| `data/app.db` | The SQLite database |
| `data/backups/` | Manual backups and automatic pre-update backups |
| `data/uploads/` | Task attachments |

- **Settings → Data** creates a backup, downloads one, or restores one.
  Backups are not pruned automatically.
- `GET /api/export` downloads everything as JSON or Markdown.
- Restoring a backup made by an older schema is refused and rolled back.

## Updates

Docket reads the latest public GitHub Release for
[`keithkeekw/docket`](https://github.com/keithkeekw/docket/releases).

- **Settings → About & Updates** shows the current version, latest release,
  release notes, and a **Check for Updates** button.
- When a newer release exists, an update pill appears beside the version label
  in the sidebar. Clicking it opens **Settings → About & Updates**.
- The **Update** button asks for confirmation before replacing the checkout.

### How an update runs

1. The supervisor refuses to continue if tracked files have local changes.
2. It backs up the SQLite database to `data/backups/pre-update-*.db`.
3. It fetches tags and checks out the release tag.
4. It runs `npm ci --include=dev`, rebuilds the web app, and applies database
   migrations.
5. The server restarts, and the page reloads when the new version answers.
6. If a step fails, the previous checkout and database backup are restored.

### Requirements and caveats

- Start the app with `npm start`, not `npm run dev`.
- The checkout must be clean. Commit or stash changes before updating.
- Git must be installed and available on `PATH`.
- macOS and Windows are supported. The updater uses Node APIs and `npm.cmd` on
  Windows; the native SQLite backup runs in a child process so `npm ci` does not
  hit locked `.node` files.
- After an update the checkout is detached at the release tag. Run
  `git checkout master` to resume development.

## Development

### Scripts

| Script | Purpose |
|---|---|
| `npm start` | Build, serve, and supervise the production app |
| `npm run dev` | Server + web dev servers |
| `npm run dev:web` | Web only |
| `npm run dev:server` | API only |
| `npm run build` | Type-check and production build of the web app |
| `npm run typecheck` | TypeScript across all workspaces |
| `npm test` | Vitest |
| `npm run lint` / `lint:fix` | ESLint |
| `npm run format` / `format:check` | Prettier |
| `npm run db:generate` | Generate a migration from `server/src/db/schema.ts` |
| `npm run db:migrate` | Apply pending migrations to `data/app.db` |
| `npm run db:seed` | Seed default statuses and app settings (idempotent) |
| `npm run db:seed:perf` | Seed a 5,000-task fixture (set `DATABASE_PATH=./data/perf.db`) |
| `npm run db:studio` | Open Drizzle Studio |

### Stack

| Layer | Tools |
|---|---|
| Web | React 19, Vite, Tailwind CSS 4, Preline, TanStack Query, Zustand, dnd-kit |
| Server | Hono on Node, Drizzle ORM, SQLite, node-cron |
| Shared | Zod schemas and types |
| AI | OpenAI-compatible client for DeepSeek and OpenRouter |

### Layout

```
shared/   Zod schemas, shared types, constants (APP_NAME)
server/   Hono API, Drizzle schema, services, AI client and prompts
web/      React + Vite + Tailwind + Preline
scripts/  Production supervisor and Git-based updater
data/     app.db, backups, uploads and update state (git-ignored)
docs/     PRD, tech stack and design specs
mockups/  Screen mockups and logo sheet
.github/  Release workflow
```

### Publishing a release

Bump the root `package.json` version, commit, then tag and push:

```bash
npm version 1.2.0 --no-git-tag-version
git add -A
git commit -m "Release 1.2.0"
git tag v1.2.0
git push origin master
git push origin v1.2.0
```

The `Release` workflow (`.github/workflows/release.yml`) runs tests, builds the
app, and creates the GitHub Release from the tag.

### Versioning

- The root `package.json` `version` drives the sidebar label and the version
  reported by the API.
- Releases use `vX.Y.Z` tags. The update check ignores tags that do not match
  that shape.
- The internal workspace packages (`shared`, `server`, `web`) keep their own
  versions; only the root version is user-facing.

## Documentation

- `docs/PRD.md` — behaviour (what and why)
- `docs/TECHSTACK.md` — architecture, data model, API, build order
- `docs/DESIGN.md` — tokens, components, screens
- `PROGRESS.md` — what is built, decisions, open questions

## License

[Apache License 2.0](LICENSE)
