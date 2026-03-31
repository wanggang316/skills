#!/usr/bin/env node

import fs from 'node:fs/promises';
import {
  articleFile,
  collectCodeFenceInfos,
  estimateWords,
  readJson,
  splitMarkdownIntoChunks,
  stripFrontmatter,
} from './lib/workflow-utils.mjs';

function usage() {
  console.log('Usage: node article-translate/scripts/build-translation-prompt.mjs --article-dir "<article-dir>" [--lang zh]');
}

function argValue(args, key, fallback = null) {
  const index = args.indexOf(key);
  if (index >= 0 && index + 1 < args.length) return args[index + 1];
  return fallback;
}

function classifyTopic(markdown) {
  const source = String(markdown || '').toLowerCase();
  const technology = ['api', 'cli', 'agent', 'prompt', 'code', 'javascript', 'typescript', 'python', 'deploy'];
  const business = ['revenue', 'market', 'pricing', 'sales', 'strategy', 'founder', 'customer'];
  const life = ['family', 'habit', 'health', 'travel', 'career', 'life', 'friend'];

  const count = (words) => words.reduce((sum, word) => sum + (source.includes(word) ? 1 : 0), 0);
  const scores = {
    technology: count(technology),
    business: count(business),
    life: count(life),
  };

  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] || 'general';
}

function deriveAudience(topic) {
  if (topic === 'technology') return 'engineers';
  if (topic === 'business') return 'operators and managers';
  if (topic === 'life') return 'general readers';
  return 'general readers';
}

function deriveStyle(topic) {
  if (topic === 'technology') return 'technical but readable';
  if (topic === 'business') return 'concise and analytical';
  if (topic === 'life') return 'natural and conversational';
  return 'accurate and readable';
}

