import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import enJson from './resources/en.json';

let i18nInitialized = false;
let initPromise: Promise<void> | null = null;

function buildNamespaces(obj: Record<string, any>, prefix = ''): Record<string, Record<string, any>> {
  const namespaces: Record<string, Record<string, any>> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (key === '__nonTranslatable') continue;
    
    const nsName = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Check if this is a "leaf" object (has string values) or a "branch" object
      const hasStringValues = Object.values(value).some(v => typeof v === 'string');
      const hasObjectValues = Object.values(value).some(v => typeof v === 'object' && v !== null && !Array.isArray(v));
      
      if (hasStringValues) {
        // This namespace has direct string values
        namespaces[nsName] = flattenForNamespace(value);
      }
      
      if (hasObjectValues) {
        // Recurse into sub-objects
        Object.assign(namespaces, buildNamespaces(value, nsName));
      }
    }
  }
  
  return namespaces;
}

function flattenForNamespace(obj: Record<string, any>, prefix = ''): Record<string, any> {
  const result: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenForNamespace(value, fullKey));
    } else {
      result[fullKey] = value;
    }
  }
  
  return result;
}

function buildAllResources(json: Record<string, any>) {
  const namespaces = buildNamespaces(json);
  
  // Ensure 'translation' namespace exists with all flattened keys
  const allFlat: Record<string, any> = {};
  function flattenAll(obj: Record<string, any>, prefix = '') {
    for (const [key, value] of Object.entries(obj)) {
      if (key === '__nonTranslatable') continue;
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        flattenAll(value, fullKey);
      } else {
        allFlat[fullKey] = value;
      }
    }
  }
  flattenAll(json);
  namespaces['translation'] = allFlat;
  
  return namespaces;
}

const enResources = buildAllResources(enJson);
const resources = {
  en: enResources,
  'zh-CN': {
    translation: async () => {
      const zhModule = await import('./resources/zh-CN.json');
      const zhFlat: Record<string, any> = {};
      function flattenAll(obj: Record<string, any>, prefix = '') {
        for (const [key, value] of Object.entries(obj)) {
          if (key === '__nonTranslatable') continue;
          const fullKey = prefix ? `${prefix}.${key}` : key;
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            flattenAll(value, fullKey);
          } else {
            zhFlat[fullKey] = value;
          }
        }
      }
      flattenAll(zhModule.default);
      return zhFlat;
    },
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
        lng: 'zh-CN',
        fallbackLng: 'en',
        defaultNS: 'translation',
        ns: ['translation'],
        interpolation: {
          escapeValue: false,
        },
        react: {
          useSuspense: false,
        },
        keySeparator: false,
        nsSeparator: false,
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