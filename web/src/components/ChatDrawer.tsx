import type { ChatMessage } from '@app/shared';
import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import { Link } from 'react-router';
import { ApiError } from '../api/client';
import { useChat } from '../api/chat';
import { cx } from '../lib/cx';
import { useT } from '../lib/i18n';
import { compactMarkdownClass } from '../lib/markdown';
import { useUiStore } from '../store/ui';
import { Button } from './Button';
import { InlineError } from './InlineError';

/**
 * DESIGN §5.5 Chat: a 420 px right drawer, messages as text blocks (assistant
 * on white, user on `zinc-100`), input at the bottom. Assistant replies are
 * rendered as markdown so bullets, emphasis and code stay readable. Any
 * proposed change opens the same preview modal (FR-23).
 */
export function ChatDrawer() {
  const t = useT();
  const isOpen = useUiStore((state) => state.chatOpen);
  const closeChat = useUiStore((state) => state.closeChat);
  const openProposal = useUiStore((state) => state.openProposal);

  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [needsSettings, setNeedsSettings] = useState(false);

  const chat = useChat();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, chat.isPending]);

  async function send(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    const text = draft.trim();
    if (!text || chat.isPending) return;

    const next: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setDraft('');
    setError(null);

    try {
      const response = await chat.mutateAsync({ messages: next });
      setMessages([...next, { role: 'assistant', content: response.reply }]);
      if (response.proposal) openProposal(response.proposal);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('Could not reach the assistant'));
      setNeedsSettings(cause instanceof ApiError && cause.status === 503);
    }
  }

  function handleBackdrop(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) closeChat();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="chat-title"
      className="fixed inset-y-0 right-0 left-auto m-0 h-full max-h-none w-[420px] max-w-[calc(100vw-2rem)] rounded-none border-0 border-l border-zinc-200 bg-white p-0 shadow-2xl backdrop:bg-zinc-900/50"
      onClick={handleBackdrop}
      onCancel={(event) => {
        event.preventDefault();
        closeChat();
      }}
      onClose={() => {
        if (isOpen) closeChat();
      }}
    >
      <div className="flex h-full flex-col">
        <header className="flex items-start justify-between gap-3 border-b border-zinc-200 px-5 py-4">
          <div className="min-w-0">
            <h2 id="chat-title" className="text-[15px] font-semibold text-zinc-900">
              {t('Assistant')}
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              {t('Answers from your tasks, projects and reviews.')}
            </p>
          </div>
          <Button onClick={closeChat}>{t('Close')}</Button>
        </header>

        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          {messages.length === 0 && (
            <p className="text-sm text-zinc-500">
              {t(
                'Ask things like “what is overdue?”, “how is Onboarding going?” or “add a task to follow up with the vendor on Friday”.',
              )}
            </p>
          )}

          <ul className="flex flex-col gap-3">
            {messages.map((message, index) => (
              <li
                key={`${message.role}-${index}`}
                className={cx(
                  'max-w-[92%] rounded-xl px-3 py-2 text-sm break-words',
                  message.role === 'user'
                    ? 'ml-auto whitespace-pre-wrap bg-zinc-100 text-zinc-900'
                    : `bg-white text-zinc-700 ${compactMarkdownClass}`,
                )}
              >
                {message.role === 'assistant' ? (
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                ) : (
                  message.content
                )}
              </li>
            ))}

            {chat.isPending && <li className="text-sm text-zinc-500">{t('Thinking…')}</li>}
          </ul>

          {error &&
            (needsSettings ? (
              <p className="mt-3 rounded-lg bg-zinc-50 px-3 py-2.5 text-xs text-zinc-700">
                {error}{' '}
                <Link to="/settings" className="text-blue-600 hover:underline" onClick={closeChat}>
                  {t('Open Settings')}
                </Link>
              </p>
            ) : (
              <InlineError message={error} />
            ))}
        </div>

        <form className="border-t border-zinc-200 px-5 py-3" onSubmit={send}>
          <label htmlFor="chat-input" className="text-[11px] text-zinc-500">
            {t('Message')}
          </label>
          <div className="mt-1 flex items-end gap-2">
            <textarea
              id="chat-input"
              rows={2}
              className="min-h-10 flex-1 resize-none rounded-[10px] border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500"
              placeholder={t('Ask the assistant…')}
              value={draft}
              disabled={chat.isPending}
              onChange={(event) => {
                setDraft(event.target.value);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void send();
                }
              }}
            />
            <Button type="submit" variant="primary" disabled={!draft.trim() || chat.isPending}>
              {chat.isPending ? t('Thinking…') : t('Send')}
            </Button>
          </div>
          <p className="mt-1 text-[11px] text-zinc-500">
            {t('Enter to send · Shift Enter for a new line')}
          </p>
        </form>
      </div>
    </dialog>
  );
}
