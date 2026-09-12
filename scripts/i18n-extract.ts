import fs from 'node:fs';
import path from 'node:path';

const SRC_DIR = path.resolve('src');
const OUTPUT_CSV = path.resolve('scripts/i18n-extracted.csv');

const EXCLUDED_DIRS = ['node_modules', 'dist', 'build', '.git'];
const EXTENSIONS = ['.tsx', '.ts'];

interface ExtractedString {
  file: string;
  line: number;
  type: 'jsx-text' | 'placeholder' | 'title' | 'aria-label' | 'alt';
  text: string;
  suggestedKey: string;
}

function walkDir(dir: string, callback: (file: string) => void): void {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.includes(entry.name)) {
        walkDir(path.join(dir, entry.name), callback);
      }
    } else if (entry.isFile() && EXTENSIONS.some((ext) => entry.name.endsWith(ext))) {
      callback(path.join(dir, entry.name));
    }
  }
}

function extractStringsFromFile(filePath: string): ExtractedString[] {
  const results: ExtractedString[] = [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  // Regex patterns for different string types
  const jsxTextRegex = />([^<>{}]+)<\/[^>]+>/g;
  const placeholderRegex = /placeholder\s*=\s*["']([^"']+)["']/g;
  const titleRegex = /title\s*=\s*["']([^"']+)["']/g;
  const ariaLabelRegex = /aria-label\s*=\s*["']([^"']+)["']/g;
  const altRegex = /alt\s*=\s*["']([^"']+)["']/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Extract JSX text children
    let match;
    while ((match = jsxTextRegex.exec(line)) !== null) {
      const text = match[1].trim();
      if (text && !text.match(/^[{}]/)) {
        results.push({
          file: filePath,
          line: lineNum,
          type: 'jsx-text',
          text,
          suggestedKey: generateKey(filePath, text, 'jsx'),
        });
      }
    }

    // Extract placeholder
    while ((match = placeholderRegex.exec(line)) !== null) {
      results.push({
        file: filePath,
        line: lineNum,
        type: 'placeholder',
        text: match[1],
        suggestedKey: generateKey(filePath, match[1], 'placeholder'),
      });
    }

    // Extract title
    while ((match = titleRegex.exec(line)) !== null) {
      results.push({
        file: filePath,
        line: lineNum,
        type: 'title',
        text: match[1],
        suggestedKey: generateKey(filePath, match[1], 'title'),
      });
    }

    // Extract aria-label
    while ((match = ariaLabelRegex.exec(line)) !== null) {
      results.push({
        file: filePath,
        line: lineNum,
        type: 'aria-label',
        text: match[1],
        suggestedKey: generateKey(filePath, match[1], 'aria'),
      });
    }

    // Extract alt
    while ((match = altRegex.exec(line)) !== null) {
      results.push({
        file: filePath,
        line: lineNum,
        type: 'alt',
        text: match[1],
        suggestedKey: generateKey(filePath, match[1], 'alt'),
      });
    }
  }

  return results;
}

function generateKey(filePath: string, text: string, type: string): string {
  // Generate a key based on file path and text
  const relPath = path.relative(SRC_DIR, filePath);
  const pathParts = relPath.split(path.sep).filter((p) => p !== 'src');
  const feature = pathParts[0] || 'common';
  const section = pathParts[1] || 'general';
  const textHash = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);
  return `${feature}.${section}.${type}.${textHash}`;
}

function main(): void {
  console.log('[i18n:extract] Scanning source files for hardcoded strings...\n');

  const allStrings: ExtractedString[] = [];

  walkDir(SRC_DIR, (file) => {
    const strings = extractStringsFromFile(file);
    allStrings.push(...strings);
  });

  console.log(`Found ${allStrings.length} potential hardcoded strings\n`);

  // Write CSV
  const csvHeader = 'File,Line,Type,Text,SuggestedKey\n';
  const csvRows = allStrings
    .map(
      (s) =>
        `"${s.file}",${s.line},${s.type},"${s.text.replace(/"/g, '""')}","${s.suggestedKey}"`,
    )
    .join('\n');

  fs.writeFileSync(OUTPUT_CSV, csvHeader + csvRows);
  console.log(`Results written to ${OUTPUT_CSV}`);

  // Also print summary by type
  const byType = new Map<string, number>();
  for (const s of allStrings) {
    byType.set(s.type, (byType.get(s.type) || 0) + 1);
  }
  console.log('\nBy type:');
  for (const [type, count] of byType.entries()) {
    console.log(`  ${type}: ${count}`);
  }
}

main();