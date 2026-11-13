import { statusListSchema, type StatusList } from '@app/shared';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from './client';

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
