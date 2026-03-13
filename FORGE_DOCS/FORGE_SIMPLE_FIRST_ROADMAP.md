# FORGE - Simple First Roadmap (Scan + Synthesis)

Date: 2026-03-05
Workspace: O:\FORGE\forge_app

## Goal
Build FORGE fast without creating tool conflict ("two systems fighting"), while preserving a clean path to deep integration.

## Core Principle (Anti-Fighting Rule)
1. Obsidian remains source-of-truth for vault content.
2. FORGE is the orchestrator shell (AI, launchers, automation, views).
3. FORGE should edit vault notes either:
   - directly through file APIs when Obsidian is closed, OR
   - through Obsidian Local REST API / Advanced URI when Obsidian is active.
4. Never run two independent write pipelines to the same note without lock/queue.

## High-Confidence Reuse Targets (GitHub / Docs)
- `assistant-ui/assistant-ui` (React chat primitives) for faster TypingMind-style UX.
- `pacocoursey/cmdk` for a powerful command palette (/open, /app, /agent, /workspace).
- `bvaughn/react-resizable-panels` for stable 2/3/4 pane workspace layouts.
- `clauderic/dnd-kit` for drag reorder of dock items, quick places, and chat folders.
- `coddingtonbear/obsidian-local-rest-api` + `Vinzent03/obsidian-advanced-uri` for Obsidian bridge.
- Tauri plugins: `store`, `window-state`, `single-instance`, `global-shortcut` for app-shell reliability.

## What We Already Have (Good Foundation)
- Multi-launcher dock (`internal`, `url`, `path`) with persistence and context menu.
- AI workspace scaffold with provider switching.
- Quick Places + global appearance settings.

## Fast-Win Sequence (Recommended)

### Phase 1 (1-2 days): Stability + Navigation
- Add Tauri `single-instance` to avoid duplicate app sessions.
- Add Tauri `window-state` so layouts persist naturally.
- Add `cmdk` command palette with:
  - open notebook
  - open quick place
  - run launcher
  - switch AI provider

### Phase 2 (2-3 days): Real TypingMind Feel
- Add chat folders + pinned chats + prompt snippets.
- Use `assistant-ui` primitives instead of hand-rolling advanced chat UX.
- Add drag reorder via `dnd-kit` for:
  - chat folders
  - dock icons
  - quick places

### Phase 3 (2-4 days): Obsidian Bridge (No Fighting)
- Integrate Obsidian Local REST API for note operations when Obsidian is open.
- Use Advanced URI for deep links (open workspace/file/heading in Obsidian).
- Introduce a write-mode toggle:
  - `Forge Direct`
  - `Via Obsidian API`
- Add "active writer" indicator in status bar.

### Phase 4 (later, deeper)
- Multi-agent runtime with queued jobs + background tasks.
- MCP server strategy and hardening.
- Unified memory graph and cross-module provenance.

## Integration Boundary (Important)
Define one interface for note operations so we can swap backends cleanly:
- `listNotes()`
- `readNote(path)`
- `writeNote(path, content, mode)`
- `patchNote(path, patchSpec)`
- `openInObsidian(path, heading?)`

Implementations:
- `FileSystemNoteGateway` (current)
- `ObsidianRestNoteGateway` (next)

## Decision Rules
- If a feature can be shipped in <1 day and improves daily flow, do it now.
- If a feature adds architecture risk, add an interface first, then implement.
- If a feature touches vault writes, run through single-writer guardrail.

## Immediate Next Build Ticket (Best ROI)
1. Command palette with `cmdk`.
2. Chat folders + prompt snippets.
3. Obsidian bridge skeleton (read/list first, write later).

