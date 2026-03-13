# FORGE Plugin Platform Architecture (Draft v0.1)

Date: 2026-03-05
Owner: FORGE Core

## Mission
Create a plugin system for FORGE that is as extensible as Obsidian, but safer for automation and AI workflows.

## North-Star Outcome
A developer can:
1. Build a plugin using a small SDK.
2. Drop it into a `plugins/` folder (or install from registry).
3. Enable it in FORGE Settings.
4. See new commands, panels, dock actions, or automations immediately.

No app rebuild required for UI-level plugins.

---

## Design Constraints
- Must not let plugins fight over note writes.
- Must support local-first workflows.
- Must work with Tauri v2 security model.
- Must allow permission-scoped capabilities.
- Must be stable across FORGE upgrades.

---

## Core Architecture

### 1) Extension Host (separate from core UI)
Run plugin code in an isolated host layer:
- Frontend plugins: sandboxed runtime (Web Worker / iframe / isolated ES module loader).
- Backend actions: mediated through FORGE command bridge (no direct unrestricted Rust calls).

Why: isolation + recoverability + clear permissions.

### 2) Capability-Based API (not raw internal access)
Plugins request explicit capabilities in manifest:
- `notes.read`
- `notes.write`
- `vault.search`
- `ai.chat`
- `ai.context.read`
- `ui.panel.register`
- `ui.command.register`
- `launcher.open`
- `files.open_path`
- `network.http` (opt-in, domain allowlist)

FORGE user approves capabilities at install time.

### 3) Single-Writer Guardrail
All note writes pass through `NoteGateway` queue:
- queue + lock + conflict strategy.
- source labels (`core`, `plugin:<id>`, `agent:<id>`).
- audit log entry per write.

This prevents Obsidian/FORGE/plugin collisions.

### 4) Stable Plugin Contract
Define a versioned plugin API contract (`forgeApiVersion`).
- Backward compatibility window (e.g., support N-1 major).
- Compatibility check at load time.

---

## Plugin Package Shape

```text
plugins/
  my-plugin/
    manifest.json
    main.js
    styles.css (optional)
    assets/*
```

### `manifest.json` (proposed)
```json
{
  "id": "com.example.research-tools",
  "name": "Research Tools",
  "version": "0.1.0",
  "forgeApiVersion": "1.x",
  "entry": "main.js",
  "permissions": ["ui.command.register", "notes.read", "ai.chat"],
  "contributes": {
    "commands": [
      { "id": "research.summarizeSelection", "title": "Summarize Selection" }
    ],
    "panels": [
      { "id": "research.panel", "title": "Research" }
    ],
    "dock": [
      { "id": "research.open", "title": "Research", "icon": "🔎" }
    ]
  }
}
```

### Plugin entry (concept)
```js
export async function activate(ctx) {
  ctx.commands.register('research.summarizeSelection', async () => {
    const text = await ctx.notes.getSelection();
    const out = await ctx.ai.chat({
      mode: 'interface',
      prompt: `Summarize:\n${text}`
    });
    await ctx.ui.toast('Summary ready');
    await ctx.panels.open('research.panel', { out });
  });
}

export async function deactivate() {}
```

---

## API Surface (MVP)

### `ctx.commands`
- `register(id, handler)`
- `execute(id, args?)`

### `ctx.ui`
- `registerPanel(panelDef)`
- `openPanel(id, payload?)`
- `toast(message)`

### `ctx.notes`
- `getActiveNote()`
- `read(path)`
- `write(path, content)` (gated, queued)
- `getSelection()`

### `ctx.vault`
- `search(query)`
- `list(folder?)`

### `ctx.ai`
- `chat({ mode, prompt, provider? })`

### `ctx.launcher`
- `openUrl(url)`
- `openPath(path)` (permission-gated)

---

## Security Model

### Policy
- Default-deny permissions.
- Each sensitive capability requires explicit approval.
- Optional signed plugins for "trusted mode".

### Runtime hardening
- Plugin timeouts and cancellation.
- Memory/time limits for plugin tasks.
- Crash isolation: bad plugin cannot crash core app.

### Data safety
- Write audit log:
  - plugin id
  - file path
  - timestamp
  - hash before/after
- Optional rollback snapshot per plugin write batch.

---

## Distribution Modes

### Mode A: Local Drop-In (first)
- User copies folder into `plugins/`.
- FORGE discovers on restart (or refresh).

### Mode B: GitHub Install (next)
- Install from repo URL/release zip.
- Validate manifest + checksum.

### Mode C: Registry (later)
- Signed manifests.
- ratings/downloads/compatibility metadata.

---

## Obsidian Interop Strategy (No Fighting)

FORGE plugin runtime should support two note backends:
1. `FileSystemNoteGateway`.
2. `ObsidianBridgeNoteGateway` (Local REST API + Advanced URI).

Plugin code uses one abstract API (`ctx.notes.*`) regardless of backend.

---

## Implementation Phases

### Phase 0 (Now)
- Finalize manifest schema.
- Implement plugin discovery + manifest validation.
- Add plugin manager UI (enable/disable, permissions view).

### Phase 1 (MVP Runtime)
- Load plugins and activate/deactivate lifecycle.
- Command contribution + command palette integration.
- Minimal `ctx` API (commands, ui.toast, notes.read).

### Phase 2 (Useful Platform)
- Panels contribution.
- AI + vault APIs.
- Queued writes + audit log.

### Phase 3 (Ecosystem)
- GitHub installer.
- Signing/trust levels.
- Compatibility matrix and automated plugin checks.

---

## Developer Experience (Critical)

Ship a `forge-plugin-starter` template with:
- manifest template
- TypeScript SDK typings
- local dev watcher
- test harness with mocked `ctx`

If DX is bad, ecosystem dies.

---

## Success Metrics
- Time to first plugin under 15 minutes.
- Plugin crash does not crash FORGE.
- 0 unqueued note writes from plugin layer.
- 80% of user automations built via plugins, not core patches.

---

## Immediate Recommendation
Build plugin platform before adding many more hardcoded features.
Reason: every hardcoded feature added now is future migration debt.

Best next sprint:
1. Plugin manifest + discovery.
2. Plugin manager UI.
3. Command contribution system.

