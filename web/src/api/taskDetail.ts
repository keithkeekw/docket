import {
  aiChecklistResponseSchema,
  checklistItemResponseSchema,
  tagListSchema,
  taskDetailResponseSchema,
  taskLinkResponseSchema,
  taskTagsResponseSchema,
  type AiChecklistResponse,
  type ChecklistItem,
  type CreateChecklistItemBody,
  type CreateTaskLinkBody,
  type TagList,
  type TaskDetail,
  type TaskLink,
  type UpdateChecklistItemBody,
} from '@app/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiDelete, apiGet, apiMutate } from './client';
import { navQueryKey } from './nav';

/**
 * Detail keys are singular (`['task', id]`) so the list cache patching in
 * `api/tasks.ts` never has to guess the shape it is holding.
 */
export const taskDetailQueryKey = (id: string) => ['task', id] as const;
export const tagsQueryKey = ['tags'] as const;

export function useTaskDetail(id: string | null) {
  return useQuery<TaskDetail>({
    queryKey: taskDetailQueryKey(id ?? ''),
    queryFn: async ({ signal }) =>
      (await apiGet(`/api/tasks/${id}`, taskDetailResponseSchema, signal)).task,
    enabled: Boolean(id),
  });
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
) {
  const queryClient = useQueryClient();

  return useMutation<TData, Error, TVariables>({
    mutationFn,
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

export function useUpdateChecklistItem(taskId: string) {
  return useTaskPartMutation<ChecklistItem, { id: string } & UpdateChecklistItemBody>(
    taskId,
    async ({ id, ...body }) =>
      (await apiMutate(`/api/checklist/${id}`, 'PATCH', body, checklistItemResponseSchema)).item,
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

export function useGenerateChecklist(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation<AiChecklistResponse, Error>({
    mutationFn: () =>
      apiMutate('/api/ai/checklist', 'POST', { taskId }, aiChecklistResponseSchema),
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
