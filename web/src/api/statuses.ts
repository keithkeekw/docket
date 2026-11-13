import {
  statusListSchema,
  statusResponseSchema,
  type CreateStatusBody,
  type StatusList,
  type UpdateStatusBody,
} from '@app/shared';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { apiDelete, apiGet, apiMutate } from './client';
import { navQueryKey } from './nav';

export const statusesQueryKey = ['statuses'] as const;

/**
 * Global status set. It changes only in Settings, so it is cached for the
 * session and refetched after a settings write.
 */
export function useStatuses() {
  return useQuery<StatusList>({
    queryKey: statusesQueryKey,
    queryFn: ({ signal }) => apiGet('/api/statuses', statusListSchema, signal),
    staleTime: Infinity,
  });
}

/**
 * Statuses drive the Kanban columns, the drawer picker and what "done" means,
 * so a write refreshes lists, counts and project progress too.
 */
function invalidateStatusData(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: statusesQueryKey });
  void queryClient.invalidateQueries({ queryKey: ['tasks'] });
  void queryClient.invalidateQueries({ queryKey: ['task'] });
  void queryClient.invalidateQueries({ queryKey: ['projects'] });
  void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  void queryClient.invalidateQueries({ queryKey: navQueryKey });
}

export function useCreateStatus() {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, CreateStatusBody>({
    mutationFn: async (body) => apiMutate('/api/statuses', 'POST', body, statusResponseSchema),
    onSuccess: () => {
      invalidateStatusData(queryClient);
    },
  });
}

export function useUpdateStatus() {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, { id: string } & UpdateStatusBody>({
    mutationFn: async ({ id, ...body }) =>
      apiMutate(`/api/statuses/${id}`, 'PATCH', body, statusResponseSchema),
    onSuccess: () => {
      invalidateStatusData(queryClient);
    },
  });
}

export function useDeleteStatus() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { id: string }>({
    mutationFn: async ({ id }) => apiDelete(`/api/statuses/${id}`),
    onSuccess: () => {
      invalidateStatusData(queryClient);
    },
  });
}
