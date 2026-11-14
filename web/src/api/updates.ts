import {
  updateApplyResponseSchema,
  updateInfoSchema,
  type UpdateApplyResponse,
  type UpdateInfo,
} from '@app/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiMutate } from './client';

export const updatesQueryKey = ['updates'] as const;

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
