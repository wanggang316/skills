# Markdown: Markdown Rendering

Add rich Markdown rendering to an existing Tauri v2 + Svelte 5 project. This includes syntax highlighting (light/dark), copy-to-clipboard for code blocks, and external link handling via the system browser.

**What gets installed:**
- `marked` — Markdown parser
- `marked-highlight` — highlight.js integration for marked
- `highlight.js` — syntax highlighting
- `@tauri-apps/plugin-opener` — open URLs in system browser
- `@tauri-apps/plugin-clipboard-manager` — copy code blocks to clipboard

## Workflow

### Step 1: Add Dependencies to `package.json`

Read `package.json`, then use the Edit tool to add the following entries to the `dependencies` object:

```json
"highlight.js": "^11.11.1",
"marked": "^17.0.1",
"marked-highlight": "^2.2.3",
"@tauri-apps/plugin-opener": "^2.5.3",
"@tauri-apps/plugin-clipboard-manager": "^2.3.2"
```

Preserve existing entries. Do not duplicate keys that already exist.

### Step 2: Add CSS Imports to `src/app.css`

Read `src/app.css`, then use the Edit tool to add the following two `@import` lines near the top of the file, after any existing `@import` statements:

```css
@import "highlight.js/styles/github.css";
@import "./lib/styles/highlight-dark.css";
```

### Step 3: Append Light-Mode Styles to `src/app.css`

Read `SKILL_DIR/assets/highlight-light.css`, then append its entire contents to the end of `src/app.css` using the Edit tool.

### Step 4: Copy Dark-Mode Highlight Theme

Ensure the target directory exists, then copy the dark theme file:

```bash
mkdir -p src/lib/styles
cp SKILL_DIR/assets/highlight-dark.css src/lib/styles/highlight-dark.css
```

### Step 5: Copy Markdown Utility

Ensure the target directory exists, then copy the markdown utility:

```bash
mkdir -p src/lib/utils
cp SKILL_DIR/assets/markdown.ts src/lib/utils/markdown.ts
```

### Step 6: Copy or Merge Browser and Tauri Utilities

Ensure the target directory exists:

```bash
mkdir -p src/lib/utils
```

For each file (`browser.ts` and `tauri.ts`), follow this logic:

- **If the file does not exist** → copy directly:
  ```bash
  cp SKILL_DIR/assets/browser.ts src/lib/utils/browser.ts
  cp SKILL_DIR/assets/tauri.ts src/lib/utils/tauri.ts
  ```

- **If the file already exists** → read both the existing file and the template from `SKILL_DIR/assets/`. Compare their exported functions. Use the Edit tool to add any functions from the template that are missing in the existing file. Do not overwrite or remove functions that already exist. Ensure the following exports are present after merging:

  **`browser.ts`** must export:
  - `openInBrowser(url: string): Promise<void>`

  **`tauri.ts`** must export:
  - `isTauriEnvironment(): boolean`
  - `ensureTauriEnvironment(): void`
  - `getTauriEnvironmentInfo(): object`
  - `resolveLocalAssetPath(path?: string): string`
  - `openPathInSystem(path: string): Promise<void>`

  Also ensure that any required imports (`@tauri-apps/plugin-opener`, etc.) are present at the top of the merged file.

### Step 7: Add Clipboard Permissions

Read the capabilities file at `src-tauri/capabilities/default.json` (try `defaults.json` if `default.json` does not exist). Locate the `permissions` array and add the following entries if they are not already present:

```json
"clipboard-manager:default",
"clipboard-manager:allow-write-text"
```

Use the Edit tool to insert them. Do not add duplicates.

### Step 8: Ask About Example Page

Use `AskUserQuestion` to ask:

> Do you want to add a Markdown example page at `src/routes/markdown-example/+page.svelte`?

Options:
- **Yes, add the example page** — generate a demo page
- **No, just show me how to use it** — print usage instructions

**If Yes:**

1. Read `SKILL_DIR/assets/example.md` to get the example Markdown content.
2. Create the directory and file `src/routes/markdown-example/+page.svelte` with the following structure:
   - A sticky `<header>` that stays at the top of the viewport, containing:
     - A back button on the left (uses `history.back()` or `goto('/')`)
     - A centered title: **"Markdown Example"**
   - A scrollable `<main>` section that renders the example Markdown content using `renderMarkdown` and `markdownInteractions`.
   - Wrap the rendered content in a `<div class="markdown-content">` so the styles from Step 3 apply.
   - The example Markdown content (from `example.md`) should be inlined as a template literal in the `<script>` block.

   Example structure:
   ```svelte
   <script lang="ts">
     import { renderMarkdown, markdownInteractions } from "$lib/utils/markdown";

     const content = `...paste example.md content here...`;
   </script>

   <header class="sticky top-0 z-10 flex items-center bg-base-100 px-4 py-3 border-b border-base-300">
     <button class="btn btn-ghost btn-sm" onclick={() => history.back()}>← Back</button>
     <h1 class="flex-1 text-center text-base font-semibold">Markdown Example</h1>
     <div class="w-16"></div>
   </header>

   <main class="p-6 max-w-3xl mx-auto">
     <div class="markdown-content" use:markdownInteractions>
       {@html renderMarkdown(content)}
     </div>
   </main>
   ```

**If No:**

Print the following usage instructions:

```ts
import { renderMarkdown, markdownInteractions } from "$lib/utils/markdown";
```

```svelte
<div class="markdown-content" use:markdownInteractions>
  {@html renderMarkdown(content)}
</div>
```

> `renderMarkdown(content)` converts a Markdown string to safe HTML.
> `markdownInteractions` is a Svelte action that handles copy-button clicks on code blocks and opens external links in the system browser.
> Wrap rendered content in `class="markdown-content"` to apply the bundled styles.

### Step 9: Verify and Fix

Run the following commands in order. Fix any errors before proceeding to the next.

```bash
npm install
```

```bash
npm run check
```

```bash
npm run tauri dev
```

**For each command:**
- If it succeeds, proceed to the next.
- If it fails, read the error output, fix the issue, and re-run until it passes.

**When all three succeed**, proceed to Step 10.

### Step 10: Summary

Inform the user that Markdown rendering has been configured successfully, covering:

- **Syntax highlighting**: light mode via `highlight.js/styles/github.css`, dark mode via `src/lib/styles/highlight-dark.css` (scoped to `[data-theme="dark"]`).
- **Copy to clipboard**: code blocks automatically include a copy button wired to the Tauri clipboard plugin.
- **External links**: clicks on `http://` and `https://` links open in the system browser via the opener plugin.
- **Usage reminder**: wrap rendered content in `class="markdown-content"` and attach the `use:markdownInteractions` action.
- **To update styles**: edit `src/lib/styles/highlight-dark.css` for dark mode or the appended section in `src/app.css` for light mode.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `highlight.js` styles not applied | Confirm `@import` lines are at the top of `src/app.css` before Tailwind directives |
| Dark mode highlighting not working | Confirm the root element sets `data-theme="dark"` when in dark mode |
| Copy button has no effect | Confirm `clipboard-manager` permissions are present in the capabilities file and `npm install` was re-run |
| External links open inside the app | Confirm `use:markdownInteractions` is attached to the wrapper element |
| Type errors in `markdown.ts` | Confirm `marked`, `marked-highlight`, and `highlight.js` are installed (`npm install`) |
| `openInBrowser` not found | Confirm `browser.ts` exists in `src/lib/utils/` and exports `openInBrowser` |
