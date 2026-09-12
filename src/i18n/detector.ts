import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const DETECTOR_OPTIONS = {
  order: ['settingsStore', 'localStorage', 'navigator', 'htmlTag'],
  caches: ['localStorage'],
  lookupLocalStorage: 'terax:locale',
  lookupCookie: 'terax:locale',
  htmlTag: document.documentElement,
};

export async function initLanguageDetector(i18n: typeof i18next): Promise<void> {
  const settingsDetector = {
    name: 'settingsStore',
    lookup: async (): Promise<string | undefined> => {
      try {
        const { usePreferencesStore } = await import('@/modules/settings/preferences');
        const locale = usePreferencesStore.getState().locale;
        if (locale && locale !== 'system') {
          return locale;
        }
      } catch {
        // Store not ready yet
      }
      return undefined;
    },
    cacheUserLanguage: async (lng: string): Promise<void> => {
      try {
        const { setLocale } = await import('@/modules/settings/store');
        await setLocale(lng as "system" | "en" | "zh-CN");
      } catch {
        // Store not ready yet
      }
    },
  };

  i18n.use(LanguageDetector).use(settingsDetector as any);

  return new Promise((resolve) => {
    i18n.services.languageDetector?.init(DETECTOR_OPTIONS);
    resolve();
  });
}

export function getInitialLanguage(): string {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('terax:locale');
    if (stored && stored !== 'system') {
      return stored;
    }
    const navLang = navigator.language || navigator.languages?.[0] || 'en';
    if (navLang.startsWith('zh')) {
      return 'zh-CN';
    }
    return 'en';
  }
  return 'en';
}