# PRD — Docket: Personal Task & Project Manager

| | |
|---|---|
| **Status** | Draft v0.1 |
| **Owner** | Keith |
| **Date** | 13 Nov 2026 |
| **Detail level** | Standard |
| **Companion docs** | `DESIGN.md` (look and feel), `TECHSTACK.md` (how it is built) |

> This document defines **what** the app does and **why**. Architecture, data schema and libraries live in `TECHSTACK.md`; visual specs live in `DESIGN.md`. If this PRD and those docs disagree on behaviour, this PRD wins.

---

## 1. Summary

Keith manages a support team and juggles quick ad-hoc tasks (ticket follow-ups, replies, reminders) alongside long-running improvement projects with phases and many sub-tasks. These currently live in scattered places, which makes it hard to see what is due today and where each project stands. Docket is a minimal, local-only web app that gives one place to capture tasks in seconds, organise long-running projects into milestones, tasks and checklists, and view the same work as a List, Table or Kanban board. An optional AI layer (DeepSeek or OpenRouter, chosen per feature) parses free-text capture, breaks projects down, writes daily and weekly reviews, and answers questions — but never changes data without Keith's confirmation. Success means every work commitment lives in the app, capture takes seconds, and each morning starts from an accurate picture rather than a reconstruction.

## 2. Objectives & Goals

| ID | Goal (outcome) |
|---|---|
| G1 | A new task is captured in under 10 seconds from any screen, without leaving the current view. |
| G2 | All of Keith's active work commitments are tracked in one place (no parallel lists elsewhere). |
| G3 | At the start of each day, Keith knows what is overdue, what is due today and where each project stands, without assembling it manually. |
| G4 | Turning a new project idea into a phased, actionable plan takes noticeably less effort than doing it by hand. |
| G5 | Keith keeps full control of his data: nothing is changed by AI without his explicit approval, and no data is stored outside his machine. |

ASSUMPTION: G1–G4 were inferred from the requirements discussion rather than stated as goals; confirm or adjust them.

## 3. Background & Context

**Why now.** Keith wants a tool shaped around how he actually works — quick capture plus long-running projects — rather than adapting to a general-purpose SaaS tool, and wants AI assistance from providers he already has accounts with.

**Key scoping decisions (agreed in discovery):**

- Local-only on Keith's machine; single user.
- Minimal visual design; one calm home dashboard.
- Rich tasks: priority, tags, notes, due date/time, time estimate, recurrence, external links (e.g. Zendesk, Jira).
- One custom status set used across the whole app; each status belongs to a category (Open, Active, Done).
- Inbox tasks are ordinary tasks without a project and can be moved into a project later.
- Hierarchy: Project → Milestone/Phase (optional) → Task → Checklist item.
- AI for: capture parsing, project breakdown, daily/weekly reviews (automated and manual), chat. Every AI change is previewed and confirmed.
- Per-feature AI model choice (DeepSeek or OpenRouter model) in Settings.

**Prior art.** Concept screens exist on the design canvas (Dashboard, Project Kanban, All-tasks Table, AI Quick Capture) and are described in `DESIGN.md`.

## 4. Target Users / Personas

**P1 — Keith, Technical Support Manager (sole user).**
- Leads a global production support team; work mixes reactive items (escalations, ticket follow-ups), recurring rituals (quality reviews, 1:1 coaching prep) and improvement projects running for weeks or months.
- Comfortable with developer tools and keyboard-driven workflows; not a developer by background.
- Environment: work laptop, desktop browser, KL time zone.
- Job to be done: "Get things out of my head fast, see what matters today, and keep long projects moving without losing sub-tasks."

## 5. User Stories

**Capture & inbox**

**US-1** As Keith, I want to type a task into a capture bar and press Enter so that it is saved instantly to my inbox.
- Given the capture bar is focused, when I type a title and press Enter, then a task with that title appears in the Inbox within 1 second.
- The capture bar can be opened from any screen with a keyboard shortcut.

**US-2** As Keith, I want to write a task in natural language and have it turned into structured fields so that I don't fill in a form.
- Given input such as "reply to ZD-48213 tomorrow 10am p1 30m", the app proposes a task with title, due date/time, priority, estimate and link filled in.
- One input that describes several tasks produces several proposed tasks.
- Nothing is saved until I confirm; I can edit any proposed field or untick any proposed task first.

**US-3** As Keith, I want to move an inbox task into a project (and optionally a milestone) so that ad-hoc items can join a plan later.
- After moving, the task no longer shows in the Inbox and appears under the chosen project/milestone with all its fields intact.

