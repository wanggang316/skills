import fs from 'node:fs/promises';
import { collectCodeFenceInfos } from './workflow-utils.mjs';

export function splitTitleAndBody(markdown) {
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

export function countMatches(text, pattern) {
  const matches = String(text || '').match(pattern);
  return matches ? matches.length : 0;
}

export function collectProtectedTerms(sourceMarkdown, glossary = []) {
  const source = String(sourceMarkdown || '');
  const keepVerbatim = new Set();

  for (const item of glossary) {
    if (!item || item.guidance !== 'keep-verbatim') continue;
    const term = String(item.source || '').trim();
    if (term && source.includes(term)) keepVerbatim.add(term);
  }

  for (const match of source.matchAll(/`([^`\n]+)`/g)) {
    const term = match[1].trim();
    if (term) keepVerbatim.add(term);
  }

  return [...keepVerbatim];
}

export function evaluateMarkdownIntegrity(sourceMarkdown, translatedMarkdown) {
  const sourceHeadings = countMatches(sourceMarkdown, /^#{1,6}\s+/gm);
  const translatedHeadings = countMatches(translatedMarkdown, /^#{1,6}\s+/gm);
  const sourceLinks = countMatches(sourceMarkdown, /\[[^\]]+\]\([^)]+\)/g);
  const translatedLinks = countMatches(translatedMarkdown, /\[[^\]]+\]\([^)]+\)/g);
  const sourceTables = countMatches(sourceMarkdown, /^\|.+\|\s*$/gm);
  const translatedTables = countMatches(translatedMarkdown, /^\|.+\|\s*$/gm);

  const problems = [];
  if (sourceHeadings !== translatedHeadings) problems.push(`headings ${sourceHeadings}->${translatedHeadings}`);
  if (sourceLinks !== translatedLinks) problems.push(`links ${sourceLinks}->${translatedLinks}`);
  if (sourceTables !== translatedTables) problems.push(`tables ${sourceTables}->${translatedTables}`);

  return problems.length === 0 ? 'PASS' : `WARN ${problems.join(', ')}`;
}

export function evaluateTerminology(sourceMarkdown, translatedMarkdown, glossary = []) {
  const protectedTerms = collectProtectedTerms(sourceMarkdown, glossary);
  if (protectedTerms.length === 0) return 'CHECK manually for naming and term consistency';

  const missing = protectedTerms.filter((term) => !String(translatedMarkdown || '').includes(term));
  return missing.length === 0
    ? `PASS preserved ${protectedTerms.length}/${protectedTerms.length} protected terms`
    : `WARN missing ${missing.length}/${protectedTerms.length} protected terms: ${missing.slice(0, 5).join(', ')}`;
}

export function evaluateReadability(translatedMarkdown) {
  const text = String(translatedMarkdown || '');
  const cjkCount = countMatches(text, /[\u3400-\u9FFF]/g);
  const latinWordCount = countMatches(text, /\b[A-Za-z]{3,}\b/g);
  const hasDoubleSpaces = /[^\n]  [^\n]/.test(text);
  const veryLongLines = text.split(/\r?\n/).filter((line) => line.length > 180).length;

  const issues = [];
  if (cjkCount < 50) issues.push('very little Chinese content detected');
  if (latinWordCount > cjkCount / 2) issues.push('too much untranslated English');
  if (hasDoubleSpaces) issues.push('double spaces in prose');
  if (veryLongLines > 0) issues.push(`very long lines=${veryLongLines}`);

  return issues.length === 0
    ? 'CHECK fluent Chinese style and tone manually'
    : `WARN ${issues.join(', ')}`;
}

export function buildChecks(sourceMarkdown, translatedMarkdown, sanitizeReport = {}, glossary = []) {
  const sourceFences = collectCodeFenceInfos(sourceMarkdown);
  const translatedFences = collectCodeFenceInfos(translatedMarkdown);
  return {
    titlePresent: 'PASS',
    svgPlaceholders: sanitizeReport.svgPlaceholders > 0 ? 'CHECKED' : 'NONE',
    codeFenceCount: sourceFences.length === translatedFences.length ? 'PASS' : `WARN source=${sourceFences.length} translated=${translatedFences.length}`,
    placeholderLoss: /@@FIGURE_SVG_\d{3}@@/.test(translatedMarkdown) || sanitizeReport.svgPlaceholders === 0 ? 'PASS' : 'WARN',
    markdownReview: evaluateMarkdownIntegrity(sourceMarkdown, translatedMarkdown),
    terminologyReview: evaluateTerminology(sourceMarkdown, translatedMarkdown, glossary),
    readabilityReview: evaluateReadability(translatedMarkdown),
  };
}

export function countWarnings(checks) {
  return Object.values(checks).filter((value) => String(value).startsWith('WARN')).length;
}

export function buildCritique(checks) {
  const critique = [];
  critique.push('# Critique Notes');
  critique.push('');
  critique.push('## Deterministic Checks');
  critique.push('');
  critique.push(`- title-present: ${checks.titlePresent}`);
  critique.push(`- svg-placeholders: ${checks.svgPlaceholders}`);
  critique.push(`- code-fence-count: ${checks.codeFenceCount}`);
  critique.push(`- placeholder-loss: ${checks.placeholderLoss}`);
  critique.push(`- markdown-review: ${checks.markdownReview}`);
  critique.push(`- terminology-review: ${checks.terminologyReview}`);
  critique.push(`- readability-review: ${checks.readabilityReview}`);
  critique.push('');
  critique.push('## Agent Critique');
  critique.push('');
  critique.push('Compare the source and the draft, then fill in this section before revising the translation.');
  critique.push('');
  critique.push('- fidelity-review: pending agent review');
  critique.push('- terminology-review: pending agent review');
  critique.push('- title-review: pending agent review');
  critique.push('- fluency-review: pending agent review');
  critique.push('- missing-or-distorted-meaning: pending agent review');
  critique.push('- revision-plan: pending agent review');
  critique.push('');
  critique.push('Revise the translation and run the draft stage again if any item above still needs work.');
  critique.push('');
  return critique.join('\n');
}

export async function loadPreviousDraft(articleDir, articleFile) {
  try {
    const raw = await fs.readFile(articleFile(articleDir, '03-draft.md'), 'utf8');
    return raw.trim();
  } catch {
    return null;
  }
}

export function buildRevisionNotes({ title, checks, placeholderCount, translatedPath, changedSinceDraft, previousDraftExists }) {
  const warnings = countWarnings(checks);
  const lines = [
    '# Revision Notes',
    '',
    `- title: ${title}`,
    `- previous-draft-exists: ${previousDraftExists ? 'yes' : 'no'}`,
    `- changed-since-draft: ${previousDraftExists ? (changedSinceDraft ? 'yes' : 'no') : 'n/a'}`,
    `- restored-svg-placeholders: ${placeholderCount > 0 ? `yes (${placeholderCount})` : 'none'}`,
    `- verified-title-contract: ${checks.titlePresent}`,
    `- code-fence-check: ${checks.codeFenceCount}`,
    `- markdown-review: ${checks.markdownReview}`,
    `- terminology-review: ${checks.terminologyReview}`,
    `- readability-review: ${checks.readabilityReview}`,
    `- output-file: ${translatedPath}`,
    `- final-status: ${warnings > 0 ? 'published with warnings; manual review required' : 'published cleanly'}`,
    '',
  ];

  return lines.join('\n');
}