function extractGlossary(markdown) {
  const source = String(markdown || '');
  const set = new Set();

  for (const match of source.matchAll(/`([^`\n]+)`/g)) {
    const term = match[1].trim();
    if (term) set.add(term);
  }

  for (const match of source.matchAll(/\b[A-Z][A-Za-z0-9_-]{1,}\b/g)) {
    const term = match[0].trim();
    if (term.length >= 3) set.add(term);
  }

  return [...set].slice(0, 40).map((term) => ({
    source: term,
    guidance: /^(https?:|\/|\.\/|\.\.\/|[A-Z0-9_/-]+$)/.test(term) ? 'keep-verbatim' : 'stabilize-term',
  }));
}

function detectRisks(markdown, sanitizeReport = {}) {
  const source = String(markdown || '');
  const risks = [];

  if (sanitizeReport.svgPlaceholders > 0) risks.push('Contains inline SVG placeholders that must remain unchanged.');
  if ((sanitizeReport.codeFenceCount || 0) > 0) risks.push('Contains fenced code blocks; commands and code must remain verbatim.');
  if ((sanitizeReport.tableLineCount || 0) > 0) risks.push('Contains Markdown tables; preserve cell structure and separators.');
  if (estimateWords(source) > 2200) risks.push('Long article; translate in structural chunks but keep terminology consistent.');
  if ((collectCodeFenceInfos(source).length || 0) % 2 === 1) risks.push('Odd number of code fences detected; verify Markdown integrity carefully.');
  if (/@@FIGURE_SVG_\d{3}@@/.test(source)) risks.push('Placeholder loss would break article rendering.');

  return risks;
}

function renderAnalysis({ title, sourceUrl, topic, audience, style, glossary, risks, chunks }) {
  const lines = [
    '# Analysis Notes',
    '',
    `- sourceTitle: ${title || 'unknown'}`,
    `- sourceUrl: ${sourceUrl || 'unknown'}`,
    `- topic: ${topic}`,
    `- audience: ${audience}`,
    `- style: ${style}`,
    `- chunkCount: ${chunks.length}`,
    `- titleStrategy: 优先准确表达核心论点，其次保持中文可读性。`,
    '',
    '## Stable Terms',
    '',
  ];

  if (glossary.length === 0) {
    lines.push('- none');
  } else {
    for (const item of glossary) lines.push(`- ${item.source}: ${item.guidance}`);
  }

  lines.push('', '## Risks', '');
  if (risks.length === 0) {
    lines.push('- none');
  } else {
    for (const risk of risks) lines.push(`- ${risk}`);
  }

  return lines.join('\n') + '\n';
}

function renderPrompt({ title, sourceUrl, lang, topic, audience, style, glossary, risks, chunks, markdown }) {
  const langName = lang === 'zh' ? '简体中文' : lang;
  const lines = [
    `你是一个高级翻译编辑。请把下面的 Markdown 文章翻译成${langName}。`,
    '',
    '[Article Translation Contract]',
    '- 这是固定全链路流程：分析 -> 翻译 -> 自我审校 -> 修订。',
    `- topic: ${topic}`,
    `- audience: ${audience}`,
    `- style: ${style}`,
    `- sourceTitle: ${title || 'unknown'}`,
    `- sourceUrl: ${sourceUrl || 'unknown'}`,
    `- chunkCount: ${chunks.length}`,
    '',
    '硬性要求：',
    '- 保留 Markdown 结构，包括标题、列表、引用、表格和链接。',
    '- 代码块、命令、URL、文件路径、环境变量、API 名称保持原样。',
    '- 任何形如 @@FIGURE_SVG_001@@ 的占位符必须原样保留，不得改写、删除或移动。',
    '- 必须翻译标题：最终结果第一行是一个 H1 标题，以 "# " 开头。',
    '- 第一行标题后空一行，再输出正文。',
    '- 只输出最终修订后的译文，不要输出分析过程，不要加解释。',
    '',
    '术语约束：',
  ];

  if (glossary.length === 0) {
    lines.push('- 无强制术语表，但专有名词必须稳定。');
  } else {
    for (const item of glossary) lines.push(`- ${item.source}: ${item.guidance}`);
  }

  lines.push('', '风险提醒：');
  if (risks.length === 0) {
    lines.push('- 无额外风险。');
  } else {
    for (const risk of risks) lines.push(`- ${risk}`);
  }

  if (chunks.length > 1) {
    lines.push('', '长文处理：');
    lines.push('- 先按结构块完成翻译，再统一术语与语气，最后合并成一份完整译文。');
  }

  lines.push('', '---', markdown.trim());
  return lines.join('\n') + '\n';
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    usage();
    process.exit(args.length === 0 ? 2 : 0);
  }

  const articleDir = argValue(args, '--article-dir');
  const lang = argValue(args, '--lang', 'zh');
  if (!articleDir) throw new Error('Missing --article-dir');

  const cleanSourcePath = articleFile(articleDir, 'source.clean.md');
  const sourceRaw = await fs.readFile(cleanSourcePath, 'utf8');
  const sanitizeReport = await readJson(articleFile(articleDir, 'sanitize-report.json'), {});
  const { data, content } = stripFrontmatter(sourceRaw);

  const topic = classifyTopic(content);
  const audience = deriveAudience(topic);
  const style = deriveStyle(topic);
  const glossary = extractGlossary(content);
  const chunks = splitMarkdownIntoChunks(content, 2200);
  const risks = detectRisks(content, sanitizeReport);

  const analysis = renderAnalysis({
    title: data.title,
    sourceUrl: data.sourceUrl,
    topic,
    audience,
    style,
    glossary,
    risks,
    chunks,
  });

  const prompt = renderPrompt({
    title: data.title,
    sourceUrl: data.sourceUrl,
    lang,
    topic,
    audience,
    style,
    glossary,
    risks,
    chunks,
    markdown: content,
  });

  await fs.writeFile(articleFile(articleDir, '01-analysis.md'), analysis, 'utf8');
  await fs.writeFile(articleFile(articleDir, `02-translate.${lang}.prompt.txt`), prompt, 'utf8');

  console.log(
    JSON.stringify(
      {
        ok: true,
        articleDir,
        analysisPath: articleFile(articleDir, '01-analysis.md'),
        promptPath: articleFile(articleDir, `02-translate.${lang}.prompt.txt`),
        chunkCount: chunks.length,
        topic,
        audience,
        style,
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
