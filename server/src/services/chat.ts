import type { ChatMessage, Proposal } from '@app/shared';
import {
  makeCompletion,
  makeToolChat,
  type Completion,
  type ToolChat,
  type ToolChatMessage,
} from '../ai/client';
import { CHAT_TOOLS, chatContextSummary, runChatTool } from '../ai/chat-tools';
import { loadPrompt } from '../ai/prompts';
import type { Db } from '../db/types';
import { localDateString, localWeekday } from '../lib/dates';
import { ServiceError } from '../lib/errors';

const MAX_ROUNDS = 4;

export type ChatResult = { reply: string; proposal: Proposal | null };
export type ChatOptions = { toolChat?: ToolChat; complete?: Completion };

/**
 * One assistant turn (FR-22). The model drives read-only tools; if the provider
 * rejects tool calling, one summary-based attempt runs instead (TECHSTACK §6.4).
 * A `propose_tasks` call becomes a pending proposal — nothing is written (FR-23).
 */
export async function chat(
  db: Db,
  messages: ChatMessage[],
  options: ChatOptions = {},
): Promise<ChatResult> {
  const now = new Date();
  const system = `${loadPrompt(db, 'chat')}\n\nToday is ${localDateString(now)} (${localWeekday(now)}).`;
  let proposal: Proposal | null = null;

  try {
    const toolChat = options.toolChat ?? makeToolChat(db);
    const conversation: ToolChatMessage[] = [
      { role: 'system', content: system },
      ...messages.map((message) => ({ role: message.role, content: message.content })),
    ];

    for (let round = 0; round < MAX_ROUNDS; round += 1) {
      const step = await toolChat({ feature: 'chat', messages: conversation, tools: CHAT_TOOLS });

      if (step.toolCalls.length === 0) {
        return {
          reply: step.text.trim() || 'I could not find an answer to that.',
          proposal,
        };
      }

      conversation.push({
        role: 'assistant',
        content: step.text,
        tool_calls: step.toolCalls.map((call) => ({
          id: call.id,
          type: 'function',
          function: { name: call.name, arguments: call.arguments },
        })),
      });

      for (const call of step.toolCalls) {
        const result = runChatTool(db, call.name, call.arguments);
        if (result.proposal) proposal = result.proposal;

        conversation.push({
          role: 'tool',
          tool_call_id: call.id,
          content: result.content,
        });
      }
    }

    return {
      reply:
        'I stopped after several lookups without reaching an answer. Try asking more narrowly.',
      proposal,
    };
  } catch (cause) {
    // A missing key/model must surface as-is; anything else is worth one
    // summary-based attempt for models without tool calling.
    if (cause instanceof ServiceError && cause.status === 503) throw cause;

    return fallback(db, messages, system, options);
  }
}

async function fallback(
  db: Db,
  messages: ChatMessage[],
  system: string,
  options: ChatOptions,
): Promise<ChatResult> {
  const complete = options.complete ?? makeCompletion(db);
  const context = chatContextSummary(db);

  const transcript = messages
    .map((message) => `${message.role === 'user' ? 'User' : 'Assistant'}: ${message.content}`)
    .join('\n');

  const { text } = await complete({
    feature: 'chat',
    system: `${system}\n\nYou cannot call tools in this mode. Answer from this data only. You cannot propose new tasks here.\n\nData:\n${JSON.stringify(context, null, 2)}`,
    user: transcript,
  });

  const reply = text.trim();
  if (!reply) throw new ServiceError('The model returned an empty answer.', 502);

  return { reply, proposal: null };
}
