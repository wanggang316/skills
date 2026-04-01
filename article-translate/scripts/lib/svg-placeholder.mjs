/**
 * svg-placeholder.mjs — SVG 占位符提取与还原
 *
 * 翻译流程中，内联 SVG 会被替换为占位符 @@SVG_001@@ 等，
 * 防止翻译引擎破坏 SVG 内容。翻译完成后再还原。
 */

const PLACEHOLDER_PREFIX = '@@SVG_';
const PLACEHOLDER_SUFFIX = '@@';

/**
 * 匹配 HTML 中的 <svg>...</svg> 和 <figure> 内含 SVG 的整块。
 * 也匹配 Markdown 中保留的内联 HTML SVG。
 */
const SVG_PATTERN = /<(?:figure[^>]*>[\s\S]*?<\/figure>|svg[\s\S]*?<\/svg>)/gi;

/**
 * 从文本中提取所有 SVG 块，替换为占位符。
 *
 * @param {string} text - 含 SVG 的 Markdown 或 HTML
 * @returns {{ text: string, placeholders: Record<string, string> }}
 *   - text: 替换后的文本
 *   - placeholders: { "@@SVG_001@@": "<svg>...</svg>", ... }
 */
export function extractSVGs(text) {
  const placeholders = {};
  let index = 0;

  const replaced = text.replace(SVG_PATTERN, (match) => {
    index++;
    const key = `${PLACEHOLDER_PREFIX}${String(index).padStart(3, '0')}${PLACEHOLDER_SUFFIX}`;
    placeholders[key] = match;
    return key;
  });

  return { text: replaced, placeholders };
}

/**
 * 将占位符还原为原始 SVG。
 *
 * @param {string} text - 含占位符的文本
 * @param {Record<string, string>} placeholders - extractSVGs 返回的映射
 * @returns {string}
 */
export function restoreSVGs(text, placeholders) {
  let result = text;
  for (const [key, svg] of Object.entries(placeholders)) {
    result = result.replaceAll(key, svg);
  }
  return result;
}

/**
 * 检测文本中是否包含 SVG 内容。
 *
 * @param {string} text
 * @returns {boolean}
 */
export function hasSVG(text) {
  const pattern = new RegExp(SVG_PATTERN.source, 'i');
  return pattern.test(text);
}
