import { navSummarySchema, type NavSummary } from '@app/shared';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from './client';

/** One key per resource so mutations can invalidate precisely (TECHSTACK §2). */
export const navQueryKey = ['nav'] as const;

/**
 * Sidebar counts and the active project list. A short stale time keeps
 * navigation instant while still refreshing after a mutation elsewhere.
 */
export function useNavSummary() {
  return useQuery<NavSummary>({
    queryKey: navQueryKey,
    queryFn: ({ signal }) => apiGet('/api/nav', navSummarySchema, signal),
    staleTime: 15_000,
  });
}
