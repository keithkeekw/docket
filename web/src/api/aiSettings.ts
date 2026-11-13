import { aiSettingsSchema, type AiProvider, type AiSettings, type UpdateAiSettingsBody } from '@app/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
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

const modelsSchema = z.object({ models: z.array(z.string()) });

/** Fetches the available model IDs from a configured provider. */
export function useProviderModels(provider: AiProvider | '') {
  return useQuery({
    queryKey: ['ai-models', provider],
    queryFn: ({ signal }) =>
      apiGet(`/api/ai/models?provider=${provider}`, modelsSchema, signal).then((d) => d.models),
    enabled: provider !== '',
    staleTime: 5 * 60_000,
    retry: false,
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
