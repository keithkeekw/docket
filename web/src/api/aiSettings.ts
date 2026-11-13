import { aiSettingsSchema, type AiSettings, type UpdateAiSettingsBody } from '@app/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiMutate } from './client';

export const aiSettingsQueryKey = ['ai-settings'] as const;

/** Which features have a provider/model, and which providers have a key (FR-24/26). */
export function useAiSettings() {
  return useQuery<AiSettings>({
    queryKey: aiSettingsQueryKey,
    queryFn: ({ signal }) => apiGet('/api/settings/ai', aiSettingsSchema, signal),
    staleTime: 30_000,
  });
}

export function useUpdateAiSettings() {
  const queryClient = useQueryClient();

  return useMutation<AiSettings, Error, UpdateAiSettingsBody>({
    mutationFn: async (body) => apiMutate('/api/settings/ai', 'PUT', body, aiSettingsSchema),
    onSuccess: (settings) => {
      queryClient.setQueryData(aiSettingsQueryKey, settings);
    },
  });
}
