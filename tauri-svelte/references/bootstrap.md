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
unzip -o SKILL_DIR/assets/template.zip -d . -x "__MACOSX/*" "*.DS_Store"
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

**When running `npm run tauri dev`**:
- Run it in the background and monitor the log output
- **Timeout: wait at most 120 seconds** for a success or error signal — do not loop indefinitely
- The app launches successfully when the log contains `ready in` or `Local: http://localhost:5173`
- If an obvious error appears in the log (e.g., `error[E`, `FAILED`, `cannot find`) before the timeout, stop early and fix it
- After the timeout, check whether the process is still alive:
  ```bash
  lsof -ti tcp:5173
  ```
  - If the port is occupied → assume the app started successfully and proceed
  - If the port is not occupied → the process likely crashed; read the log tail for errors and fix them
- When you need to stop the process, kill both the Tauri process **and** the Vite dev server on port 5173:
  ```bash
  kill $(lsof -ti tcp:5173) 2>/dev/null; pkill -f "tauri dev" 2>/dev/null
  ```

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
