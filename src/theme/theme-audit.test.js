import fs from 'fs';
import path from 'path';
import { describe, expect, test } from 'vitest';

const ROOT_DIR = process.cwd();
const SRC_DIR = path.join(ROOT_DIR, 'src');

const TRACKED_CSS_FILES = new Set([
  path.join(SRC_DIR, 'css', 'theme-overrides.css')
]);

const ALLOWED_LITERAL_FILES = new Set([
  path.join(SRC_DIR, 'theme', 'themes.js'),
  path.join(SRC_DIR, 'css', 'palette.css'),
  path.join(SRC_DIR, 'css', 'colors.css'),
  path.join(SRC_DIR, 'css', 'style.css')
]);

const ALL_TAILWIND_COLOR_FAMILIES = new Set([
  'slate',
  'gray',
  'zinc',
  'neutral',
  'stone',
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
  'black',
  'white'
]);

const HANDLED_COLOR_FAMILIES = new Set([
  'white',
  'black',
  'gray',
  'red',
  'orange',
  'yellow',
  'green',
  'blue',
  'indigo',
  'purple',
  'pink',
  'slate',
  'zinc',
  'neutral',
  'stone',
  'amber',
  'emerald'
]);

const COLOR_LITERAL_REGEX = /#[0-9a-fA-F]{3,8}\b|rgba?\s*\(|hsla?\s*\(/g;
const COLOR_UTILITY_REGEX = /(?:^|[\s"'`])(?:[\w-]+:)*((?:bg|text|border|ring|from|to|via|fill|stroke|shadow)-[a-z]+(?:-[0-9]{1,3})?(?:\/[0-9]{1,3})?)/g;

function walkFiles(dirPath) {
  const files = [];
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath));
      continue;
    }

    files.push(fullPath);
  }

  return files;
}

function extractVueStyleBlocks(vueContent) {
  const styleBlocks = [];
  const styleTagRegex = /<style[^>]*>([\s\S]*?)<\/style>/g;

  let match = styleTagRegex.exec(vueContent);
  while (match) {
    styleBlocks.push(match[1]);
    match = styleTagRegex.exec(vueContent);
  }

  return styleBlocks;
}

function getLineNumber(text, index) {
  return text.slice(0, index).split('\n').length;
}

describe('theme audit', () => {
  test('disallows hardcoded color literals outside allowed files', () => {
    const violations = [];
    const sourceFiles = walkFiles(SRC_DIR);

    for (const absPath of sourceFiles) {
      const ext = path.extname(absPath);
      if (!['.vue', '.js', '.css'].includes(ext)) {
        continue;
      }

      if (ALLOWED_LITERAL_FILES.has(absPath)) {
        continue;
      }

      const relativePath = path.relative(ROOT_DIR, absPath);
      const content = fs.readFileSync(absPath, 'utf8');
      const chunks = [];

      if (ext === '.vue') {
        const styleBlocks = extractVueStyleBlocks(content);
        styleBlocks.forEach((block, blockIndex) => {
          chunks.push({
            label: `${relativePath} (style block ${blockIndex + 1})`,
            text: block
          });
        });
      } else if (ext === '.css') {
        if (!TRACKED_CSS_FILES.has(absPath)) {
          continue;
        }
        chunks.push({
          label: relativePath,
          text: content
        });
      } else {
        chunks.push({
          label: relativePath,
          text: content
        });
      }

      for (const chunk of chunks) {
        let match = COLOR_LITERAL_REGEX.exec(chunk.text);
        while (match) {
          violations.push(`${chunk.label}:${getLineNumber(chunk.text, match.index)} -> ${match[0]}`);
          match = COLOR_LITERAL_REGEX.exec(chunk.text);
        }
        COLOR_LITERAL_REGEX.lastIndex = 0;
      }
    }

    expect(
      violations,
      `Unexpected raw color literals found:\n${violations.slice(0, 25).join('\n')}`
    ).toEqual([]);
  });

  test('rejects color utility families not covered by theme overrides', () => {
    const unhandledUtilities = [];
    const sourceFiles = walkFiles(SRC_DIR);

    for (const absPath of sourceFiles) {
      const ext = path.extname(absPath);
      if (!['.vue', '.js'].includes(ext)) {
        continue;
      }

      const relativePath = path.relative(ROOT_DIR, absPath);
      const content = fs.readFileSync(absPath, 'utf8');

      let match = COLOR_UTILITY_REGEX.exec(content);
      while (match) {
        const utility = match[1];
        const [, family = ''] = utility.split('-');

        if (!ALL_TAILWIND_COLOR_FAMILIES.has(family)) {
          match = COLOR_UTILITY_REGEX.exec(content);
          continue;
        }

        if (!HANDLED_COLOR_FAMILIES.has(family)) {
          unhandledUtilities.push(
            `${relativePath}:${getLineNumber(content, match.index)} -> ${utility}`
          );
        }

        match = COLOR_UTILITY_REGEX.exec(content);
      }

      COLOR_UTILITY_REGEX.lastIndex = 0;
    }

    expect(
      unhandledUtilities,
      `Unhandled color utility families found:\n${unhandledUtilities.slice(0, 25).join('\n')}`
    ).toEqual([]);
  });
});

