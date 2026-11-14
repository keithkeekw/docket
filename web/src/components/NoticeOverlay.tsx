import { useEffect, useState } from 'react';
import { useT } from '../lib/i18n';
import { useUiStore } from '../store/ui';

const VISIBLE_MS = 8000;

/**
 * Pop-up notice over the page. It closes itself after a few seconds, but
 * hovering or focusing it holds it open so it can always be read.
 */
export function NoticeOverlay() {
  const t = useT();
  const notice = useUiStore((state) => state.notice);
  const clearNotice = useUiStore((state) => state.clearNotice);
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (!notice || held) return;
    const timer = window.setTimeout(clearNotice, VISIBLE_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [notice, held, clearNotice]);

  if (!notice) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex justify-center px-4 sm:bottom-6">
      <div
        key={notice.id}
        role="status"
        aria-live="polite"
        className="pointer-events-auto flex w-full max-w-sm animate-[notice-in_200ms_ease-out] items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-xl motion-reduce:animate-none"
        onMouseEnter={() => {
          setHeld(true);
        }}
        onMouseLeave={() => {
          setHeld(false);
        }}
        onFocus={() => {
          setHeld(true);
        }}
        onBlur={() => {
          setHeld(false);
        }}
      >
        <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="size-4"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z"
              clipRule="evenodd"
            />
          </svg>
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-zinc-900">{notice.title}</p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-zinc-600">{notice.message}</p>
        </div>

        <button
          type="button"
          className="-m-1 inline-flex size-7 shrink-0 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
          aria-label={t('Dismiss')}
          onClick={clearNotice}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="size-4"
            aria-hidden="true"
          >
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
