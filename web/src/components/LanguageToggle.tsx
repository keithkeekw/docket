import { useEffect, useRef, useState } from 'react';
import { LOCALE_OPTIONS, useLocale, useT } from '../lib/i18n';
import { cx } from '../lib/cx';
import { useLocaleStore } from '../store/locale';
import { PrelineTooltip } from './PrelineTooltip';

/**
 * Language menu beside the theme switch. The option names stay in their own
 * language so either one is always recognisable.
 */
export function LanguageToggle() {
  const locale = useLocale();
  const setLocale = useLocaleStore((state) => state.setLocale);
  const t = useT();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
  }, [locale]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const current = LOCALE_OPTIONS.find((option) => option.value === locale)?.label ?? 'English';

  return (
    <div ref={menuRef} className="relative">
      <PrelineTooltip label={`${t('Language')}: ${current}`}>
        <button
          type="button"
          onClick={() => { setOpen((value) => !value); }}
          aria-label={`${t('Language')}: ${current}. ${t('Open language menu')}`}
          aria-haspopup="menu"
          aria-expanded={open}
          className="inline-flex size-8 items-center justify-center rounded-full border border-zinc-200 bg-white/90 text-zinc-600 shadow-sm backdrop-blur transition-colors hover:bg-zinc-50 hover:text-zinc-900"
        >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          className="size-4"
          aria-hidden="true"
        >
          <circle cx="10" cy="10" r="7" />
          <path d="M3 10h14M10 3c2.2 2.4 3.3 4.8 3.3 7s-1.1 4.6-3.3 7c-2.2-2.4-3.3-4.8-3.3-7s1.1-4.6 3.3-7Z" />
        </svg>
        </button>
      </PrelineTooltip>

      {open && (
        <div
          role="menu"
          aria-label={t('Language')}
          className="absolute top-10 right-0 w-40 rounded-xl border border-zinc-200 bg-white p-1 shadow-2xl"
        >
          <p className="px-2 py-1 text-[10px] font-medium tracking-wide text-zinc-400 uppercase">
            {t('Language')}
          </p>
          {LOCALE_OPTIONS.map((option) => {
            const active = option.value === locale;
            return (
              <button
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  setLocale(option.value);
                  setOpen(false);
                }}
                className={cx(
                  'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px]',
                  active ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-600 hover:bg-zinc-50',
                )}
              >
                <span className="flex-1">{option.label}</span>
                {active && (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-3.5" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
