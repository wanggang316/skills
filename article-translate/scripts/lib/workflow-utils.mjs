import fs from 'node:fs/promises';
import path from 'node:path';

export function stripFrontmatter(markdown) {
  const source = String(markdown || '');
  if (!source.startsWith('---\n')) return { data: {}, content: source };

  const end = source.indexOf('\n---\n', 4);
  if (end < 0) return { data: {}, content: source };

  const raw = source.slice(4, end).trim();
  const data = {};
  for (const line of raw.split('\n')) {
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim().replace(/^"(.*)"$/, '$1');
    if (key) data[key] = value;
  }

  return {
    data,
    content: source.slice(end + 5),
  };
}

export function toPlaceholderList(placeholders) {
  return Object.entries(placeholders || {}).map(([id, html]) => ({ id, html }));
}

export function fromPlaceholderList(placeholders = []) {
  const map = {};
  for (const item of placeholders) {
    if (!item || !item.id) continue;
    map[item.id] = String(item.html || '');
  }
  return map;
}

export function normalizeSvgPlaceholderIds(markdown, placeholders = {}) {
  let next = String(markdown || '');
  const normalized = {};
  let index = 0;

  for (const [legacyId, html] of Object.entries(placeholders)) {
    index += 1;
    const targetId = `@@FIGURE_SVG_${String(index).padStart(3, '0')}@@`;
    normalized[targetId] = html;
    next = next.split(legacyId).join(targetId);
  }

  return {
    markdown: next,
    placeholders: normalized,
  };
}

export function countPattern(text, pattern) {
  const matches = String(text || '').match(pattern);
  return matches ? matches.length : 0;
}

export function estimateWords(text) {
  return String(text || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean).length;
}

export function collectCodeFenceInfos(markdown) {
  const lines = String(markdown || '').split(/\r?\n/);
  const fences = [];

  for (const line of lines) {
    const match = line.match(/^```([^\s`]*)/);
    if (!match) continue;
    fences.push(match[1] || '');
  }

  return fences;
}

export function splitMarkdownIntoChunks(markdown, maxWords = 2200) {
  const source = String(markdown || '').trim();
  if (!source) return [];

  const sections = source.split(/\n(?=# )|\n(?=## )|\n(?=### )/g);
  const chunks = [];
  let current = [];
  let currentWords = 0;

  for (const section of sections) {
    const words = estimateWords(section);

    if (current.length > 0 && currentWords + words > maxWords) {
      chunks.push(current.join('\n').trim());
      current = [section];
      currentWords = words;
      continue;
    }

    current.push(section);
    currentWords += words;
  }

  if (current.length > 0) chunks.push(current.join('\n').trim());

  return chunks.map((chunk, index) => ({
    index: index + 1,
    wordCount: estimateWords(chunk),
    markdown: chunk,
  }));
}

export async function readJson(filePath, fallback = null) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export async function writeJson(filePath, value) {
  await fs.writeFile(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

export async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

export function articleFile(dir, name) {
  return path.join(path.resolve(dir), name);
}

export function buildTranslatedMarkdown({ title, body, lang, sourceUrl, date }) {
  const safeTitle = String(title || '').replace(/"/g, '\\"');
  const frontmatter = [
    '---',
    `title: "${safeTitle}"`,
    date ? `date: ${date}` : null,
    sourceUrl ? `sourceUrl: ${sourceUrl}` : null,
    lang ? `lang: ${lang}` : null,
    '---',
    '',
  ].filter(Boolean).join('\n');

  return `${frontmatter}${String(body || '').trim()}\n`;
}
