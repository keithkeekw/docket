import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Kbd } from '../components/Kbd';
import { PageHeader } from '../components/PageHeader';
import { PriorityLabel } from '../components/PriorityLabel';
import { useT } from '../lib/i18n';
import { bindingLabel, modKeyLabel } from '../lib/platform';
import { ALL_SHORTCUTS, useKeybindingsStore } from '../store/keybindings';

const SECTIONS = [
  { id: 'getting-started', title: 'Getting Started' },
  { id: 'capture', title: 'Capturing Tasks' },
  { id: 'priorities', title: 'Priorities' },
  { id: 'views', title: 'Lists and Views' },
  { id: 'logbook', title: 'Logbook' },
  { id: 'dashboard', title: 'Dashboard' },
  { id: 'projects', title: 'Projects' },
  { id: 'task-detail', title: 'Task Details' },
  { id: 'ai', title: 'AI Features' },
  { id: 'shortcuts', title: 'Keyboard Shortcuts' },
  { id: 'settings', title: 'Settings' },
  { id: 'data', title: 'Data and Privacy' },
] as const;

/**
 * The in-app User Guide. Written for the person using Docket, not for
 * developers; every screen and shortcut is reachable from here in words.
 */
export function GuideRoute() {
  const t = useT();
  const bindings = useKeybindingsStore((state) => state.bindings);

  return (
    <>
      <PageHeader
        title={t('User Guide')}
        description={t('Everything Docket can do, from capture to the Logbook.')}
      />

      <div className="mt-6 grid gap-6 min-[950px]:grid-cols-[190px_1fr]">
        <nav aria-label={t('Guide Contents')} className="hidden min-[950px]:block">
          <div className="sticky top-6 rounded-xl border border-zinc-200 bg-white p-3">
            <p className="px-2 pb-1 text-[11px] font-medium tracking-wide text-zinc-400 uppercase">
              {t('Contents')}
            </p>
            <ul className="flex flex-col">
              {SECTIONS.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="block rounded-lg px-2 py-1.5 text-[13px] text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                  >
                    {t(section.title)}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <div className="flex max-w-[760px] flex-col gap-4">
          <GuideSection id="getting-started" title={t('Getting Started')}>
            <p>
              {t('Docket is a local task manager. Everything is stored on this machine, and the sidebar is your map: Dashboard, Inbox, Today, All Tasks, Reviews, Logbook, projects and Settings.')}
            </p>
            <p>
              {t('The three circular buttons at the top right open this guide, choose the language, and choose a Light, Dark or Automatic theme. The floating arrow at the bottom right returns a long page to the top.')}
            </p>
          </GuideSection>

          <GuideSection id="capture" title={t('Capturing Tasks')}>
            <p>
              {t('Press')} <Kbd>{bindingLabel(bindings.quickCapture ?? 'mod+k')}</Kbd>{' '}
              {t('anywhere to open Quick Capture, or use the capture bar on the Dashboard. Type naturally and Docket picks out the details for you.')}
            </p>
            <ul>
              <li>{t('“Call the plumber tomorrow p1” — title, date and priority.')}</li>
              <li>{t('“Pay rent every month at 9am” — title, repeat and time.')}</li>
              <li>{t('“Team sync every Monday” — weekly task anchored to Monday.')}</li>
              <li>{t('“Review invoices every 2 weeks” — a two-week interval.')}</li>
            </ul>
            <p>
              {t('Enter saves straight away. From a project or a Kanban column, the new task lands in that project or status. For a preview of AI-parsed work, press')}{' '}
              <Kbd>{bindingLabel(bindings.aiCapture ?? 'mod+enter')}</Kbd>{' '}
              {t('instead: nothing is created until you confirm the proposal.')}
            </p>
          </GuideSection>

          <GuideSection id="priorities" title={t('Priorities')}>
            <p>
              {t('Every task has one of three priorities. They are a lens for deciding what to do next — they do not change due dates or move tasks automatically.')}
            </p>

            <div className="flex flex-col gap-2">
              <div className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <span className="mt-0.5 w-7 shrink-0">
                  <PriorityLabel priority={1} />
                </span>
                <div>
                  <p className="text-sm font-medium text-zinc-900">{t('P1 — Urgent, do next')}</p>
                  <p className="mt-0.5 text-sm text-zinc-600">
                    {t('Something that needs attention now: a deadline today, a blocked colleague, or work that becomes expensive if it waits.')}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <span className="mt-0.5 w-7 shrink-0">
                  <PriorityLabel priority={2} />
                </span>
                <div>
                  <p className="text-sm font-medium text-zinc-900">{t('P2 — Important, plan it in')}</p>
                  <p className="mt-0.5 text-sm text-zinc-600">
                    {t('Work that matters this week but is not on fire. Schedule it around your P1s.')}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <span className="mt-0.5 w-7 shrink-0">
                  <PriorityLabel priority={3} />
                </span>
                <div>
                  <p className="text-sm font-medium text-zinc-900">{t('P3 — Normal, the default')}</p>
                  <p className="mt-0.5 text-sm text-zinc-600">
                    {t('Everything else. New tasks start here unless you say otherwise; keep them here until a date or a person makes them urgent.')}
                  </p>
                </div>
              </div>
            </div>

            <p>
              {t('Type priorities naturally during capture (“pay rent tomorrow p1”), or pick one in the task drawer. The All Tasks filters and Table view can sort or narrow by priority. A useful rule: if everything is P1, nothing is.')}
            </p>
          </GuideSection>

          <GuideSection id="views" title={t('Lists and Views')}>
            <ul>
              <li>
                <strong>{t('Inbox')}</strong>{' '}
                {t('shows work with no project, in List or Table view.')}
              </li>
              <li>
                <strong>{t('Today')}</strong>{' '}
                {t('combines overdue work with everything due today.')}
              </li>
              <li>
                <strong>{t('All Tasks')}</strong>{' '}
                {t('and projects offer List, Table and Kanban. Table columns sort; Kanban cards drag between statuses.')}
              </li>
              <li>
                {t('In List view, drag the six-dot handle beside a task to change its order.')}
              </li>
              <li>
                {t('Choose')} <strong>{t('Select Tasks')}</strong>{' '}
                {t('for bulk selection, then delete the batch in one go. The Undo bar brings it back.')}
              </li>
              <li>
                {t('A completed task stays in the list for three seconds while it fades, then moves to the Logbook.')}
              </li>
            </ul>
          </GuideSection>

          <GuideSection id="logbook" title={t('Logbook')}>
            <p>
              {t('Finished work lives in the Logbook. Every row is checked and struck through. Uncheck one to reactivate it: the task clears its completion date, returns to its old collection and leaves the Logbook.')}
            </p>
          </GuideSection>

          <GuideSection id="dashboard" title={t('Dashboard')}>
            <ul>
              <li>
                {t('The review card shows the latest Daily or Weekly review, with buttons to regenerate it or open the full Reviews page.')}
              </li>
              <li>
                {t('Tasks are grouped into Overdue, Today and Inbox · Unsorted. “Open in Table” jumps to the full list.')}
              </li>
              <li>
                {t('The month calendar highlights days with tasks due; use the arrows to look at another month.')}
              </li>
              <li>
                {t('Active Projects show progress and the next due task. A project at 100% offers an')}{' '}
                <strong>{t('Archive')}</strong>{' '}
                {t('button, moving it to Archived Projects.')}
              </li>
              <li>
                <strong>{t('Rearrange')}</strong>{' '}
                {t('turns on drag handles so you can reorder the Dashboard cards. The order is remembered on this device.')}
              </li>
            </ul>
          </GuideSection>

          <GuideSection id="projects" title={t('Projects')}>
            <p>
              {t('Create a project from the sidebar or Dashboard, then give it a description, target date and optional milestones. The project screen gathers its tasks and progress. Projects can be archived when finished or deleted; deleted projects keep their tasks and move them to the Inbox.')}
            </p>
            <p>
              {t('Use')} <strong>{t('Exclude this project from AI')}</strong>{' '}
              {t('when its name and tasks should never be sent to an AI provider.')}
            </p>
          </GuideSection>

          <GuideSection id="task-detail" title={t('Task Details')}>
            <p>{t('Click any task title to open the drawer. It contains:')}</p>
            <ul>
              <li>
                {t('Title, notes (Markdown that formats inside the editor as you type), project, milestone, status, priority, due date, due time, estimate and repeat.')}
              </li>
              <li>
                {t('A checklist with optional AI generation, links, tags and file uploads (up to 10 MB each). AI checklists read the task title, notes and readable attachments — text files and Word .doc/.docx — as context; binary files are skipped.')}
              </li>
              <li>{t('Download or remove uploaded files; every delete asks for confirmation first.')}</li>
              <li>{t('Save, delete, or undo the last destructive action from the Undo bar.')}</li>
            </ul>
          </GuideSection>

          <GuideSection id="ai" title={t('AI Features')}>
            <p>
              {t('The assistant opens with')}{' '}
              <Kbd>{bindingLabel(bindings.askAssistant ?? 'ctrl+alt+shift+meta+a')}</Kbd>
              {t(', or from')} <strong>{t('Ask Assistant')}</strong>{' '}
              {t('on the Dashboard. It can answer questions about your work and propose changes; proposals are previewed before anything is written.')}
            </p>
            <p>{t('Other AI features include:')}</p>
            <ul>
              <li>{t('Capture — turn text into one or more proposed tasks.')}</li>
              <li>{t('Breakdown — turn a project into milestones and tasks.')}</li>
              <li>{t('Summarize — a prose status summary on a project screen.')}</li>
              <li>{t('Checklist generation inside a task.')}</li>
              <li>{t('Daily and weekly reviews.')}</li>
              <li>{t('Chat with your tasks, projects and reviews.')}</li>
            </ul>
            <p>
              {t('Configure a provider and model for each feature in')}{' '}
              <strong>{t('Settings → AI')}</strong>
              {t('. API keys live in the server’s')} <code>.env</code>{' '}
              {t('file and are never shown in the app.')}{' '}
              <strong>{t('Prompt Management')}</strong>{' '}
              {t('lets you edit the instructions behind each feature or reset them to the built-in defaults.')}
            </p>
          </GuideSection>

          <GuideSection id="shortcuts" title={t('Keyboard Shortcuts')}>
            <p>
              {t('Press')} <Kbd>{bindingLabel(bindings.shortcutHelp ?? 'shift+space')}</Kbd>{' '}
              {t('for the full cheat sheet at any time. Every configurable binding can be changed in Settings → Key Bindings.')}
            </p>
            <ul className="not-prose">
              {ALL_SHORTCUTS.map((shortcut) => (
                <li key={shortcut.id} className="flex items-center justify-between gap-4">
                  <span>{t(shortcut.label)}</span>
                  <Kbd>{bindingLabel(bindings[shortcut.id] ?? shortcut.defaultBinding)}</Kbd>
                </li>
              ))}
            </ul>
          </GuideSection>

          <GuideSection id="settings" title={t('Settings')}>
            <ul>
              <li>
                <strong>{t('Statuses')}</strong>{' '}
                {t('— rename, recategorise and reorder the columns used by Kanban and the status picker.')}
              </li>
              <li>
                <strong>{t('Key Bindings')}</strong>{' '}
                {t('— click a shortcut to record a new one.')}
              </li>
              <li>
                <strong>{t('AI')}</strong>{' '}
                {t('— choose a provider and model per feature.')}
              </li>
              <li>
                <strong>{t('Prompt Management')}</strong>{' '}
                {t('— read, edit and reset the system prompts.')}
              </li>
              <li>
                <strong>{t('Privacy')}</strong>{' '}
                {t('— see which projects are excluded from AI.')}
              </li>
              <li>
                <strong>{t('Data')}</strong>{' '}
                {t('— create and restore backups, and export everything as JSON or Markdown.')}
              </li>
            </ul>
          </GuideSection>

          <GuideSection id="data" title={t('Data and Privacy')}>
            <p>
              {t('Docket runs on this machine. Tasks, projects, settings and reviews live in the local SQLite database; uploaded files are kept beside it. Nothing is synced to a cloud service.')}
            </p>
            <p>
              {t('Backups are complete copies of the database. Export gives you a portable JSON or Markdown copy. If AI is not configured, it is never called.')}
            </p>
            <p>
              {t('Tip: press')} <Kbd>{modKeyLabel()} P</Kbd>{' '}
              {t('for the Command Palette to jump to any page, project or action.')}
            </p>
          </GuideSection>

          <p className="pb-4 text-xs text-zinc-500">
            {t('Need to get back to work?')}{' '}
            <Link to="/" className="text-blue-600 hover:underline">
              {t('Return to the Dashboard')}
            </Link>
            .
          </p>
        </div>
      </div>
    </>
  );
}

function GuideSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-6 rounded-xl border border-zinc-200 bg-white p-5"
    >
      <h2 className="text-[15px] font-semibold text-zinc-900">{title}</h2>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-zinc-600 [&_li]:my-1 [&_strong]:font-medium [&_strong]:text-zinc-900 [&_ul]:list-disc [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}
