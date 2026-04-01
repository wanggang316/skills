#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { extractSVGs } from './lib/svg-placeholder.mjs';
import {
  articleFile,
  collectCodeFenceInfos,
  countPattern,
  ensureDir,
  normalizeSvgPlaceholderIds,
  stripFrontmatter,
  toPlaceholderList,
  writeJson,
} from './lib/workflow-utils.mjs';

const execFileAsync = promisify(execFile);

function usage() {
  console.log('Usage: node article-translate/scripts/fetch-article.mjs "<url>" --out "<workspace-root>"');
}

function argValue(args, key, fallback = null) {
  const index = args.indexOf(key);
  if (index >= 0 && index + 1 < args.length) return args[index + 1];
  return fallback;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    usage();
    process.exit(args.length === 0 ? 2 : 0);
  }

  const url = args[0];
  const outRoot = path.resolve(argValue(args, '--out', '.'));

  await ensureDir(outRoot);

  const { stdout, stderr } = await execFileAsync('articrab', [url, '--output', outRoot], {
    timeout: 120000,
    maxBuffer: 10 * 1024 * 1024,
  }).catch((error) => {
    const message = [error.stderr, error.stdout, error.message].filter(Boolean).join('\n');
    throw new Error(`articrab fetch failed.\n${message}`.trim());
  });

  if (stderr) process.stderr.write(stderr);

  const result = JSON.parse(String(stdout || '{}').trim());
  const articleDir = path.resolve(result.dir || '');
  if (!articleDir) throw new Error('articrab did not return an output directory');

  const sourcePath = articleFile(articleDir, 'source.md');
  const metaPath = articleFile(articleDir, 'meta.json');

  const sourceRaw = await fs.readFile(sourcePath, 'utf8');
  const { data: frontmatter, content } = stripFrontmatter(sourceRaw);
  const extracted = extractSVGs(content);
  const normalized = normalizeSvgPlaceholderIds(extracted.text, extracted.placeholders);
  const cleanSource = sourceRaw.includes('\n---\n')
    ? sourceRaw.replace(content, normalized.markdown)
    : normalized.markdown;

  const sanitizeReport = {
    articleDir,
    sourcePath,
    metaPath,
    sourceUrl: frontmatter.sourceUrl || null,
    title: frontmatter.title || result.title || null,
    svgPlaceholders: Object.keys(normalized.placeholders).length,
    placeholderIds: Object.keys(normalized.placeholders),
    codeFenceCount: collectCodeFenceInfos(normalized.markdown).length,
    tableLineCount: countPattern(normalized.markdown, /^\|.+\|\s*$/gm),
    blockquoteCount: countPattern(normalized.markdown, /^>\s+/gm),
    listItemCount: countPattern(normalized.markdown, /^\s*(?:-|\*|\d+\.)\s+/gm),
    generatedAt: new Date().toISOString(),
  };

  await fs.writeFile(articleFile(articleDir, 'source.clean.md'), cleanSource, 'utf8');
  await writeJson(articleFile(articleDir, 'inline-svg.placeholders.json'), toPlaceholderList(normalized.placeholders));
  await writeJson(articleFile(articleDir, 'sanitize-report.json'), sanitizeReport);

  console.log(
    JSON.stringify(
      {
        ok: true,
        url,
        articleDir,
        sourcePath,
        cleanSourcePath: articleFile(articleDir, 'source.clean.md'),
        placeholdersPath: articleFile(articleDir, 'inline-svg.placeholders.json'),
        sanitizeReportPath: articleFile(articleDir, 'sanitize-report.json'),
        svgPlaceholders: sanitizeReport.svgPlaceholders,
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
