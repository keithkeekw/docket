import { useEffect, useRef } from 'react';
import { cx } from '../lib/cx';
import { useLocale, useT } from '../lib/i18n';
import { ensurePrelineCollections } from '../lib/preline';
import { controlClassName } from './Field';

type DatepickerInstance = { destroy: () => void };

/**
 * Preline's Advanced Datepicker wrapped for React. The plugin writes the
 * picked day back through its `change` event, so the rest of the app keeps
 * using plain `YYYY-MM-DD` strings. The plugin is imported on demand so the
 * calendar runtime stays out of the initial bundle.
 */
export function DatePicker({
  value,
  onChange,
  ariaLabel,
  min,
  max,
  disabled = false,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement | null>(null);
  const changeRef = useRef(onChange);
  const locale = useLocale();
  const t = useT();

  useEffect(() => {
    changeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let cancelled = false;
    let picker: DatepickerInstance | null = null;
    let handleChange: ((event: Event) => void) | null = null;
    let calendarObserver: MutationObserver | null = null;

    const adjustPosition = (calendar: Element) => {
      if (calendar.hasAttribute('data-vc-calendar-hidden')) return;
      const rect = calendar.getBoundingClientRect();
      const inputRect = el.getBoundingClientRect();
      const margin = 8;

      if (rect.bottom > window.innerHeight - margin) {
        const top = Math.max(
          margin,
          Math.min(inputRect.top - rect.height - margin, window.innerHeight - rect.height - margin),
        );
        (calendar as HTMLElement).style.top = `${top}px`;
      }

      if (rect.right > window.innerWidth - margin) {
        (calendar as HTMLElement).style.left = `${Math.max(
          margin,
          window.innerWidth - rect.width - margin,
        )}px`;
      }
    };

    // Native dialogs live in the browser's top layer, so a calendar appended
    // to <body> would paint behind them. Move it inside the open dialog.
    const moveIntoDialog = () => {
      const dialog = el.closest('dialog');
      if (!dialog) return;
      const calendar = document.querySelector('.vc[data-vc-input]');
      if (!calendar) return;

      if (calendar.parentElement !== dialog) dialog.appendChild(calendar);

      if (!calendarObserver) {
        calendarObserver = new MutationObserver(() => {
          window.requestAnimationFrame(() => {
            adjustPosition(calendar);
          });
        });
        calendarObserver.observe(calendar, {
          attributes: true,
          attributeFilter: ['data-vc-calendar-hidden'],
        });
      }

      window.requestAnimationFrame(() => {
        adjustPosition(calendar);
      });
    };

    const observer = new MutationObserver(moveIntoDialog);

    const handleOpen = () => {
      window.setTimeout(() => {
        moveIntoDialog();
        const calendar = document.querySelector('.vc[data-vc-input]');
        if (calendar) adjustPosition(calendar);
      }, 60);
    };

    el.addEventListener('click', handleOpen);
    el.addEventListener('focus', handleOpen);

    const init = async () => {
      const [{ default: HSDatepicker }, { default: merge }, { default: mergeWith }] =
        await Promise.all([
          import('preline/plugins/datepicker-non-auto'),
          import('lodash/merge'),
          import('lodash/mergeWith'),
        ]);

      if (cancelled) return;

      // Preline's standalone datepicker reads lodash from the global scope.
      (window as unknown as { _: { merge: typeof merge; mergeWith: typeof mergeWith } })._ = {
        merge,
        mergeWith,
      };

      el.setAttribute(
        'data-hs-datepicker',
        JSON.stringify({
          mode: 'default',
          locale: locale === 'zh' ? 'zh-CN' : 'en',
          dateFormat: 'YYYY-MM-DD',
          dateLocale: locale === 'zh' ? 'zh-CN' : 'en',
          selectedDates: value ? [value] : [],
          inputModeOptions: { dateSeparator: '-', closeOnSelect: true },
          applyUtilityClasses: true,
          showTodayButton: true,
          ...(min ? { dateMin: min } : {}),
          ...(max ? { dateMax: max } : {}),
        }),
      );

      ensurePrelineCollections();
      picker = new HSDatepicker(el);

      handleChange = (event: Event) => {
        const detail = (event as CustomEvent<{ selectedDates?: string[] }>).detail;
        changeRef.current(detail?.selectedDates?.[0] ?? '');
      };

      el.addEventListener('change.hs.datepicker', handleChange);
      observer.observe(document.body, { childList: true });
    };

    void init();

    return () => {
      cancelled = true;
      observer.disconnect();
      calendarObserver?.disconnect();
      el.removeEventListener('click', handleOpen);
      el.removeEventListener('focus', handleOpen);
      if (handleChange) el.removeEventListener('change.hs.datepicker', handleChange);

      if (picker) {
        const parent = el.parentElement;
        const nextSibling = el.nextSibling;

        picker.destroy();

        // Vanilla Calendar swaps the input for a clone when destroying. Put
        // React's node back so later renders and unmounts target the element
        // that is actually in the tree.
        if (parent && !el.isConnected) {
          const clone = parent.querySelector('input.hs-datepicker');
          if (clone && clone !== el) clone.replaceWith(el);
          else parent.insertBefore(el, nextSibling);
        }
      }
    };
  }, [locale, value, min, max]);

  return (
    <div className={cx('relative', className)}>
      <input
        ref={ref}
        type="text"
        readOnly
        disabled={disabled}
        aria-label={ariaLabel ?? t('Choose a date')}
        placeholder={t('Select a date')}
        className={cx(controlClassName, 'hs-datepicker min-h-10 cursor-pointer pr-10')}
      />

      {value && !disabled ? (
        <button
          type="button"
          onClick={() => {
            onChange('');
          }}
          aria-label={t('Clear date')}
          title={t('Clear date')}
          className="absolute top-1/2 right-2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-3.5" aria-hidden="true">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-zinc-400"
          aria-hidden="true"
        >
          <path fillRule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z" clipRule="evenodd" />
        </svg>
      )}
    </div>
  );
}
