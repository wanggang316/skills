# Tray: System Tray Configuration

Add a system tray icon with menu to an existing Tauri v2 + Svelte 5 project.

## Workflow

### Step 1: Prompt User to Prepare Tray Icon

Use `AskUserQuestion` to tell the user:

> Please prepare a **32×32 transparent PNG** icon named `logo-tray-32.png` and place it in `src-tauri/icons/`. Click **Ready** when done, or **Skip (use default)** to continue with a placeholder icon.

Options:
- **Ready** — user has placed the icon
- **Skip (use default)** — use the bundled placeholder icon

**After the user responds:**

- If **Ready**: check whether `src-tauri/icons/logo-tray-32.png` exists.
  - If it exists → proceed to Step 2.
  - If it does **not** exist → copy the placeholder icon from `SKILL_DIR/assets/logo-tary-32.png`:
    ```bash
    cp SKILL_DIR/assets/logo-tary-32.png src-tauri/icons/logo-tray-32.png
    ```
    Inform the user the placeholder was copied, and continue to Step 2.
- If **Skip**: copy the placeholder icon the same way, then continue.

### Step 2: Add `tray-icon` Feature to Cargo.toml

Read `src-tauri/Cargo.toml` and locate the `tauri` dependency line. Add `"tray-icon"` to its `features` list.

Before (example):
```toml
tauri = { version = "2", features = ["..."] }
```

After (add `tray-icon` to the existing features, do not duplicate existing entries):
```toml
tauri = { version = "2", features = ["...", "tray-icon"] }
```

Use the **Edit tool** to make this change.

### Step 3: Copy Tray Template to Source

Copy `SKILL_DIR/assets/tray.rs` into the project's Rust source directory:

```bash
cp SKILL_DIR/assets/tray.rs src-tauri/src/tray.rs
```

### Step 4: Register Tray in `main.rs`

Read `src-tauri/src/main.rs` first, then apply both changes with the Edit tool.

**4a. Add module declaration and import** — place these lines near the top of the file, after existing `mod` and `use` statements:

```rust
mod tray;

use tray::setup_tray;
```

**4b. Call `setup_tray` inside `.setup`** — locate the `.setup(|app| {` closure body and add the following call inside it (after any existing setup logic):

```rust
// Setup tray icon and menu
if let Err(e) = setup_tray(app.handle()) {
    eprintln!("Failed to setup tray: {}", e);
}
```

### Step 5: Verify and Fix

Run the following commands in order. Fix any errors before proceeding to the next.

```bash
npm run check
```

```bash
npm run tauri dev
```

**For each command:**
- If it succeeds, proceed to the next.
- If it fails, read the error, fix the issue, and re-run until it passes.

**When both succeed**, proceed to Step 6.

### Step 6: Summary

Inform the user that the system tray has been configured successfully, covering:

- What was set up: tray icon, tray menu (Open / Do Something / Quit), click handlers.
- How to customize menu items: edit `src-tauri/src/tray.rs`.
- **Icon replacement reminder**: To use a custom tray icon, replace `src-tauri/icons/logo-tray-32.png` with a 32×32 transparent PNG of their own, then rebuild the app.
