import type { Priority } from '@app/shared';
import { useEffect, useState } from 'react';
import { useNavSummary } from '../api/nav';
import { useStatuses } from '../api/statuses';
import { useTags } from '../api/taskDetail';
import { useCompleteTask, useTasks, useUpdateTask } from '../api/tasks';
import { Button } from '../components/Button';
import { FilterChip, type FilterOption } from '../components/FilterChip';
import { PageHeader } from '../components/PageHeader';
import { QuickCaptureButton } from '../components/QuickCaptureButton';
import { TaskViewBody } from '../components/TaskViewBody';
import { ViewSwitcher } from '../components/ViewSwitcher';
import { useT } from '../lib/i18n';
import { hasActiveFilters, type DueRange } from '../lib/taskFilters';
import { useUiStore } from '../store/ui';
import { toServerFilter, useViewStore } from '../store/view';

const PRIORITY_OPTIONS: FilterOption[] = [
  { value: '1', label: 'P1' },
  { value: '2', label: 'P2' },
  { value: '3', label: 'P3' },
];

const DUE_OPTIONS: FilterOption[] = [
  { value: 'overdue', label: 'Overdue' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Next 7 Days' },
];

/** DESIGN §5.3 All tasks: title, view switcher, search + chips, then the body. */
export function AllTasksRoute() {
  const t = useT();
  const view = useViewStore((state) => state.view);
  const setView = useViewStore((state) => state.setView);
  const filters = useViewStore((state) => state.filters);
  const setFilters = useViewStore((state) => state.setFilters);
  const clearFilters = useViewStore((state) => state.clearFilters);
  const tableSort = useViewStore((state) => state.tableSort);
  const tableGroup = useViewStore((state) => state.tableGroup);
  const toggleTableSort = useViewStore((state) => state.toggleTableSort);
  const setTableGroup = useViewStore((state) => state.setTableGroup);

  const openTask = useUiStore((state) => state.openTask);
  const openCapture = useUiStore((state) => state.openCapture);

  const serverFilter = toServerFilter(filters);
  // Kanban's Done column must keep completed cards; List and Table stay open-only.
  const taskFilter =
    view === 'kanban' ? { ...serverFilter, completed: 'all' as const } : serverFilter;
  const tasks = useTasks(taskFilter);
  const statuses = useStatuses();
  const tags = useTags();
  const nav = useNavSummary();
  const completeTask = useCompleteTask();
  const updateTask = useUpdateTask();

  const [search, setSearch] = useState(filters.q);

  // Debounced so typing does not fire a request per keystroke.
  useEffect(() => {
    if (search === filters.q) return;

    const timer = setTimeout(() => {
      setFilters({ q: search });
    }, 200);

    return () => {
      clearTimeout(timer);
    };
  }, [search, filters.q, setFilters]);

  const rows = tasks.data?.tasks ?? [];
  const active = hasActiveFilters(serverFilter);

  const statusOptions: FilterOption[] = (statuses.data?.statuses ?? []).map((status) => ({
    value: status.id,
    label: status.name,
  }));

  const projectOptions: FilterOption[] = [
    { value: 'none', label: t('Inbox') },
    ...(nav.data?.projects ?? []).map((project) => ({ value: project.id, label: project.name })),
  ];

  const dueOptions: FilterOption[] = DUE_OPTIONS.map((option) => ({
    ...option,
    label: t(option.label),
  }));

  const tagOptions: FilterOption[] = (tags.data?.tags ?? []).map((tag) => ({
    value: tag.name,
    label: tag.name,
  }));

  const countLabel = `${t(rows.length === 1 ? '{count} task' : '{count} tasks', {
    count: rows.length,
  })}${active ? ` · ${t('filtered')}` : ''}`;

  const emptyMessage = active
    ? t('No tasks match these filters.')
    : t('No tasks yet.');

  const viewControls = (
    <div className="flex items-center gap-2">
      <QuickCaptureButton
        onClick={() => {
          openCapture();
        }}
      />
      <ViewSwitcher value={view} onChange={setView} />
    </div>
  );

  return (
    <>
      <PageHeader title={t('All Tasks')} />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={search}
          aria-label={t('Search Tasks')}
          placeholder={t('Search Tasks')}
          className="min-h-10 min-w-[240px] flex-1 rounded-[10px] border border-zinc-200 bg-white px-3 text-[13px] text-zinc-900 placeholder:text-zinc-500"
          onChange={(event) => {
            setSearch(event.target.value);
          }}
        />

        <FilterChip
          label={t('Status')}
          options={statusOptions}
          selected={filters.statusIds}
          onChange={(values) => {
            setFilters({ statusIds: values });
          }}
        />

        <FilterChip
          label={t('Priority')}
          options={PRIORITY_OPTIONS}
          selected={filters.priorities.map(String)}
          onChange={(values) => {
            setFilters({ priorities: values.map(Number) as Priority[] });
          }}
        />

        <FilterChip
          label={t('Project')}
          options={projectOptions}
          multiple={false}
          selected={filters.project ? [filters.project] : []}
          onChange={(values) => {
            setFilters({ project: values[0] ?? null });
          }}
        />

        <FilterChip
          label={t('Tag')}
          options={tagOptions}
          multiple={false}
          selected={filters.tag ? [filters.tag] : []}
          onChange={(values) => {
            setFilters({ tag: values[0] ?? null });
          }}
        />

        <FilterChip
          label={t('Due')}
          options={dueOptions}
          multiple={false}
          selected={filters.dueRange === 'any' ? [] : [filters.dueRange]}
          onChange={(values) => {
            setFilters({ dueRange: (values[0] as DueRange | undefined) ?? 'any' });
          }}
        />

        {active && (
          <Button
            onClick={() => {
              clearFilters();
              setSearch('');
            }}
          >
            {t('Clear Filters')}
          </Button>
        )}
      </div>

      <TaskViewBody
        view={view}
        tasks={rows}
        statuses={statuses.data?.statuses ?? []}
        isLoading={tasks.isLoading}
        error={tasks.error?.message}
        onRetry={() => {
          void tasks.refetch();
        }}
        onOpen={openTask}
        onToggle={(id, done) => {
          completeTask.mutate({ id, done });
        }}
        onStatusChange={(id, statusId) => {
          updateTask.mutate({ id, statusId });
        }}
        onAddTask={(statusId) => {
          openCapture({
            projectId: filters.project && filters.project !== 'none' ? filters.project : null,
            statusId,
          });
        }}
        emptyMessage={emptyMessage}
        listLabel="All Tasks"
        tableFooter={countLabel}
        sort={tableSort}
        group={tableGroup}
        onSort={toggleTableSort}
        onGroupChange={setTableGroup}
        autoAssign
        viewSwitcher={viewControls}
      />
    </>
  );
}
