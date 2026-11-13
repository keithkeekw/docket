import { create } from 'zustand';

export type Locale = 'en' | 'zh';

const STORAGE_KEY = 'docket:locale';

function loadLocale(): Locale {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'zh' ? 'zh' : 'en';
  } catch {
    return 'en';
  }
}

type LocaleStore = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
};

/** The interface language, persisted next to the theme on this device. */
export const useLocaleStore = create<LocaleStore>((set, get) => ({
  locale: loadLocale(),
  setLocale: (locale) => {
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // A blocked localStorage only costs persistence, not the language.
    }
    set({ locale });
  },
  toggleLocale: () => {
    get().setLocale(get().locale === 'zh' ? 'en' : 'zh');
  },
}));
