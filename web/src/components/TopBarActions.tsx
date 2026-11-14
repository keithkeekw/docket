import { Link } from 'react-router';
import { useT } from '../lib/i18n';
import { LanguageToggle } from './LanguageToggle';
import { PrelineTooltip } from './PrelineTooltip';
import { ThemeToggle } from './ThemeToggle';

/**
 * Global top-right controls: language and theme. They float from `sm` up; on
 * phones they sit in a row above the page so content keeps the full width, and
 * carry the User Guide link that the sidebar holds on larger screens.
 */
export function TopBarActions() {
  const t = useT();

  return (
    <div className="z-30 flex items-center justify-end gap-1.5 px-4 pt-3 sm:fixed sm:top-2 sm:right-2 sm:p-0">
      <PrelineTooltip label={t('User Guide')} className="sm:hidden!">
        <Link
          to="/guide"
          aria-label={t('User Guide')}
          className="inline-flex size-8 items-center justify-center rounded-full border border-zinc-200 bg-white/90 text-zinc-600 shadow-sm backdrop-blur transition-colors hover:bg-zinc-50 hover:text-zinc-900"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="size-4"
            aria-hidden="true"
          >
            <path d="M10.75 16.82A7.462 7.462 0 0 1 15 15.5c.71 0 1.396.098 2.046.282A.75.75 0 0 0 18 15.06v-11a.75.75 0 0 0-.546-.721A9.006 9.006 0 0 0 15 3a8.963 8.963 0 0 0-4.25 1.065V16.82ZM9.25 4.065A8.963 8.963 0 0 0 5 3c-.85 0-1.673.118-2.454.339A.75.75 0 0 0 2 4.06v11a.75.75 0 0 0 .954.721A7.506 7.506 0 0 1 5 15.5c1.579 0 3.042.487 4.25 1.32V4.065Z" />
          </svg>
        </Link>
      </PrelineTooltip>
      <LanguageToggle />
      <ThemeToggle />
    </div>
  );
}
