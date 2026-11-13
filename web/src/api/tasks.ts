import {
  bulkDeleteTasksResponseSchema,
  reorderTasksResponseSchema,
  taskListSchema,
  taskResponseSchema,
  type BulkDeleteTasksBody,
  type CreateTaskBody,
  type ReorderTasksBody,
  type Task,
  type TaskList,
  type UpdateTaskBody,
} from '@app/shared';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { taskFilterQuery, type TaskFilter } from '../lib/taskFilters';
import { apiDelete, apiGet, apiMutate } from './client';
import { navQueryKey } from './nav';

export type { TaskFilter };

const TASKS_KEY = ['tasks'] as const;

const queryString = taskFilterQuery;

/**
 * The query key is derived from the serialised query string, so two callers
 * that describe the same list share one cache entry.
 */
export function taskFilterKey(filter: TaskFilter) {
  return [...TASKS_KEY, queryString(filter)] as const;
}

export function useTasks(filter: TaskFilter, enabled = true) {
  return useQuery<TaskList>({
    queryKey: taskFilterKey(filter),
    queryFn: ({ signal }) => apiGet(`/api/tasks${queryString(filter)}`, taskListSchema, signal),
    enabled,
  });
}

type TaskSnapshot = [readonly unknown[], TaskList | undefined][];

function snapshotTaskLists(queryClient: QueryClient): TaskSnapshot {
  return queryClient.getQueriesData<TaskList>({ queryKey: TASKS_KEY });
}

function restoreTaskLists(queryClient: QueryClient, snapshot: TaskSnapshot): void {
  for (const [key, data] of snapshot) queryClient.setQueryData(key, data);
}

function patchCachedTask(queryClient: QueryClient, id: string, update: (task: Task) => Task): void {
  queryClient.setQueriesData<TaskList>({ queryKey: TASKS_KEY }, (data) =>
    data ? { tasks: data.tasks.map((task) => (task.id === id ? update(task) : task)) } : data,
  );
}

function dropCachedTask(queryClient: QueryClient, id: string): void {
  queryClient.setQueriesData<TaskList>({ queryKey: TASKS_KEY }, (data) =>
    data ? { tasks: data.tasks.filter((task) => task.id !== id) } : data,
  );
}

function dropCachedTasks(queryClient: QueryClient, ids: Set<string>): void {
  queryClient.setQueriesData<TaskList>({ queryKey: TASKS_KEY }, (data) =>
    data ? { tasks: data.tasks.filter((task) => !ids.has(task.id)) } : data,
  );
}

/** Counts and project progress change with any task write. */
function invalidateTaskData(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: TASKS_KEY });
  // The open drawer reads `['task', id]`; keep it in step with the lists.
  void queryClient.invalidateQueries({ queryKey: ['task'] });
  void queryClient.invalidateQueries({ queryKey: ['projects'] });
  // Milestone pills show task counts, so moving or completing one changes them.
  void queryClient.invalidateQueries({ queryKey: ['milestones'] });
  void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  void queryClient.invalidateQueries({ queryKey: navQueryKey });
}

/** Plain capture (FR-1): a title is enough; everything else defaults. */
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation<Task, Error, CreateTaskBody>({
    mutationFn: async (body) =>
      (await apiMutate('/api/tasks', 'POST', body, taskResponseSchema)).task,
    onSuccess: () => {
      invalidateTaskData(queryClient);
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation<Task, Error, { id: string } & UpdateTaskBody>({
    mutationFn: async ({ id, ...body }) =>
      (await apiMutate(`/api/tasks/${id}`, 'PATCH', body, taskResponseSchema)).task,
    onSuccess: (task) => {
      patchCachedTask(queryClient, task.id, () => task);
      invalidateTaskData(queryClient);
    },
  });
}

/** Rows fade for this long before the completed task leaves the open lists. */
export const COMPLETE_FADE_MS = 3000;

/** Pending removals, so re-checking a task within the fade cancels its timer. */
const completionTimers = new Map<string, ReturnType<typeof setTimeout>>();

function cancelCompletionTimer(id: string): void {
  const timer = completionTimers.get(id);
  if (timer) clearTimeout(timer);
  completionTimers.delete(id);
}

/**
 * Ticking updates the cached lists first and reverts the snapshot on failure
 * (DESIGN §6 "Saving"). Completed rows deliberately stay in those caches for
 * COMPLETE_FADE_MS so the UI can fade them out before the open-list refetch
 * removes them; unchecking during that window cancels the removal.
 */
export function useCompleteTask() {
  const queryClient = useQueryClient();

  return useMutation<Task, Error, { id: string; done: boolean }, { snapshot: TaskSnapshot }>({
    mutationFn: async ({ id, done }) =>
      (await apiMutate(`/api/tasks/${id}/complete`, 'POST', { done }, taskResponseSchema)).task,
    onMutate: async ({ id, done }) => {
      await queryClient.cancelQueries({ queryKey: TASKS_KEY });
      const snapshot = snapshotTaskLists(queryClient);
      const now = new Date().toISOString();

      patchCachedTask(queryClient, id, (task) => ({
        ...task,
        statusCategory: done ? 'done' : 'open',
        completedAt: done ? (task.completedAt ?? now) : null,
      }));

      return { snapshot };
    },
    onError: (_error, _variables, context) => {
      if (context) restoreTaskLists(queryClient, context.snapshot);
    },
    onSuccess: (task) => {
      patchCachedTask(queryClient, task.id, () => task);
      cancelCompletionTimer(task.id);

      if (task.completedAt) {
        completionTimers.set(
          task.id,
          setTimeout(() => {
            completionTimers.delete(task.id);
            dropCachedTask(queryClient, task.id);
            invalidateTaskData(queryClient);
          }, COMPLETE_FADE_MS),
        );
        return;
      }

      invalidateTaskData(queryClient);
    },
  });
}

/** List View drag order: positions become 0..n-1 in the submitted order. */
export function useReorderTasks() {
  const queryClient = useQueryClient();

  return useMutation<{ reordered: number }, Error, ReorderTasksBody>({
    mutationFn: async (body) =>
      apiMutate('/api/tasks/reorder', 'POST', body, reorderTasksResponseSchema),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TASKS_KEY });
    },
  });
}

export function useBulkDeleteTasks() {
  const queryClient = useQueryClient();

  return useMutation<
    { deleted: number },
    Error,
    BulkDeleteTasksBody,
    { snapshot: TaskSnapshot }
  >({
    mutationFn: async (body) =>
      apiMutate('/api/tasks/bulk-delete', 'POST', body, bulkDeleteTasksResponseSchema),
    onMutate: async ({ ids }) => {
      await queryClient.cancelQueries({ queryKey: TASKS_KEY });
      const snapshot = snapshotTaskLists(queryClient);
      dropCachedTasks(queryClient, new Set(ids));
      return { snapshot };
    },
    onError: (_error, _variables, context) => {
      if (context) restoreTaskLists(queryClient, context.snapshot);
    },
    onSuccess: () => {
      invalidateTaskData(queryClient);
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { id: string }, { snapshot: TaskSnapshot }>({
    mutationFn: async ({ id }) => apiDelete(`/api/tasks/${id}`),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: TASKS_KEY });
      const snapshot = snapshotTaskLists(queryClient);
      dropCachedTask(queryClient, id);
      return { snapshot };
    },
    onError: (_error, _variables, context) => {
      if (context) restoreTaskLists(queryClient, context.snapshot);
    },
    onSuccess: () => {
      invalidateTaskData(queryClient);
    },
  });
}
