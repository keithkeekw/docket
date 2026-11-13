import { dashboardSchema, type Dashboard } from '@app/shared';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from './client';

export const dashboardQueryKey = ['dashboard'] as const;

/**
 * DESIGN §5.1 data. Short stale time so returning home after a change shows the
 * current groups; task writes invalidate it explicitly.
 */
export function useDashboard() {
  return useQuery<Dashboard>({
    queryKey: dashboardQueryKey,
    queryFn: ({ signal }) => apiGet('/api/dashboard', dashboardSchema, signal),
    staleTime: 15_000,
  });
}
