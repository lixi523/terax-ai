import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import enJson from './resources/en.json';

let i18nInitialized = false;
let initPromise: Promise<void> | null = null;

const resources = {
  en: { translation: enJson },
  'zh-CN': {
    translation: () => import('./resources/zh-CN.json'),
  },
};

export async function initI18n(): Promise<void> {
  if (i18nInitialized) {
    return initPromise!;
  }

  initPromise = (async () => {
    await i18next
      .use(initReactI18next)
      .init({
        resources,
        lng: 'en',
        fallbackLng: 'en',
        defaultNS: 'translation',
        ns: ['translation'],
        interpolation: {
          escapeValue: false,
        },
        react: {
          useSuspense: false,
        },
        missingKeyHandler: (lng, _ns, key) => {
          if (import.meta.env.DEV) {
            console.warn(`[i18n] Missing key: ${key} (${lng})`);
          }
        },
        parseMissingKeyHandler: (key) => {
          return key;
        },
      });

    i18nInitialized = true;
  })();

  return initPromise;
}

export async function changeLanguage(lng: string): Promise<void> {
  await i18next.changeLanguage(lng);
  localStorage.setItem('terax:locale', lng);
  document.documentElement.lang = lng;
}

export function getCurrentLanguage(): string {
  return i18next.language || 'en';
}

export function getFixedT(lng: string) {
  return i18next.getFixedT(lng);
}

export { i18next };
export { useTranslation } from 'react-i18next';