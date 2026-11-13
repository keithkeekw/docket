import { enUS, zhCN } from 'date-fns/locale';
import { zhMessages } from '../i18n/zh';
import { useLocaleStore, type Locale } from '../store/locale';

export type { Locale };

export type TranslateParams = Record<string, string | number>;

export const LOCALE_OPTIONS: ReadonlyArray<{ value: Locale; label: string }> = [
  { value: 'en', label: 'English' },
  { value: 'zh', label: '简体中文' },
];

/** Fill `{name}` placeholders without touching the surrounding text. */
export function interpolate(template: string, params?: TranslateParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    params[key] === undefined ? match : String(params[key]),
  );
}

/**
 * Translate an English source string. English sources double as dictionary
 * keys, so a missing Chinese entry falls back to readable English instead of a
 * raw key.
 */
export function translate(locale: Locale, source: string, params?: TranslateParams): string {
  const template = locale === 'zh' ? (zhMessages[source] ?? source) : source;
  return interpolate(template, params);
}

/** The translator for components; it re-renders whenever the language changes. */
export function useT(): (source: string, params?: TranslateParams) => string {
  const locale = useLocaleStore((state) => state.locale);
  return (source, params) => translate(locale, source, params);
}

/** The translator for plain modules and event handlers outside render. */
export function tNow(source: string, params?: TranslateParams): string {
  return translate(useLocaleStore.getState().locale, source, params);
}

export function useLocale(): Locale {
  return useLocaleStore((state) => state.locale);
}

/** date-fns locale matching the interface language. */
export function useDateLocale() {
  return useLocale() === 'zh' ? zhCN : enUS;
}
