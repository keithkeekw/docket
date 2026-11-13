import { useEffect, useState } from 'react';
import { useT } from '../lib/i18n';
import { cx } from '../lib/cx';
import { PrelineTooltip } from './PrelineTooltip';

/**
 * Floating return-to-top control. It appears once the page has scrolled past
 * the first screen and sits above the mobile tab bar.
 */
export function ScrollToTopButton() {
  const t = useT();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 400);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  function scrollToTop() {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  return (
    <PrelineTooltip label={t('Back to Top')} className="contents!">
      <button
        type="button"
        onClick={scrollToTop}
        aria-label={t('Back to Top')}
        aria-hidden={!visible}
        tabIndex={visible ? 0 : -1}
        className={cx(
          'fixed right-5 bottom-20 z-30 inline-flex size-11 items-center justify-center rounded-full border border-zinc-200 bg-white/90 text-zinc-600 shadow-lg backdrop-blur transition-opacity duration-200 hover:bg-zinc-50 hover:text-zinc-900 sm:bottom-6',
          visible ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden="true">
          <path fillRule="evenodd" d="M10 17a.75.75 0 0 1-.75-.75V5.612L5.29 9.77a.75.75 0 0 1-1.08-1.04l5.25-5.5a.75.75 0 0 1 1.08 0l5.25 5.5a.75.75 0 0 1-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0 1 10 17Z" clipRule="evenodd" />
        </svg>
      </button>
    </PrelineTooltip>
  );
}
