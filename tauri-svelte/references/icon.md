# Icon: Replace App Icon

Replace the default Tauri app icon with a custom one. Tauri will automatically generate all required platform-specific icon sizes (macOS `.icns`, Windows `.ico`, Linux `.png`) from a single source image.

## Workflow

### Step 1: Prompt User to Prepare the Icon

Use `AskUserQuestion` to tell the user:

> Please prepare a **1024×1024 PNG** image named `app-icon.png` and place it in the **project root directory** (next to `package.json`). Click **Ready** when done.

Options:
- **Ready** — user has placed the icon file

**After the user responds:**

- Check whether `app-icon.png` exists in the current working directory.
  - If it exists → proceed to Step 2.
  - If it does **not** exist → inform the user the file was not found and ask them to place it before continuing.

### Step 2: Generate Platform Icons

Run the following command from the project root:

```bash
npm run tauri icon app-icon.png
```

This command reads `app-icon.png` and generates all platform-specific icons into `src-tauri/icons/`, replacing any existing icons.

- If it **succeeds** → proceed to Step 3.
- If it **fails** → read the error output, resolve the issue, and re-run until it passes.

### Step 3: Restart the App

Instruct the user to restart the application for the new icon to take effect:

```bash
npm run tauri dev
```

> On macOS, the Dock may cache the old icon. If the icon does not update immediately, run `killall Dock` in the terminal or restart the system.

### Step 4: Summary

Inform the user that the app icon has been updated successfully, covering:

- Icons were generated into `src-tauri/icons/` for all platforms (macOS, Windows, Linux).
- The source file `app-icon.png` can be kept in the project root for future updates.
- To update the icon again, simply replace `app-icon.png` and re-run `npm run tauri icon app-icon.png`.

## Requirements

| Property | Value |
|----------|-------|
| Filename | `app-icon.png` |
| Location | Project root (next to `package.json`) |
| Size | 1024×1024 pixels |
| Format | PNG (RGBA recommended for transparency) |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `app-icon.png` not found | Ensure the file is in the project root, not a subdirectory |
| Icon too small or wrong format | Must be exactly 1024×1024 PNG; convert with an image editor if needed |
| Old icon still shown on macOS | Run `killall Dock` to clear the Dock icon cache |
| Old icon still shown on Windows | Log out and back in, or restart Explorer to clear the icon cache |
| Command `tauri icon` not recognized | Ensure `@tauri-apps/cli` is installed; run `npm install` first |
