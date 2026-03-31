#!/usr/bin/env node

import fs from 'node:fs/promises';
import { fromPlaceholderList, articleFile, readJson, stripFrontmatter } from './lib/workflow-utils.mjs';
import { splitTitleAndBody, buildChecks, buildCritique, countWarnings } from './lib/translation-checks.mjs';

function usage() {
  console.log('Usage: node article-translate/scripts/stage-draft.mjs --article-dir "<article-dir>" [--lang zh] [--in /path/to/translated.md]');
}

function argValue(args, key, fallback = null) {
  const index = args.indexOf(key);
  if (index >= 0 && index + 1 < args.length) return args[index + 1];
  return fallback;
}

async function readInput(filePath, fallbackPath = null) {
  if (filePath) return fs.readFile(filePath, 'utf8');
  if (fallbackPath) return fs.readFile(fallbackPath, 'utf8');

  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    usage();
    process.exit(args.length === 0 ? 2 : 0);
  }

  const articleDir = argValue(args, '--article-dir');
  const lang = argValue(args, '--lang', 'zh');
  const inputPath = argValue(args, '--in');
  if (!articleDir) throw new Error('Missing --article-dir');

  const sourceRaw = await fs.readFile(articleFile(articleDir, 'source.clean.md'), 'utf8');
  const sanitizeReport = await readJson(articleFile(articleDir, 'sanitize-report.json'), {});
  const placeholders = fromPlaceholderList(await readJson(articleFile(articleDir, 'inline-svg.placeholders.json'), []));
  const draftPath = articleFile(articleDir, '03-draft.md');
  const translationRaw = await readInput(inputPath, draftPath);
  const { content: sourceMarkdown } = stripFrontmatter(sourceRaw);
  const { body } = splitTitleAndBody(translationRaw);

  const requiredPlaceholderIds = Object.keys(placeholders);
  const missing = requiredPlaceholderIds.filter((id) => !body.includes(id));
  if (missing.length > 0) {
    throw new Error(`Missing SVG placeholders in translation: ${missing.slice(0, 5).join(', ')}`);
  }

  const checks = buildChecks(sourceMarkdown, translationRaw, sanitizeReport, []);
  const critique = buildCritique(checks);
  const critiquePath = articleFile(articleDir, '04-critique.md');

  await fs.writeFile(draftPath, translationRaw.trim() + '\n', 'utf8');
  await fs.writeFile(critiquePath, critique, 'utf8');

  console.log(
    JSON.stringify(
      {
        ok: true,
        lang,
        articleDir,
        draftPath,
        critiquePath,
        checks,
        warningCount: countWarnings(checks),
        readyForFinal: countWarnings(checks) === 0,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exit(1);
});
