---
name: tauri-svelte
description: Tauri v2 + Svelte 5 project toolkit. Bootstraps new projects and provides capabilities for icon replacement, system tray configuration, auto-updater setup, and Markdown rendering.
---

# Tauri Svelte Skill

## What This Skill Does

A toolkit for Tauri v2 + Svelte 5 desktop application development. Covers the full lifecycle from project initialization to feature integration.

## Capabilities

| Capability | Trigger keywords | Reference |
|---|---|---|
| **Bootstrap** | "新建项目", "初始化", "create project", "bootstrap" | [references/bootstrap.md](references/bootstrap.md) |
| **Icon** | "换图标", "replace icon", "app icon" | [references/icon.md](references/icon.md) |
| **Tray** | "托盘", "tray", "system tray" | [references/tray.md](references/tray.md) |
| **Updater** | "自动更新", "updater", "auto update", "升级配置" | [references/updater.md](references/updater.md) |
| **Markdown** | "markdown 渲染", "render markdown", "md preview" | [references/markdown.md](references/markdown.md) |

## When to Use

- User wants to **create a new** Tauri + Svelte desktop app → Bootstrap
- User wants to **replace the app icon** → Icon
- User wants to **add or configure system tray** → Tray
- User wants to **configure the auto-updater** → Updater
- User wants to **render Markdown content** in the app → Markdown

## How to Use

1. Identify which capability the user needs based on their request and the trigger keywords above.
2. Read the corresponding reference file in `references/` for the step-by-step workflow.
3. Follow the workflow in that reference file exactly.

If the request spans multiple capabilities (e.g., bootstrap + tray), handle them sequentially in logical order.
