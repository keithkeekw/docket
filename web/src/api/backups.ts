import {
  backupListSchema,
  backupResponseSchema,
  restoreResponseSchema,
  type BackupEntry,
  type BackupList,
} from '@app/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiMutate } from './client';

export const backupsQueryKey = ['backups'] as const;

export function useBackups() {
  return useQuery<BackupList>({
    queryKey: backupsQueryKey,
    queryFn: ({ signal }) => apiGet('/api/backups', backupListSchema, signal),
  });
}

export function useCreateBackup() {
  const queryClient = useQueryClient();

  return useMutation<{ backup: BackupEntry }, Error, void>({
    mutationFn: async () => apiMutate('/api/backup', 'POST', {}, backupResponseSchema),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: backupsQueryKey });
    },
  });
}

export type RestoreResult = { restored: string; safetyBackup: BackupEntry };

export function useRestoreBackup() {
  const queryClient = useQueryClient();

  return useMutation<RestoreResult, Error, { file: string }>({
    mutationFn: async ({ file }) =>
      apiMutate('/api/restore', 'POST', { file }, restoreResponseSchema),
    onSuccess: async () => {
      // Every list, count and project now comes from different rows.
      await queryClient.resetQueries();
      void queryClient.invalidateQueries({ queryKey: backupsQueryKey });
    },
  });
}
