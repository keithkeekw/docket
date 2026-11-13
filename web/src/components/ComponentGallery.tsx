import { APP_NAME } from '@app/shared';
import { useState, type ReactNode } from 'react';
import { ApiStatus } from './ApiStatus';
import { Badge, LinkBadge, LocationChip, StatusChip, TagChip } from './Badge';
import { Button } from './Button';
import { DueLabel } from './DueLabel';
import { GroupHeader } from './GroupHeader';
import { Kbd } from './Kbd';
import { PriorityLabel } from './PriorityLabel';
import { ProgressBar } from './ProgressBar';
import { TaskRow, type TaskRowTask } from './TaskRow';
import { ViewSwitcher, type ViewMode } from './ViewSwitcher';

/** Fixed clock so the due-label states stay stable in this gallery. */
const NOW = new Date(2026, 10, 13, 9, 0);

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="mt-6 rounded-xl border border-zinc-200 bg-white px-5 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[15px] font-semibold text-zinc-900">{title}</h2>
        {hint && <p className="text-xs text-zinc-500">{hint}</p>}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

const TASKS: readonly TaskRowTask[] = [
  {
    id: 't1',
    title: 'Send postmortem draft to stakeholders',
    priority: 1,
    estimateMinutes: 30,
    dueDate: '2026-11-12',
    link: { url: 'https://example.test/OPS-112', label: 'OPS-112' },
    location: 'Inbox',
  },
  {
    id: 't2',
    title: 'Archive outdated KB articles (batch 3)',
    priority: 2,
    estimateMinutes: 60,
    dueDate: '2026-11-11',
    location: 'Knowledge base cleanup',
  },
  {
    id: 't3',
    title: 'Reply on vendor escalation',
    priority: 1,
    estimateMinutes: 15,
    dueDate: '2026-11-13',
    dueTime: '10:00',
    link: { url: 'https://example.test/ZD-48213', label: 'ZD-48213' },
    location: 'Inbox',
  },
  {
    id: 't4',
    title: 'Weekly ticket quality review',
    priority: 2,
    estimateMinutes: 90,
    dueDate: '2026-11-13',
    dueTime: '14:00',
    repeatLabel: 'Weekly',
    location: 'Inbox',
  },
  {
    id: 't5',
    title: 'Draft escalation matrix',
    priority: 1,
    dueDate: '2026-11-13',
    checklist: { done: 1, total: 4 },
    location: 'Onboarding playbook v2',
  },
  {
    id: 't6',
    title: 'Ask vendor about SLA report export',
    priority: 3,
    location: 'Inbox',
  },
  {
    id: 't7',
    title: 'Review the December roster for gaps and confirm coverage with the shift leads',
    priority: 2,
    dueDate: '2026-11-16',
    estimateMinutes: 45,
    link: { url: 'https://example.test/ZD-51002', label: 'ZD-51002' },
    checklist: { done: 2, total: 5 },
    tags: ['ops', 'roster', 'planning'],
    location: 'Inbox',
  },
  {
    id: 't8',
    title: 'Prep 1:1 coaching notes',
    priority: 3,
    done: true,
    location: 'Inbox',
  },
];

export function ComponentGallery() {
  const [view, setView] = useState<ViewMode>('list');
  const [completed, setCompleted] = useState<Record<string, boolean>>({});

  const task = (id: string): TaskRowTask => {
    const found = TASKS.find((item) => item.id === id);
    if (!found) throw new Error(`Unknown gallery task ${id}`);
    return { ...found, done: completed[id] ?? found.done ?? false };
  };

  const toggle = (id: string) => (done: boolean) => {
    setCompleted((previous) => ({ ...previous, [id]: done }));
  };

  return (
    <main className="mx-auto max-w-[1120px] px-8 pt-6 pb-12">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="size-[22px] rounded-md bg-zinc-900" />
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{APP_NAME}</h1>
          </div>
          <p className="mt-1 text-sm text-zinc-600">
            Component gallery · M1-S3 · temporary, replaced by the app shell in M1-S4
          </p>
        </div>
        <ApiStatus />
      </header>

      <Section title="Buttons" hint="One dark primary per panel">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">New task</Button>
          <Button variant="secondary">Cancel</Button>
          <Button variant="primary" disabled>
            Disabled primary
          </Button>
          <Button variant="secondary" disabled>
            Disabled secondary
          </Button>
        </div>
      </Section>

      <Section title="Chips and badges" hint="Location, status, tag, link">
        <div className="flex flex-wrap items-center gap-2">
          <LocationChip>Inbox</LocationChip>
          <LocationChip>Onboarding playbook v2</LocationChip>
          <StatusChip>To do</StatusChip>
          <TagChip>ops</TagChip>
          <TagChip>planning</TagChip>
          <LinkBadge href="https://example.test/ZD-48213">ZD-48213</LinkBadge>
          <Badge variant="soft">Soft badge</Badge>
          <Badge variant="outline">Outline badge</Badge>
        </div>
      </Section>

      <Section title="Labels" hint="Priority, due, keyboard">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <PriorityLabel priority={1} />
            <PriorityLabel priority={2} />
            <PriorityLabel priority={3} />
          </div>
          <div className="flex items-center gap-3">
            <DueLabel dueDate="2026-11-12" now={NOW} />
            <DueLabel dueDate="2026-11-13" now={NOW} />
            <DueLabel dueDate="2026-11-13" dueTime="10:00" now={NOW} />
            <DueLabel dueDate="2026-11-16" now={NOW} />
            <DueLabel dueDate="2026-11-16" variant="table" now={NOW} />
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            Capture <Kbd>Ctrl K</Kbd> · confirm <Kbd>Enter</Kbd> · cancel <Kbd>Esc</Kbd>
          </div>
        </div>
      </Section>

      <Section title="Progress" hint="Track zinc-100, fill blue-600">
        <div className="grid max-w-[520px] gap-4">
          <ProgressBar value={0} label="Project progress, 0%" />
          <ProgressBar value={34} label="Project progress, 34%" />
          <ProgressBar value={58} label="Project progress, 58%" />
          <ProgressBar value={100} label="Project progress, 100%" />
        </div>
      </Section>

      <Section title="View switcher" hint="aria-pressed; keeps filters in later steps">
        <ViewSwitcher value={view} onChange={setView} />
      </Section>

      <Section title="Task rows" hint="Fixed clock: Fri 13 Nov 2026, 09:00">
        <div className="rounded-xl border border-zinc-200 pb-2">
          <GroupHeader label="Overdue" count={2} tone="overdue" />
          <ul>
            <TaskRow task={task('t1')} now={NOW} onToggle={toggle('t1')} />
            <TaskRow task={task('t2')} now={NOW} onToggle={toggle('t2')} />
          </ul>

          <GroupHeader label="Today" count={3} />
          <ul>
            <TaskRow task={task('t3')} now={NOW} onToggle={toggle('t3')} />
            <TaskRow task={task('t4')} now={NOW} onToggle={toggle('t4')} />
            <TaskRow task={task('t5')} now={NOW} onToggle={toggle('t5')} />
          </ul>

          <GroupHeader label="Inbox · unsorted" count={3} />
          <ul>
            <TaskRow task={task('t6')} now={NOW} onToggle={toggle('t6')} />
            <TaskRow task={task('t7')} now={NOW} onToggle={toggle('t7')} />
            <TaskRow task={task('t8')} now={NOW} onToggle={toggle('t8')} />
          </ul>
        </div>
      </Section>
    </main>
  );
}
