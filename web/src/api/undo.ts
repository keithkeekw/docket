import { undoResponseSchema } from '@app/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiMutate } from './client';

/**
 * FR-29: one slot on the server. Undoing restores the last deleted task,
 * project or milestone, so every list is refreshed afterwards.
 */
export function useUndo() {
  const queryClient = useQueryClient();

  return useMutation<{ label: string | null }, Error, void>({
    mutationFn: async () => apiMutate('/api/undo', 'POST', {}, undoResponseSchema),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
      void queryClient.invalidateQueries({ queryKey: ['task'] });
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
      void queryClient.invalidateQueries({ queryKey: ['milestones'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['nav'] });
    },
  });
}
