import {
  aiChatResponseSchema,
  type AiChatResponse,
  type ChatMessage,
} from '@app/shared';
import { useMutation } from '@tanstack/react-query';
import { apiMutate } from './client';

/**
 * One assistant turn (FR-22). The server runs read-only tools and returns an
 * optional pending proposal, which the caller hands to the preview modal.
 */
export function useChat() {
  return useMutation<AiChatResponse, Error, { messages: ChatMessage[] }>({
    mutationFn: async ({ messages }) =>
      apiMutate('/api/ai/chat', 'POST', { messages }, aiChatResponseSchema),
  });
}