**Projects**

**US-4** As Keith, I want to create a project with optional milestones so that long-running work is organised in phases.
- I can create a project with name and description and add, rename, reorder and complete milestones.
- A project without milestones holds tasks directly.

**US-5** As Keith, I want the AI to propose milestones and tasks for a project from its description so that planning starts from a draft.
- The proposal is shown as a list of new milestones and tasks I can edit, untick or accept.
- Accepting creates exactly the items I left ticked; rejecting creates nothing.

**US-6** As Keith, I want lightweight checklist items inside a task so that small steps don't become full tasks.
- A checklist item has only a title and a done state; the task shows progress (e.g. "1/4").

**US-7** As Keith, I want to see each project's progress so that I know where it stands at a glance.
- Each project shows its current milestone, completed vs total tasks, a percentage and the next due task.

**Views & organisation**

**US-8** As Keith, I want to switch any task collection between List, Table and Kanban so that I can use the view that fits the moment.
- Switching views keeps the current filters and selection of tasks.
- Kanban columns are the app's statuses in their configured order.

**US-9** As Keith, I want to drag a card between Kanban columns so that updating status is one gesture.
- After dropping, the task's status is updated and persists after reload.
- The same change is possible by keyboard.

**US-10** As Keith, I want to define my own statuses once and use them everywhere so that my workflow is consistent.
- I can add, rename, reorder and remove statuses and assign each to Open, Active or Done.
- A status in use cannot be removed until its tasks are moved to another status.

**US-11** As Keith, I want recurring tasks so that rituals like weekly reviews reappear automatically.
- When a recurring task is completed, the next occurrence is created with the next due date per its rule.
- Supported rules include daily, weekly on chosen days, every N weeks and monthly.

**US-12** As Keith, I want to attach external links (e.g. Zendesk ticket, Jira issue) to a task so that I can jump to the source.
- A link shows as a short badge (e.g. "ZD-48213") and opens the URL in a new tab.

**Home & reviews**

**US-13** As Keith, I want a dashboard home showing overdue, today and inbox tasks plus active projects so that I start each day oriented.
- Opening the app lands on the dashboard; counts on it match the underlying data.

**US-14** As Keith, I want an AI daily review generated automatically each morning, and a weekly review each week, so that I get a summary without asking.
- At the configured time, if the app is running, a review is generated and shown on the dashboard.
- If the app was not running at that time, the missed review is generated the next time it starts.

**US-15** As Keith, I want to generate a review on demand so that I can get a fresh summary mid-day.
- A "Regenerate" action produces a new review; previous reviews remain viewable.

**AI assistant & settings**

**US-16** As Keith, I want to ask questions about my tasks and projects in a chat so that I can query my work in plain language.
- Answers reflect current data (e.g. "what's overdue in Knowledge base cleanup?").
- Any change the assistant suggests is shown as a proposal requiring my confirmation.

**US-17** As Keith, I want to choose the AI provider and model for each AI feature so that I can balance cost and quality.
- Settings lists each AI feature with a provider/model selector; changes apply to the next AI request.

**US-18** As Keith, I want to exclude specific projects from AI so that sensitive work never leaves my machine.
- Tasks in an excluded project are never included in any AI request, including reviews and chat.

**Data safety**

**US-19** As Keith, I want to back up and restore all my data so that I don't lose work.
- A backup can be created on demand; restoring it brings back all projects, tasks, settings and reviews.

## 6. Functional Requirements

