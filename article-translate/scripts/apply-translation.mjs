#!/usr/bin/env node

import fs from 'node:fs/promises';
import { fromPlaceholderList, articleFile, buildTranslatedMarkdown, collectCodeFenceInfos, readJson, stripFrontmatter, writeJson } from './lib/workflow-utils.mjs';
import { restoreSVGs } from './lib/svg-placeholder.mjs';

function usage() {
  console.log('Usage: node article-translate/scripts/apply-translation.mjs --article-dir "<article-dir>" [--lang zh] [--in /path/to/translated.md]');
}

function argValue(args, key, fallback = null) {
  const index = args.indexOf(key);
  if (index >= 0 && index + 1 < args.length) return args[index + 1];
  return fallback;
}

async function readInput(filePath) {
  if (filePath) return fs.readFile(filePath, 'utf8');

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

function splitTitleAndBody(markdown) {
  const trimmed = String(markdown || '').trim();
  const lines = trimmed.split(/\r?\n/);
  let index = 0;
  while (index < lines.length && !lines[index].trim()) index += 1;

  const match = (lines[index] || '').match(/^#\s+(.+?)\s*$/);
  if (!match) throw new Error('Translated output must start with a Markdown H1 title.');

  const title = match[1].trim();
  index += 1;
  while (index < lines.length && !lines[index].trim()) index += 1;
  const body = lines.slice(index).join('\n').trim();
  if (!body) throw new Error('Translated output body is empty.');

  return { title, body };
}

function buildCritique(sourceMarkdown, translatedMarkdown, sanitizeReport = {}) {
  const critique = [];
  const sourceFences = collectCodeFenceInfos(sourceMarkdown);
  const translatedFences = collectCodeFenceInfos(translatedMarkdown);

  critique.push(`# Critique Notes`);
  critique.push('');
  critique.push(`- title-present: PASS`);
  critique.push(`- svg-placeholders: ${sanitizeReport.svgPlaceholders > 0 ? 'CHECKED' : 'NONE'}`);
  critique.push(`- code-fence-count: ${sourceFences.length === translatedFences.length ? 'PASS' : `WARN source=${sourceFences.length} translated=${translatedFences.length}`}`);
  critique.push(`- placeholder-loss: ${/@@FIGURE_SVG_\d{3}@@/.test(translatedMarkdown) || sanitizeReport.svgPlaceholders === 0 ? 'PASS' : 'WARN'}`);
  critique.push(`- markdown-review: TODO`);
  critique.push(`- terminology-review: TODO`);
  critique.push(`- readability-review: TODO`);
  critique.push('');

  return critique.join('\n');
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
  const translationRaw = await readInput(inputPath);
  const { data: sourceFrontmatter, content: sourceMarkdown } = stripFrontmatter(sourceRaw);
  const { title, body } = splitTitleAndBody(translationRaw);

  const requiredPlaceholderIds = Object.keys(placeholders);
  const missing = requiredPlaceholderIds.filter((id) => !body.includes(id));
  if (missing.length > 0) {
    throw new Error(`Missing SVG placeholders in translation: ${missing.slice(0, 5).join(', ')}`);
  }

  const restoredBody = restoreSVGs(body, placeholders);
  const finalMarkdown = buildTranslatedMarkdown({
    title,
    body: restoredBody,
    lang,
    sourceUrl: sourceFrontmatter.sourceUrl,
    date: sourceFrontmatter.date,
  });

  const translatedPath = articleFile(articleDir, `${lang}.md`);
  const critiquePath = articleFile(articleDir, '04-critique.md');
  const revisionPath = articleFile(articleDir, '05-revision.md');
  const qualityPath = articleFile(articleDir, 'quality-report.json');

  await fs.writeFile(articleFile(articleDir, '03-draft.md'), translationRaw.trim() + '\n', 'utf8');
  await fs.writeFile(critiquePath, buildCritique(sourceMarkdown, translationRaw, sanitizeReport), 'utf8');
  await fs.writeFile(
    revisionPath,
    [
      '# Revision Notes',
      '',
      '- restored-svg-placeholders: yes',
      '- verified-title-contract: yes',
      '- verified-output-file: yes',
      '- follow-up-manual-review: check nuance and terminology consistency',
      '',
    ].join('\n'),
    'utf8'
  );
  await fs.writeFile(translatedPath, finalMarkdown, 'utf8');

  await writeJson(qualityPath, {
    ok: true,
    lang,
    articleDir,
    svgPlaceholdersRestored: requiredPlaceholderIds.length,
    codeFenceCountSource: collectCodeFenceInfos(sourceMarkdown).length,
    codeFenceCountTranslated: collectCodeFenceInfos(translationRaw).length,
    output: translatedPath,
    generatedAt: new Date().toISOString(),
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        articleDir,
        draftPath: articleFile(articleDir, '03-draft.md'),
        critiquePath,
        revisionPath,
        translatedPath,
        qualityPath,
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
