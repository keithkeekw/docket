import {
  updateApplyResponseSchema,
  updateInfoSchema,
  updateStatusSchema,
  type UpdateApplyResponse,
  type UpdateInfo,
  type UpdateStatus,
} from '@app/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiMutate } from './client';

export const updatesQueryKey = ['updates'] as const;
export const updateStatusQueryKey = ['updates', 'status'] as const;

export function useUpdateInfo() {
  return useQuery<UpdateInfo>({
    queryKey: updatesQueryKey,
    queryFn: ({ signal }) => apiGet('/api/updates', updateInfoSchema, signal),
    staleTime: 5 * 60_000,
    retry: 1,
  });
}

export function useCheckUpdates() {
  const queryClient = useQueryClient();

  return useMutation<UpdateInfo, Error, void>({
    mutationFn: () => apiGet('/api/updates?refresh=1', updateInfoSchema),
    onSuccess: (info) => {
      queryClient.setQueryData(updatesQueryKey, info);
    },
  });
}

export function useApplyUpdate() {
  return useMutation<UpdateApplyResponse, Error, { tag: string }>({
    mutationFn: ({ tag }) =>
      apiMutate('/api/updates/apply', 'POST', { tag }, updateApplyResponseSchema),
  });
}

export function useUpdateStatus(enabled: boolean) {
  return useQuery<UpdateStatus>({
    queryKey: updateStatusQueryKey,
    queryFn: ({ signal }) => apiGet('/api/updates/status', updateStatusSchema, signal),
    enabled,
    refetchInterval: enabled ? 2000 : false,
    retry: false,
  });
}