| ID | Requirement | Priority | Traces to |
|---|---|---|---|
| FR-1 | Global capture bar available on every screen, opened by a keyboard shortcut while the app is focused. | Must | US-1, G1 |
| FR-2 | Plain capture (Enter) saves a task to Inbox without calling AI. | Must | US-1, G1 |
| FR-3 | AI capture mode parses free text into one or more proposed tasks with fields filled in. | Must | US-2, G1 |
| FR-4 | Tasks support: title, notes, status, priority (P1–P3), tags, due date, optional due time, time estimate, recurrence rule, external links, checklist items. | Must | US-2, US-6, US-11, US-12 |
| FR-5 | A task can be moved between Inbox, any project and any milestone. | Must | US-3 |
| FR-6 | Create, edit, archive and delete projects (name, description, optional target date). | Must | US-4 |
| FR-7 | Create, edit, reorder and complete milestones within a project; milestones are optional. | Must | US-4 |
| FR-8 | Checklist items (title + done) within tasks, with progress count shown on the task. | Must | US-6 |
| FR-9 | Project progress: current milestone, done/total tasks, percentage, next due task. | Must | US-7, G3 |
| FR-10 | List, Table and Kanban views for: All tasks, a project, Today, Inbox. | Must | US-8 |
| FR-11 | Filters (status, project, priority, tag, due range) and search persist across view switches. | Must | US-8 |
| FR-12 | Kanban drag-and-drop between status columns, with a keyboard alternative. | Must | US-9 |
| FR-13 | Table view supports sorting by any column and grouping by project, status or priority. | Should | US-8 |
| FR-14 | Custom status set with name, order and category (Open / Active / Done). | Must | US-10 |
| FR-15 | Recurring tasks generate the next occurrence on completion. | Must | US-11 |
| FR-16 | External links display as short badges derived from the URL and open in a new tab. | Should | US-12 |
| FR-17 | Dashboard home: Overdue, Today, Inbox groups; active projects with progress; latest review. | Must | US-13, G3 |
| FR-18 | AI project breakdown proposes milestones and tasks from a project description. | Should | US-5, G4 |
| FR-19 | Automated daily review at a configurable time; automated weekly review on a configurable day. | Should | US-14, G3 |
| FR-20 | Missed automated reviews are generated on next app start. | Should | US-14 |
| FR-21 | On-demand review generation; past reviews are stored and browsable. | Should | US-15 |
| FR-22 | Chat assistant answers questions using current task and project data. | Could | US-16 |
| FR-23 | All AI-originated creates, updates and deletes go through a single preview-and-confirm panel with per-item edit and untick. | Must | US-2, US-5, US-16, G5 |
| FR-24 | Settings: provider and model per AI feature (capture, breakdown, reviews, chat). | Must | US-17 |
| FR-25 | Settings: per-project "exclude from AI" flag, enforced for every AI feature. | Must | US-18, G5 |
| FR-26 | Settings: AI provider keys can be configured; app shows clearly when a provider is not configured and AI features degrade gracefully. | Must | US-17 |
| FR-27 | Backup on demand and restore from backup. | Must | US-19, G5 |
| FR-28 | Export all data to a portable format (JSON or Markdown). | Could | US-19 |
| FR-29 | Undo for the last destructive action (delete, bulk move). | Should | G5 |
| FR-30 | Tags: create on the fly, filter by tag. | Should | US-8 |

## 7. Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-1 | **Local data.** All app data is stored only on Keith's machine. The only outbound traffic is AI requests to the provider configured for that feature. |
| NFR-2 | **Key safety.** AI provider keys are never visible in the UI after entry and never stored in browser storage. |
| NFR-3 | **Network exposure.** The app is reachable only from the local machine, not from other devices on the network. |
| NFR-4 | **Performance.** Dashboard and any view render in under 1 second with 5,000 tasks and 50 projects. Plain capture saves in under 200 ms. |
| NFR-5 | **AI responsiveness.** AI actions show progress immediately and can be cancelled; a proposal appears within 15 seconds or a clear timeout message is shown. |
| NFR-6 | **Durability.** A confirmed change survives an app crash or machine restart; no partial writes from a single confirm action. |
| NFR-7 | **Accessibility.** WCAG 2.1 AA: all actions keyboard-operable, visible focus, text contrast at least 4.5:1. |
| NFR-8 | **Platform.** Latest stable Chrome and Edge on Keith's work laptop; usable down to 1280 px wide. |
| NFR-9 | **Resilience to AI failure.** If AI is unavailable or returns invalid output, no data is changed and core (non-AI) features remain fully usable. |

## 8. Scope & Out-of-Scope

**In scope (v1):** quick capture, inbox, projects with milestones, tasks, checklists, custom statuses, recurrence, external links, tags, List/Table/Kanban, dashboard, AI capture/breakdown/reviews/chat with preview-and-confirm, per-feature model settings, AI exclusion, backup/restore.

**Out of scope:**
- Multiple users, sharing, permissions or collaboration.
- Sync across devices; access from phone or other machines.
- Native mobile app.
- System-wide (OS-level) capture shortcut when the app is not focused — candidate for a later phase.
- Live two-way sync with Zendesk or Jira (links only).
- Notifications, email or push reminders.
- Calendar integration and time tracking.
- File attachments.
- Gantt charts and dependency management between tasks.
- Dark mode (v1 ships light only; design tokens should not prevent it later).

## 9. Assumptions, Constraints & Dependencies

