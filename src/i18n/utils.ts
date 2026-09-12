import { i18next } from './index';
import type { TOptions } from 'i18next';

export function tRaw(key: string, options?: TOptions): string {
  return i18next.t(key, options);
}

export function namespace(ns: string) {
  return (key: string, options?: TOptions) => tRaw(`${ns}.${key}`, options);
}

export function tWithContext(key: string, context: string, options?: TOptions): string {
  return tRaw(key, { ...options, context });
}

export function hasKey(key: string, lng?: string): boolean {
  const bundle = i18next.getResourceBundle(lng || i18next.language || 'en', 'translation');
  return key.split('.').reduce((obj: any, k) => obj?.[k], bundle) !== undefined;
}

export function getResourceBundle(lng?: string) {
  return i18next.getResourceBundle(lng || i18next.language || 'en', 'translation');
}