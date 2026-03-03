# Bootstrap: New Tauri + Svelte Project

Create a new Tauri v2 + Svelte 5 desktop application from `assets/template.zip`. The generated project includes:

- **Frontend**: Svelte 5 + SvelteKit + Tailwind CSS
- **Backend**: Tauri v2 + Rust
- **Built-in Features**: Theme system, i18n support, auto-updater integration
- **Architecture**: Clean separation between frontend (`src/`) and backend (`src-tauri/`)
- **Examples**: Frontend-to-backend communication via Tauri commands

## Workflow

### Step 1: Collect Project Info

Use `AskUserQuestion` to collect the following three inputs in a single call:

- **project-name**: kebab-case identifier (e.g., `my-awesome-app`)
- **display-name**: App title shown in the window, supports Unicode (e.g., `My Awesome App` or `我的应用`)
- **package-name**: Reverse domain notation (e.g., `com.example.myapp`)

### Step 2: Extract Template Files

The skill directory is at `SKILL_DIR` (the directory containing SKILL.md).

Extract the template zip directly into the current working directory (the zip contains files at root level, no nested folder):

```bash
unzip -o SKILL_DIR/assets/template.zip -d .
```

### Step 3: Replace Placeholders with Edit Tool

Use the **Edit tool** (not sed) to replace placeholders in these files:

| File | Placeholder | Replace with |
|------|-------------|--------------|
| `package.json` | `project-name` | user's project-name |
| `src-tauri/Cargo.toml` | `project-name` | user's project-name |
| `src-tauri/tauri.conf.json` | `project-name` | user's project-name |
| `src-tauri/tauri.conf.json` | `com.package.name` | user's package-name |
| `src-tauri/tauri.conf.json` | `display-name` | user's display-name |
| `README.md` | `project-name` | user's project-name |
| `CONTRIBUTING.md` | `project-name` | user's project-name |
| `src/lib/i18n.ts` | `app.title` | user's display-name |

Read each file first, then apply all replacements with Edit. Use `replace_all: true` for any placeholder that appears multiple times in the same file.

### Step 4: Install Dependencies and Verify

Run the following commands in order. Fix any errors before proceeding to the next step.

```bash
npm install
npm run check
npm run tauri dev
```

**For each command**:
- If it succeeds, proceed to the next
- If it fails, read the error, fix the issue, and re-run until it passes

**When all three succeed**, proceed to Step 5.

### Step 5: Initialize Git Repository

```bash
git init
git add .
git commit -m "init"
```

**Done.** Inform the user the project is ready and the initial commit has been made.

## Template Placeholders Reference

| Placeholder | Description |
|-------------|-------------|
| `project-name` | kebab-case project identifier |
| `display-name` | Human-readable app title |
| `com.package.name` | Reverse-domain bundle identifier |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Rust toolchain not found | Install Rust from https://rustup.rs |
| Node.js version mismatch | Use Node.js 18+ |
| npm install fails | Delete `node_modules` and `package-lock.json`, then re-run |
| Build errors | Run `npm run check` to see detailed errors |
