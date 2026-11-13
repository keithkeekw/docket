import { cx } from '../lib/cx';
import { useT } from '../lib/i18n';
import { PrelineTooltip } from './PrelineTooltip';

/**
 * The quick-capture action shown beside the view switcher on task screens.
 * It opens the capture dialog with the page's project/status context.
 */
export function QuickCaptureButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  const t = useT();
  const label = t('Quick Capture');

  return (
    <PrelineTooltip label={label}>
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className={cx(
          'inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900',
          className,
        )}
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
            d="M10 3a.75.75 0 0 1 .75.75v5.5h5.5a.75.75 0 0 1 0 1.5h-5.5v5.5a.75.75 0 0 1-1.5 0v-5.5h-5.5a.75.75 0 0 1 0-1.5h5.5v-5.5A.75.75 0 0 1 10 3Z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </PrelineTooltip>
  );
}
