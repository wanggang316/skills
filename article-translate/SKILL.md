---
name: article-translate
description: "Translate web articles, blog posts, essays, and technical posts from a URL into Chinese Markdown files. Use this skill only when the user explicitly asks to translate, with requests like '翻译这篇文章', '翻译一下这个链接', '把这个网页翻成中文', 'translate this post', or asks to continue translating an existing article directory. Do not trigger this skill for a bare URL alone without translation intent."
---

# Article Translate

Translate a high-quality article from a URL into polished Chinese Markdown files.

## When To Use This Skill

Use this skill when the user wants to:

- translate an article from a URL with explicit translation intent
- translate a blog post, essay, or technical post into Chinese
- fetch an article and translate it
- continue translating an existing article directory

Do not use this skill for:

- a bare URL without words that mean translate, such as `翻译`, `翻成中文`, or `translate`
- requests to open, read, summarize, explain, or analyze a URL without asking for translation
- translating a short paragraph directly in chat
- explaining a single sentence or phrase
- non-article writing tasks

## Workflow

The skill directory is at `SKILL_DIR` (the directory containing `SKILL.md`).

### 1. Prepare

Check the local environment first:

```bash
node SKILL_DIR/scripts/prepare-workspace.mjs
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
node SKILL_DIR/scripts/fetch-article.mjs "<url>" --out "<workspace-root>"
```

This creates an article directory and writes the source files needed for translation.

### 3. Analyze And Build Prompt

Build the analysis and translation prompt:

```bash
node SKILL_DIR/scripts/build-translation-prompt.mjs --article-dir "<article-dir>" --lang zh
```

Do not translate directly from `source.md`.

If the user already has an article directory with `source.clean.md`, resume here instead of fetching again.

### 4. Translate

Read `02-translate.<lang>.prompt.txt` and write a first complete draft of the translation.

The draft must:

- start with a translated H1 title using `# `
- leave one blank line after the title
- preserve Markdown structure
- keep code blocks, commands, URLs, and file paths unchanged
- preserve generated placeholders unchanged when they appear

Write this draft to `03-draft.md`.

### 5. Critique Draft

Generate critique notes for `03-draft.md`:

```bash
node SKILL_DIR/scripts/stage-draft.mjs --article-dir "<article-dir>" --lang zh
```

This writes:

- `04-critique.md`

The script writes the deterministic checks. Then the Agent must read the source and the draft, and complete the `## Agent Critique` section inside `04-critique.md`.
Replace every `pending agent review` line with a concrete review result, then set `review-decision` to `revise` or `pass`.

The critique should cover:

- terminology consistency
- title quality
- fluency in Chinese
- missing or distorted meaning
- Markdown integrity

### 6. Revise And Repeat

Read `04-critique.md` and decide based on its contents:

- If `review-decision: pass`, continue to `Apply Final`.
- If there are problems, revise `03-draft.md` and run `Critique Draft` again.

Do not regenerate the draft from scratch, and do not publish until the critique issues are resolved.
Do not run `Apply Final` while `04-critique.md` still contains any `pending agent review` placeholder.

### 7. Apply Final

After critique issues are resolved, apply the revised `03-draft.md` as the final translation:

```bash
node SKILL_DIR/scripts/apply-final.mjs --article-dir "<article-dir>" --lang zh --path-only
```

This writes:

- `05-revision.md`
- `06-quality-report.json`
- final `<lang>.md`

After `Apply Final` succeeds, respond with the absolute path of the translated file only.
Do not add status text, bullets, summaries, explanations, or any other surrounding text.
Do not describe the generated files.

## Output

Each article directory should contain these source files:

- `source.md`
- `meta.json`
- `source.clean.md`

And these workflow files:

- `01-analysis.md`
- `02-translate.<lang>.prompt.txt`
- `03-draft.md`
- `04-critique.md`
- `05-revision.md`
- `06-quality-report.json`
- `<lang>.md`

## Failure Handling

If environment setup fails:

- install `articrab`
- configure the Jina token
- rerun the prepare command above

If fetch fails:

- confirm the URL is reachable
- confirm `articrab` works in the shell
- confirm the Jina token is valid

If draft staging or final apply fails:

- check that the draft still contains every required placeholder
- check that the draft still starts with a Markdown H1
- check that `04-critique.md` no longer contains `pending agent review`
- check that `04-critique.md` ends with `review-decision: pass`
- fix the draft and rerun the appropriate stage

Do not skip failed stages. Resume from the last valid file.

## Translation Rules

Always:

- translate the title
- preserve Markdown headings, lists, quotes, tables, and links
- keep code blocks, commands, URLs, file paths, and API names unchanged
- keep generated placeholders unchanged when they appear
- translate the title instead of copying the English title unchanged
- write critique and revision notes before applying the final file

## Examples

**Example 1**

Input: `翻译 https://openai.com/index/harness-engineering/`

Behavior: run the full workflow from prepare to final `zh.md`.
Final response: output only the absolute path to `zh.md`.

**Example 2**

Input: `把这篇文章翻成中文：https://martinfowler.com/articles/agentic-ai.html`

Behavior: fetch the article, build the translation prompt file, write a draft, critique it, revise it as needed, and then apply the final files.
Final response: output only the absolute path to the translated file.

**Example 3**

Input: `https://openai.com/index/harness-engineering/`

Behavior: do not use this skill, because a bare URL alone does not express translation intent.
