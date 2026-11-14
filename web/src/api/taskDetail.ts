import {
  aiChecklistResponseSchema,
  checklistItemResponseSchema,
  tagListSchema,
  taskAttachmentResponseSchema,
  taskDetailResponseSchema,
  taskLinkResponseSchema,
  taskTagsResponseSchema,
  type AiChecklistResponse,
  type ChecklistItem,
  type CreateChecklistItemBody,
  type CreateTaskLinkBody,
  type TagList,
  type TaskAttachment,
  type TaskDetail,
  type TaskLink,
  type UpdateChecklistItemBody,
} from '@app/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { apiDelete, apiGet, apiMutate, apiUpload } from './client';
import { navQueryKey } from './nav';

/**
 * Detail keys are singular (`['task', id]`) so the list cache patching in
 * `api/tasks.ts` never has to guess the shape it is holding.
 */
export const taskDetailQueryKey = (id: string) => ['task', id] as const;
export const tagsQueryKey = ['tags'] as const;

async function fetchTaskDetail(id: string, signal?: AbortSignal): Promise<TaskDetail> {
  return (await apiGet(`/api/tasks/${id}`, taskDetailResponseSchema, signal)).task;
}

export function useTaskDetail(id: string | null) {
  return useQuery<TaskDetail>({
    queryKey: taskDetailQueryKey(id ?? ''),
    queryFn: ({ signal }) => fetchTaskDetail(id ?? '', signal),
    enabled: Boolean(id),
  });
}

const HOVER_INTENT_MS = 80;

/**
 * Pointing at (or tabbing to) any `[data-task-id]` element fetches that task's
 * detail, so the drawer usually opens with its data already cached. The short
 * delay skips rows the pointer only passes over.
 */
export function useTaskDetailPrefetch(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let pendingId: string | null = null;

    function handle(event: Event) {
      const id =
        event.target instanceof Element
          ? (event.target.closest<HTMLElement>('[data-task-id]')?.dataset.taskId ?? null)
          : null;
      if (id === pendingId) return;
      clearTimeout(timer);
      pendingId = id;
      if (!id) return;
      timer = setTimeout(() => {
        void queryClient.prefetchQuery({
          queryKey: taskDetailQueryKey(id),
          queryFn: ({ signal }) => fetchTaskDetail(id, signal),
        });
      }, HOVER_INTENT_MS);
    }

    document.addEventListener('pointerover', handle);
    document.addEventListener('focusin', handle);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('pointerover', handle);
      document.removeEventListener('focusin', handle);
    };
  }, [queryClient]);
}

export function useTags() {
  return useQuery<TagList>({
    queryKey: tagsQueryKey,
    queryFn: ({ signal }) => apiGet('/api/tags', tagListSchema, signal),
    staleTime: 30_000,
  });
}

/**
 * Checklist, link and tag writes change the row badges too, so both the detail
 * and every task list are invalidated.
 */
function useTaskPartMutation<TData, TVariables>(
  taskId: string,
  mutationFn: (variables: TVariables) => Promise<TData>,
  optimistic?: (detail: TaskDetail, variables: TVariables) => TaskDetail,
) {
  const queryClient = useQueryClient();
  const detailKey = taskDetailQueryKey(taskId);

  return useMutation<TData, Error, TVariables, { previous: TaskDetail | undefined }>({
    mutationFn,
    onMutate: async (variables) => {
      if (!optimistic) return { previous: undefined };
      await queryClient.cancelQueries({ queryKey: detailKey });
      const previous = queryClient.getQueryData<TaskDetail>(detailKey);
      if (previous) queryClient.setQueryData(detailKey, optimistic(previous, variables));
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(detailKey, context.previous);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: taskDetailQueryKey(taskId) });
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
      void queryClient.invalidateQueries({ queryKey: navQueryKey });
      void queryClient.invalidateQueries({ queryKey: tagsQueryKey });
    },
  });
}

export function useAddChecklistItem(taskId: string) {
  return useTaskPartMutation<ChecklistItem, CreateChecklistItemBody>(
    taskId,
    async (body) =>
      (await apiMutate(`/api/tasks/${taskId}/checklist`, 'POST', body, checklistItemResponseSchema))
        .item,
  );
}

/** Ticks show in the drawer immediately; a failed save puts the box back. */
export function useUpdateChecklistItem(taskId: string) {
  return useTaskPartMutation<ChecklistItem, { id: string } & UpdateChecklistItemBody>(
    taskId,
    async ({ id, ...body }) =>
      (await apiMutate(`/api/checklist/${id}`, 'PATCH', body, checklistItemResponseSchema)).item,
    (detail, { id, ...body }) => {
      const checklistItems = detail.checklistItems.map((item) =>
        item.id === id ? { ...item, ...body } : item,
      );
      return {
        ...detail,
        checklistItems,
        checklist: {
          done: checklistItems.filter((item) => item.done).length,
          total: checklistItems.length,
        },
      };
    },
  );
}

export function useDeleteChecklistItem(taskId: string) {
  return useTaskPartMutation<void, { id: string }>(taskId, async ({ id }) =>
    apiDelete(`/api/checklist/${id}`),
  );
}

export function useAddLink(taskId: string) {
  return useTaskPartMutation<TaskLink, CreateTaskLinkBody>(
    taskId,
    async (body) =>
      (await apiMutate(`/api/tasks/${taskId}/links`, 'POST', body, taskLinkResponseSchema)).link,
  );
}

export function useDeleteLink(taskId: string) {
  return useTaskPartMutation<void, { id: string }>(taskId, async ({ id }) =>
    apiDelete(`/api/links/${id}`),
  );
}

export function useAddAttachment(taskId: string) {
  return useTaskPartMutation<TaskAttachment, File>(
    taskId,
    async (file) =>
      (await apiUpload(`/api/tasks/${taskId}/attachments`, file, taskAttachmentResponseSchema))
        .attachment,
  );
}

export function useDeleteAttachment(taskId: string) {
  return useTaskPartMutation<void, { id: string }>(taskId, async ({ id }) =>
    apiDelete(`/api/attachments/${id}`),
  );
}

export function useGenerateChecklist(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation<AiChecklistResponse, Error>({
    mutationFn: () => apiMutate('/api/ai/checklist', 'POST', { taskId }, aiChecklistResponseSchema),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: taskDetailQueryKey(taskId) });
    },
  });
}

export function useSetTaskTags(taskId: string) {
  return useTaskPartMutation<string[], { tags: string[] }>(
    taskId,
    async (body) =>
      (await apiMutate(`/api/tasks/${taskId}/tags`, 'PUT', body, taskTagsResponseSchema)).tags,
  );
}