**Assumptions**
- ASSUMPTION: Goals G1–G4 reflect Keith's intent (inferred, not stated).
- ASSUMPTION: Expected volume is under 5,000 tasks and 50 projects in the first year.
- ASSUMPTION: The work laptop runs the latest Chrome or Edge, and Keith can run a local development server on it.
- ASSUMPTION: Priority uses three levels (P1–P3); default for new tasks is P3.
- ASSUMPTION: Week starts on Monday; time zone follows the machine (KL).
- ASSUMPTION: Weekly review runs Monday morning by default; daily review at 07:30.

**Constraints**
- Local-only, single user.
- Front end built with Vite, React, Tailwind CSS and Preline UI (see `TECHSTACK.md`).
- AI providers limited to DeepSeek and OpenRouter.
- Built with an AI coding agent (OpenCode); requirements must be explicit and testable.

**Dependencies**
- DeepSeek and OpenRouter accounts and API keys (owner: Keith).
- Company policy on sending work data to third-party AI providers (owner: Keith to confirm).

## 10. Success Metrics

| Metric | Baseline | Target | Measurement |
|---|---|---|---|
| Time to capture a task | Unknown — to be measured | ≤ 10 s median | Time 10 captures in week 1 and again in week 4 |
| Work commitments tracked in app | Unknown — to be measured | ≥ 90% | Weekly self-check: list commitments from memory/chat/email; count how many exist in app |
| Days started from the dashboard/review | 0 (app doesn't exist) | ≥ 4 of 5 workdays | Count of daily reviews opened per week (stored with each review) |
| AI capture accepted without edits | Unknown — to be measured | ≥ 70% of proposed tasks | Ratio of accepted-unchanged to proposed items (logged per proposal) |
| Effort to plan a new project | Unknown — to be measured | 50% less than by hand | Time to first workable plan for next 3 projects, with vs without AI breakdown |
| AI changes made without confirmation | — | 0 | Every AI-originated change has a matching confirm record |

## 11. Open Questions & Risks

**Open questions**
1. Does company policy allow sending task text (which may reference tickets or customers) to DeepSeek / OpenRouter? This decides whether FR-25 is enough or AI must be off by default.
2. Should the weekly review cover only the past week, or also plan the coming week?
3. Should completed recurring tasks keep their history (one record per occurrence) or roll forward a single record? (Engineering to decide; affects reporting.)
4. Is a later desktop wrapper wanted for an OS-level capture shortcut and auto-start (helps scheduled reviews)?
5. Final app name.

**Risks**

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Work data sent to third-party AI against policy | Medium | High | Resolve Q1 before enabling AI on real work; FR-25 exclusion |
| Scheduled reviews missed when app isn't running | High | Low | FR-20 catch-up on start |
| AI parsing errors create wrong dates/projects | Medium | Medium | FR-23 preview; dates shown absolute (e.g. "Sat 14 Nov, 14:00") |
| Scope creep slows delivery | Medium | Medium | Ship by milestones below; keep out-of-scope list firm |
| Coding agent drifts from the design | Medium | Low | `DESIGN.md` tokens and component specs; build per component |

**Deferred to `TECHSTACK.md`:** data storage, schema, API shape, AI request handling, scheduling, backup format.

## 12. Milestones

| Phase | Contents | Exit criteria |
|---|---|---|
| M1 — Core | Tasks, inbox, plain capture, projects, milestones, checklists, statuses, tags, recurrence, links, List/Table/Kanban, dashboard, backup/restore | US-1, 3, 4, 6–13, 19 accepted |
| M2 — AI capture & planning | Settings for providers/models, AI exclusion, preview panel, AI capture, project breakdown | US-2, 5, 17, 18 accepted |
| M3 — AI reviews & chat | Automated + on-demand reviews, review history, chat assistant | US-14, 15, 16 accepted |
| M4 — Polish | Undo, export, sorting/grouping refinements; evaluate desktop wrapper | FR-13, 28, 29 done; Q4 answered |

---

## PRD Self-Check

| Check | Result | Note |
|---|---|---|
| Critical four inputs present | Pass (with flags) | Problem, user, constraints stated; goals inferred and flagged as ASSUMPTION |
| Goals are outcomes | Pass | G1–G5 describe results, not features |
| FRs have ID, MoSCoW, trace | Pass | FR-1 to FR-30 all traced |
| Stories have testable acceptance criteria | Pass | Each story has 1–3 observable checks |
| Out-of-scope list present | Pass | 10 explicit exclusions |
| Metrics have baseline, target, method | Pass | Baselines marked "unknown — to be measured" where none exists |
| No implementation detail in body | Pass | Stack named only as a constraint; details deferred to TECHSTACK.md |
| Assumptions labelled | Pass | Six ASSUMPTION lines in §9 |
