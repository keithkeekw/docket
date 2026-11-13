import {
  taskListSchema,
  taskResponseSchema,
  type CreateTaskBody,
  type Task,
  type TaskList,
  type UpdateTaskBody,
} from '@app/shared';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { apiDelete, apiGet, apiMutate } from './client';
import { navQueryKey } from './nav';

/** Server filter for `GET /api/tasks` (TECHSTACK §5). */
export type TaskFilter = {
  /** `none` is the Inbox; any other value is a project id. */
  project?: 'none' | string;
  /** Inclusive local date bound, `YYYY-MM-DD`. */
  dueTo?: string;
  q?: string;
};

const TASKS_KEY = ['tasks'] as const;

function queryString(filter: TaskFilter): string {
  const params = new URLSearchParams();
  if (filter.project) params.set('project', filter.project);
  if (filter.dueTo) params.set('due_to', filter.dueTo);
  if (filter.q) params.set('q', filter.q);

  const search = params.toString();
  return search ? `?${search}` : '';
}

/**
 * The query key is derived from the serialised query string, so two callers
 * that describe the same list share one cache entry.
 */
export function taskFilterKey(filter: TaskFilter) {
  return [...TASKS_KEY, queryString(filter)] as const;
}

export function useTasks(filter: TaskFilter) {
  return useQuery<TaskList>({
    queryKey: taskFilterKey(filter),
    queryFn: ({ signal }) => apiGet(`/api/tasks${queryString(filter)}`, taskListSchema, signal),
  });
}

type TaskSnapshot = [readonly unknown[], TaskList | undefined][];

function snapshotTaskLists(queryClient: QueryClient): TaskSnapshot {
  return queryClient.getQueriesData<TaskList>({ queryKey: TASKS_KEY });
}

function restoreTaskLists(queryClient: QueryClient, snapshot: TaskSnapshot): void {
  for (const [key, data] of snapshot) queryClient.setQueryData(key, data);
}

function patchCachedTask(
  queryClient: QueryClient,
  id: string,
  update: (task: Task) => Task,
): void {
  queryClient.setQueriesData<TaskList>({ queryKey: TASKS_KEY }, (data) =>
    data ? { tasks: data.tasks.map((task) => (task.id === id ? update(task) : task)) } : data,
  );
}

function dropCachedTask(queryClient: QueryClient, id: string): void {
  queryClient.setQueriesData<TaskList>({ queryKey: TASKS_KEY }, (data) =>
    data ? { tasks: data.tasks.filter((task) => task.id !== id) } : data,
  );
}

/** Counts and project progress change with any task write. */
function invalidateTaskData(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: TASKS_KEY });
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

/**
 * Ticking is the most frequent write, so it updates the cached lists first and
 * reverts the snapshot if the request fails (DESIGN §6 "Saving").
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
