import {
  aiSettingsSchema,
  promptListSchema,
  promptResponseSchema,
  type AiProvider,
  type AiSettings,
  type PromptEntry,
  type PromptList,
  type UpdateAiSettingsBody,
} from '@app/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiDeleteJson, apiGet, apiMutate } from './client';

export const aiSettingsQueryKey = ['ai-settings'] as const;
export const promptsQueryKey = ['prompts'] as const;

/** The server's system prompts, editable in Settings → Prompt Management. */
export function usePrompts() {
  return useQuery<PromptList>({
    queryKey: promptsQueryKey,
    queryFn: ({ signal }) => apiGet('/api/settings/prompts', promptListSchema, signal),
  });
}

function replacePrompt(list: PromptList | undefined, prompt: PromptEntry): PromptList | undefined {
  if (!list) return list;
  return {
    prompts: list.prompts.map((entry) => (entry.id === prompt.id ? prompt : entry)),
  };
}

export function useSavePrompt() {
  const queryClient = useQueryClient();

  return useMutation<PromptEntry, Error, { id: string; content: string }>({
    mutationFn: async ({ id, content }) =>
      (await apiMutate(`/api/settings/prompts/${id}`, 'PUT', { content }, promptResponseSchema))
        .prompt,
    onSuccess: (prompt) => {
      queryClient.setQueryData<PromptList>(promptsQueryKey, (list) =>
        replacePrompt(list, prompt),
      );
    },
  });
}

export function useResetPrompt() {
  const queryClient = useQueryClient();

  return useMutation<PromptEntry, Error, { id: string }>({
    mutationFn: async ({ id }) =>
      (await apiDeleteJson(`/api/settings/prompts/${id}`, promptResponseSchema)).prompt,
    onSuccess: (prompt) => {
      queryClient.setQueryData<PromptList>(promptsQueryKey, (list) =>
        replacePrompt(list, prompt),
      );
    },
  });
}

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

/** Write-only: the response carries presence and a 4-character hint, never the key. */
export function useSaveProviderKey() {
  const queryClient = useQueryClient();

  return useMutation<AiSettings, Error, { provider: AiProvider; apiKey: string }>({
    mutationFn: async ({ provider, apiKey }) =>
      apiMutate(`/api/settings/ai/keys/${provider}`, 'PUT', { apiKey }, aiSettingsSchema),
    onSuccess: (settings, { provider }) => {
      queryClient.setQueryData(aiSettingsQueryKey, settings);
      void queryClient.invalidateQueries({ queryKey: ['ai-models', provider] });
    },
  });
}

export function useRemoveProviderKey() {
  const queryClient = useQueryClient();

  return useMutation<AiSettings, Error, { provider: AiProvider }>({
    mutationFn: async ({ provider }) =>
      apiDeleteJson(`/api/settings/ai/keys/${provider}`, aiSettingsSchema),
    onSuccess: (settings, { provider }) => {
      queryClient.setQueryData(aiSettingsQueryKey, settings);
      void queryClient.invalidateQueries({ queryKey: ['ai-models', provider] });
    },
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
