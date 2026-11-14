import { useT } from '../lib/i18n';
import { useUiStore } from '../store/ui';
import { PrelineTooltip } from './PrelineTooltip';

/** Floating Ask Assistant control, pinned bottom-right above the mobile tab bar. */
export function AssistantFab() {
  const t = useT();
  const openChat = useUiStore((state) => state.openChat);

  return (
    <PrelineTooltip label={t('Ask Assistant')} className="contents!">
      <button
        type="button"
        onClick={openChat}
        aria-label={t('Ask Assistant')}
        className="fixed right-5 bottom-20 z-30 inline-flex size-11 items-center justify-center rounded-full bg-zinc-900 text-white shadow-lg transition-colors hover:bg-zinc-700 sm:bottom-6"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="size-5"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M10 2c-4.418 0-8 3.134-8 7 0 1.979.94 3.765 2.45 5.053-.14.755-.51 1.664-1.194 2.366a.75.75 0 0 0 .59 1.266c1.492-.06 2.73-.55 3.61-1.11A9.36 9.36 0 0 0 10 16c4.418 0 8-3.134 8-7s-3.582-7-8-7Zm-3 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm3 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm3 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </PrelineTooltip>
  );
}
