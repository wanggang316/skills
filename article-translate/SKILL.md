---
name: article-translate
description: "Translate web articles, blog posts, essays, and technical posts from a URL into polished Chinese Markdown files. Use this skill whenever the user asks things like '翻译这篇文章', '翻译一下这个链接', '把这个网页翻成中文', 'translate this post', or wants a serious article translation saved as files."
---

# Article Translate

Translate a high-quality article from a URL into polished Chinese Markdown files.

## When To Use This Skill

Use this skill when the user wants to:

- translate an article from a URL
- translate a blog post, essay, or technical post into Chinese
- save the translation as local files
- fetch an article first and then translate it

Do not use this skill for:

- translating a short paragraph directly in chat
- explaining a single sentence or phrase
- non-article writing tasks

## Workflow

### 1. Prepare

Check the local environment first:

```bash
node article-translate/scripts/prepare-workspace.mjs
```

If `articrab` is missing, guide the user to run:

```bash
npm install -g articrab
articrab set-jina-token jina_xxx
```

If the Jina token is missing, STOP and call `AskUserQuestion` to ask the user to either:

- provide an existing Jina token
- or go to the official Jina site to apply for one

After the user provides the token, run:

```bash
articrab set-jina-token <token>
```

Help the user complete the configuration before continuing.

Do not assume token setup is correct until fetching succeeds.

### 2. Fetch

If the user provided a URL, fetch the article:

```bash
node article-translate/scripts/fetch-article.mjs "<url>" --out "<workspace-root>"
```

This creates an article directory and writes the source files needed for translation.

### 3. Analyze And Build Prompt

Build the analysis and translation prompt:

```bash
node article-translate/scripts/build-translation-prompt.mjs --article-dir "<article-dir>" --lang zh
```

Do not translate directly from `source.md`.

If the user already has an article directory with `source.clean.md`, resume here instead of fetching again.

### 4. Translate And Review

Read `translate.<lang>.prompt.txt`, translate the article, and review the draft yourself before applying it.

The draft must:

- start with a translated H1 title using `# `
- leave one blank line after the title
- preserve Markdown structure
- keep code blocks, commands, URLs, and file paths unchanged
- preserve generated placeholders unchanged when they appear

Review the draft for:

- terminology consistency
- title quality
- fluency in Chinese
- missing or distorted meaning
- Markdown integrity

### 5. Apply

Write the final translation:

```bash
node article-translate/scripts/apply-translation.mjs --article-dir "<article-dir>" --lang zh --in /path/to/translated.md
```

This writes the final `<lang>.md`.

## Output

Each article directory should contain:

- `source.md`
- `meta.json`
- `source.clean.md`
- `glossary.json`
- `01-analysis.md`
- `02-prompt.md`
- `03-draft.md`
- `04-critique.md`
- `05-revision.md`
- `quality-report.json`
- `<lang>.md`

## Failure Handling

If environment setup fails:

- install `articrab`
- configure the Jina token
- rerun `prepare-workspace.mjs`

If fetch fails:

- confirm the URL is reachable
- confirm `articrab` works in the shell
- confirm the Jina token is valid

If apply fails:

- check that the draft still contains every required placeholder
- check that the draft still starts with a Markdown H1
- fix the draft and rerun apply

Do not skip failed stages. Resume from the last valid file.

## Translation Rules

Always:

- translate the title
- preserve Markdown headings, lists, quotes, tables, and links
- keep code blocks, commands, URLs, file paths, and API names unchanged
- keep generated placeholders unchanged when they appear
- write critique and revision notes before applying the final file

## Examples

**Example 1**

Input: `翻译一下这个链接：https://openai.com/index/harness-engineering/`

Behavior: run the full workflow from prepare to final `zh.md`.

**Example 2**

Input: `把这篇博客翻成中文，不要只在对话里给我一段翻译，我要文件：https://martinfowler.com/articles/agentic-ai.html`

Behavior: fetch the article, build prompt files, translate, review, and write the final files.

**Example 3**

Input: `这篇文章已经抓好了，继续做中文翻译：/path/to/article-dir`

Behavior: resume from the existing article directory, skip fetch, and continue with analysis, translation, review, and apply.
