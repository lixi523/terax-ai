import fs from 'node:fs';
import path from 'node:path';

const LOCALES_DIR = path.resolve('src/i18n/resources');
const SUPPORTED_LOCALES = ['en', 'zh-CN'];

interface ValidationResult {
  errors: string[];
  warnings: string[];
}

function loadLocale(locale: string): Record<string, unknown> {
  const filePath = path.join(LOCALES_DIR, `${locale}.json`);
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

function flattenKeys(obj: Record<string, unknown>, prefix = ''): Set<string> {
  const keys = new Set<string>();
  for (const [key, value] of Object.entries(obj)) {
    if (key === '__nonTranslatable') continue;
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const nestedKeys = flattenKeys(value as Record<string, unknown>, fullKey);
      nestedKeys.forEach((k) => keys.add(k));
    } else {
      keys.add(fullKey);
    }
  }
  return keys;
}

function checkLocale(locale: string, referenceKeys: Set<string>): ValidationResult {
  const result: ValidationResult = { errors: [], warnings: [] };
  const localeData = loadLocale(locale);
  const localeKeys = flattenKeys(localeData);

  // Check for missing keys
  for (const key of referenceKeys) {
    if (!localeKeys.has(key)) {
      result.errors.push(`Missing key in ${locale}: ${key}`);
    }
  }

  // Check for extra keys
  for (const key of localeKeys) {
    if (!referenceKeys.has(key)) {
      result.warnings.push(`Extra key in ${locale} (not in source): ${key}`);
    }
  }

  return result;
}

function main(): void {
  console.log('[i18n:check] Validating translation files...\n');

  const enData = loadLocale('en');
  const referenceKeys = flattenKeys(enData);
  console.log(`Source locale (en) has ${referenceKeys.size} keys\n`);

  let hasErrors = false;

  for (const locale of SUPPORTED_LOCALES) {
    if (locale === 'en') continue;

    const result = checkLocale(locale, referenceKeys);

    if (result.errors.length > 0) {
      hasErrors = true;
      console.log(`❌ ${locale}: ${result.errors.length} errors`);
      for (const error of result.errors) {
        console.log(`  - ${error}`);
      }
    } else {
      console.log(`✅ ${locale}: All keys present`);
    }

    if (result.warnings.length > 0) {
      console.log(`⚠️  ${locale}: ${result.warnings.length} warnings`);
      for (const warning of result.warnings) {
        console.log(`  - ${warning}`);
      }
    }
    console.log();
  }

  // Check for unused keys in source (keys not referenced in code)
  // This would require scanning the codebase - simplified for now
  console.log('Note: Unused key detection requires code scanning (not implemented in this basic validator)');

  if (hasErrors) {
    console.log('\n❌ Validation failed');
    process.exit(1);
  } else {
    console.log('\n✅ All locales valid');
  }
}

main();