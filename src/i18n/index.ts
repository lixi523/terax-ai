import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import enJson from './resources/en.json';

let i18nInitialized = false;
let initPromise: Promise<void> | null = null;

function flattenObj(obj: Record<string, any>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === '__nonTranslatable') continue;
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenObj(value, fullKey));
    } else if (typeof value === 'string') {
      result[fullKey] = value;
    }
  }
  return result;
}

const NAMESPACE_MAP: Record<string, string> = {
  'settings.general': 'settings.general',
  'settings.editor': 'settings.editor',
  'settings.shell': 'settings.terminal',
  'themes': 'common',
  'shortcuts': 'common',
  'ai': 'settings.ai',
  'header.window': 'header.window',
  'header.search': 'header.search',
  'header.tabs': 'header.tabs',
  'statusBar': 'settings.statusBar',
  'commandPalette': 'settings.commandPalette',
  'dialogs': 'settings.dialogs',
};

function buildResources(json: Record<string, any>) {
  const allFlat = flattenObj(json);
  const namespaces: Record<string, Record<string, string>> = {};

  for (const [nsName, jsonPath] of Object.entries(NAMESPACE_MAP)) {
    const nsObj: Record<string, string> = {};

    // Get all keys that start with the jsonPath
    for (const [dottedKey, value] of Object.entries(allFlat)) {
      if (dottedKey.startsWith(jsonPath + '.') || dottedKey === jsonPath) {
        // Store under full dotted path (for components using full paths)
        nsObj[dottedKey] = value;

        // Store under short key relative to namespace (for components using short keys)
        if (dottedKey.startsWith(jsonPath + '.')) {
          const shortKey = dottedKey.slice(jsonPath.length + 1);
          nsObj[shortKey] = value;
        }
      }
    }

    namespaces[nsName] = nsObj;
  }

  return namespaces;
}

function buildResourcesFromJson(json: Record<string, any>) {
  const allFlat = flattenObj(json);
  const namespaces: Record<string, Record<string, string>> = {};

  for (const [nsName, jsonPath] of Object.entries(NAMESPACE_MAP)) {
    const nsObj: Record<string, string> = {};

    for (const [dottedKey, value] of Object.entries(allFlat)) {
      if (dottedKey.startsWith(jsonPath + '.') || dottedKey === jsonPath) {
        nsObj[dottedKey] = value;
        if (dottedKey.startsWith(jsonPath + '.')) {
          const shortKey = dottedKey.slice(jsonPath.length + 1);
          nsObj[shortKey] = value;
        }
      }
    }

    namespaces[nsName] = nsObj;
  }

  return namespaces;
}

const enResources = buildResources(enJson);

const resources = {
  en: enResources,
  'zh-CN': async () => {
    const mod = await import('./resources/zh-CN.json');
    return buildResourcesFromJson(mod.default);
  },
} as any;

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
        defaultNS: 'settings.general',
        ns: Object.keys(enResources),
        interpolation: {
          escapeValue: false,
        },
        react: {
          useSuspense: false,
        },
        keySeparator: false,
        nsSeparator: false,
        saveMissing: true,
        missingKeyHandler: (lng, _ns, key) => {
          if (import.meta.env.DEV) {
            console.warn(`[i18n] Missing key: ${lng}/${_ns}/${key}`);
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
