#!/usr/bin/env node

import fs from 'node:fs/promises';
import { fromPlaceholderList, articleFile, buildTranslatedMarkdown, readJson, stripFrontmatter, writeJson } from './lib/workflow-utils.mjs';
import { restoreSVGs } from './lib/svg-placeholder.mjs';
import { splitTitleAndBody, buildChecks, buildRevisionNotes, countWarnings, loadPreviousDraft } from './lib/translation-checks.mjs';

function usage() {
  console.log('Usage: node article-translate/scripts/apply-final.mjs --article-dir "<article-dir>" [--lang zh] [--in /path/to/translated.md]');
}

function argValue(args, key, fallback = null) {
  const index = args.indexOf(key);
  if (index >= 0 && index + 1 < args.length) return args[index + 1];
  return fallback;
}

async function readInput(filePath) {
  if (filePath) return fs.readFile(filePath, 'utf8');
  return null;
}

function validateCritiqueForFinal(critiqueRaw) {
  const critique = String(critiqueRaw || '');
  if (!critique.trim()) {
    throw new Error('Missing 04-critique.md. Run the draft critique stage first.');
  }

  if (/pending agent review/i.test(critique)) {
    throw new Error('04-critique.md still contains pending agent review items. Complete the Agent Critique section before applying the final translation.');
  }

  const decision = critique.match(/^- review-decision:\s*(.+)$/mi)?.[1]?.trim().toLowerCase();
  if (!decision) {
    throw new Error('04-critique.md is missing review-decision. Set it to pass or revise before applying the final translation.');
  }

  if (decision !== 'pass') {
    throw new Error(`04-critique.md review-decision is "${decision}". Revise the draft and rerun critique before applying the final translation.`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    usage();
    process.exit(args.length === 0 ? 2 : 0);
  }

  const articleDir = argValue(args, '--article-dir');
  const lang = argValue(args, '--lang', 'zh');
  const inputPath = argValue(args, '--in', articleFile(articleDir || '.', '03-draft.md'));
  if (!articleDir) throw new Error('Missing --article-dir');

  const sourceRaw = await fs.readFile(articleFile(articleDir, 'source.clean.md'), 'utf8');
  const critiqueRaw = await fs.readFile(articleFile(articleDir, '04-critique.md'), 'utf8');
  const sanitizeReport = await readJson(articleFile(articleDir, 'sanitize-report.json'), {});
  const placeholders = fromPlaceholderList(await readJson(articleFile(articleDir, 'inline-svg.placeholders.json'), []));
  const translationRaw = await readInput(inputPath);
  if (!translationRaw) {
    throw new Error(`Missing translation input: ${inputPath}`);
  }
  validateCritiqueForFinal(critiqueRaw);
  const previousDraft = await loadPreviousDraft(articleDir, articleFile);
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

  const checks = buildChecks(sourceMarkdown, translationRaw, sanitizeReport, [], sourceFrontmatter.title || '');
  const translatedPath = articleFile(articleDir, `${lang}.md`);
  const revisionPath = articleFile(articleDir, '05-revision.md');
  const qualityPath = articleFile(articleDir, '06-quality-report.json');
  const currentDraft = translationRaw.trim();
  const changedSinceDraft = previousDraft === null ? null : previousDraft !== currentDraft;

  await fs.writeFile(
    revisionPath,
    buildRevisionNotes({
      title,
      checks,
      placeholderCount: requiredPlaceholderIds.length,
      translatedPath,
      changedSinceDraft,
      previousDraftExists: previousDraft !== null,
    }),
    'utf8'
  );
  await fs.writeFile(translatedPath, finalMarkdown, 'utf8');

  await writeJson(qualityPath, {
    ok: true,
    lang,
    articleDir,
    svgPlaceholdersRestored: requiredPlaceholderIds.length,
    warningCount: countWarnings(checks),
    checks,
    previousDraftExists: previousDraft !== null,
    changedSinceDraft,
    output: translatedPath,
    generatedAt: new Date().toISOString(),
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        lang,
        articleDir,
        revisionPath,
        translatedPath,
        qualityPath,
        warningCount: countWarnings(checks),
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
