# FORGE — Logos Workshop
## Complete Build Manifest for AI Agents (Claude Code / Codex / Any)

> **One sentence:** A desktop app where the user writes in an Obsidian/Notion hybrid editor, every character lives in an addressable Excel-like grid underneath, and an AI layer below executes any instruction the user gives by highlighting text — eliminating the need for plugins forever.

**Version:** 1.0.0  
**Stack:** Tauri 2 · React 19 · TypeScript · TipTap (ProseMirror) · Rust · PostgreSQL  
**Identifier:** `com.theophysics.forge`  
**Author:** David Lowery / POF 2828  

---

## TABLE OF CONTENTS

1. [The Three-Layer Editor](#the-three-layer-editor)
2. [The Four Pillars](#the-four-pillars)
3. [What's Already Built](#whats-already-built)
4. [What Needs to Be Built](#what-needs-to-be-built)
5. [The Core Loop (CANONICAL)](#the-core-loop)
6. [Data Ingestion Layer](#data-ingestion-layer)
7. [Plugin Platform](#plugin-platform)
8. [Repo Structure](#repo-structure)
9. [Setup & Development](#setup--development)
10. [Reference Docs](#reference-docs)

---

## THE THREE-LAYER EDITOR

This is the breakthrough. This is the product.

### Layer 1: Surface (What the user sees)
- Obsidian-style markdown writing + Notion-style structured blocks
- Rich text, headings, links, tables, callouts, YAML frontmatter
- **Built with TipTap (ProseMirror) in React + TypeScript** ✅

### Layer 2: Grid (The addressable substrate) ❌ NOT BUILT
- Every character, word, and sentence has a coordinate — like Excel cells
- AI can read any cell, write any cell, relate any cell to any other cell
- Not visible by default — it's the structural backbone
- Toggle view: user can switch to see the grid
- Grid enables precision: AI knows Row 14, Cell B7 — not "which paragraph?"

### Layer 3: AI (The execution engine) ⚠️ PARTIALLY BUILT
- Lives under everything, has full access to the grid
- User highlights text → chat box appears inline → user says what they want → AI executes
- No plugins. No marketplace. No config files. Just: highlight, instruct, done
- The AI writes whatever code is needed on the fly, executes it, result shows in Layer 1

---

## THE FOUR PILLARS

### Pillar 1: Version Control ❌ NOT BUILT
- Built-in git-style versioning (not requiring external git)
- Every save creates a timestamped snapshot
- Diff view between versions
- Rollback to any point
- Branch for experimental edits

### Pillar 2: Content Layer (Three-Layer Editor) ⚠️ PARTIALLY BUILT
- Obsidian/Notion hybrid surface ✅
- Excel grid underneath ❌
- AI underneath that ⚠️
- File tree sidebar ✅
- Notebook/vault concept ✅

### Pillar 3: Data Mirror ❌ NOT BUILT
- Every content folder has a shadow `_data/` mirror directory
- Content folder: your markdown files (clean, readable)
- Mirror folder: everything GENERATED (HTML reports, CSV, graphs, audio, images, Python outputs)
- Content stays clean. Data stays organized. Linked but separate.
- Third-party developers can drop Python scripts into mirror folders

### Pillar 4: Global Engine (YAML-Driven) ❌ NOT BUILT
- Every capability is: Python script + YAML config = run/don't run
- `_engines/` folder in each vault
- Settings page shows all available engines with on/off toggles
- Engine execution triggered by: manual, checkbox, save, schedule, or event
- Example engines: TTS, semantic tagging, link extraction, PDF/HTML/DOCX export, API calls, AI analysis

---

## WHAT'S ALREADY BUILT

### Tech Stack Status

| Component | Technology | Status |
|-----------|-----------|--------|
| Runtime | Tauri v2 (Rust backend + webview) | ✅ Built |
| Frontend | React 19 + TypeScript + Vite 7 | ✅ Built |
| Editor | TipTap (ProseMirror) | ✅ Built (Layer 1 only) |
| Styling | Tailwind CSS 4 | ✅ Built |
| AI Sidecar | Python script (ai_sidecar.py) | ✅ Built |
| Database | PostgreSQL (192.168.1.177:2665) | ✅ Connected |
| Icons | Lucide React | ✅ Installed |
| Animation | Framer Motion | ✅ Installed |
| Grid Layer | — | ❌ NOT BUILT |
| Inline AI Chat | — | ❌ NOT BUILT |
| Version Control | — | ❌ NOT BUILT |
| Data Mirror | — | ❌ NOT BUILT |
| Global Engine | — | ❌ NOT BUILT |
| YAML Config System | — | ❌ NOT BUILT |
| Plugin Platform | — | ❌ NOT BUILT |
| Data Ingestion Layer | — | ❌ NOT BUILT |
| Command Palette | — | ❌ NOT BUILT |

### Rust Backend (`_FORGE_SOURCE/src-tauri/src/lib.rs` — 416 lines)
- `set_vault` / `get_vault_files` — vault selection and file scanning
- `read_note` / `write_note` / `create_note` / `create_folder` — full file CRUD
- `open_or_create_note_by_title` — wikilink resolution (recursive search)
- `rename_item` / `delete_item` — file management
- `connect_db` — PostgreSQL connection with credential fallback
- `run_python_sidecar` — executes Python AI scripts with JSON payload

### React Frontend (`_FORGE_SOURCE/src/`)
- `App.tsx` (580 lines) — main app: notebooks, file tree, editor, AI panel, settings, routing
- `ForgeEditor.tsx` — TipTap-based markdown editor with autosave
- `InlineAiChat.tsx` — inline AI chat component (exists but needs grid integration)
- `AiPanel.tsx` — slide-out AI conversation panel (Ctrl+Shift+A)
- `BottomBar.tsx` — command bar with `/commands`
- `Sidebar.tsx` — file tree navigation with notebook switching
- `SettingsPage.tsx` — settings UI with AI provider config
- `LogicSheet.tsx` — spreadsheet-style logic view miniapp
- `TruthLayerWorkbench.tsx` — truth layer management miniapp
- `ai.ts` — three-role AI provider routing (Interface, Logic, Copilot)
- `aiRuntime.ts` — AI event logging and runtime management
- `grid.ts` — grid data structure (exists but needs full implementation)
- `pythonSidecar.ts` — Python execution bridge
- `settings.ts` — settings management with localStorage persistence

### AI Roles (Three-Role System) ⚠️ PARTIALLY BUILT
| Role | Purpose | Status |
|------|---------|--------|
| **Interface** | Direct user interaction — respond to prompts, execute instructions | ✅ Working |
| **Logic** | Background structural scan — contradictions, drift, weak assumptions | ✅ Working |
| **Copilot** | Background action suggestions — next highest-leverage moves | ✅ Working |

Background roles fire on a 6-second debounce after note content changes.

---

## WHAT NEEDS TO BE BUILT

### PRIORITY 1: Grid Layer (Layer 2) — THE FOUNDATION

This is the hardest piece and everything depends on it.

**Requirements:**
- Every TipTap node (paragraph, heading, list item) gets a stable ID
- Within each node, every word gets an index
- Optionally: every character gets an index
- Grid is a data structure that mirrors the TipTap document
- Grid updates automatically as user types
- Grid is queryable: "give me all words in paragraph 5" or "what's at position [14, 3]?"
- Grid is writable: AI can modify grid cells and changes reflect in Layer 1

**Approach options:**
1. TipTap decoration system — annotate existing nodes with position metadata
2. Parallel data structure — separate grid that syncs with TipTap document model
3. ProseMirror node attributes — store grid coordinates as node/mark attributes

**Output:** A `useGrid()` hook that provides:
```typescript
grid.getCell(row, col)              // returns content + metadata
grid.setCell(row, col, value)       // writes to grid + syncs to editor
grid.query("all words where tag === 'axiom'")  // semantic query
grid.highlight(row, col, style)     // visual feedback
grid.subscribe(row, col, callback)  // watch for changes
```

**Files to create/modify:**
- `src/lib/grid.ts` — full grid data structure (exists as stub, needs implementation)
- `src/hooks/useGrid.ts` — React hook (exists as stub)
- `src/components/Editor/GridLayer.tsx` — NEW: grid visualization overlay
- `src/components/Editor/ForgeEditor.tsx` — integrate grid sync

---

### PRIORITY 2: Inline AI Chat (Selection → Instruct Loop)

**Requirements:**
- User selects text in the editor
- Small chat bubble appears inline (near selection, NOT in sidebar)
- User types instruction in natural language
- AI reads: selection + grid context + instruction
- AI executes (tag, link, format, transform, generate, etc.)
- Result appears in Layer 1
- Instruction is cached for future enforcement

**Key insight:** The chat bubble is NOT a full chat interface. It's a command line that understands English. Quick, inline, disappears after execution.

**Three stored objects the system needs:**

1. **Canonical Anchors** — selected text marked as canonical with UUID, label, grain size, scope (local/global), lock state
2. **Display Rules** — trigger (text match / semantic tag / domain) → color + shape + opacity + scope
3. **Expansion Macros** — abbreviation → expansion (e.g., LOW1 → full email address)

**What users can say (examples):**
- "This is the canonical Grace equation" → every G(t) gets checked against this
- "When I write Grace, highlight amber, circle shape" → display rule fires everywhere
- "This paragraph is load-bearing. Flag if anything contradicts it." → canonical anchor + contradiction watch
- "Anytime I write entropy in a physics context, link to E7.1" → contextual auto-link
- "Summarize this section in one sentence and put it in the margin" → AI generates + places
- "Run TTS on this document when I click the checkmark" → engine trigger

**Files to create/modify:**
- `src/components/Editor/InlineAiChat.tsx` — exists, needs grid integration + cached instructions
- `src/lib/annotations.ts` — NEW: canonical anchors, display rules, expansion macros store
- `src/lib/instructionCache.ts` — NEW: cached instruction enforcement engine

---

### PRIORITY 3: Data Mirror Folders

**Requirements:**
- When user opens a vault/notebook, Forge creates a `_data/` mirror directory
- Structure mirrors the content folder exactly
- Generated outputs go to mirror, not content folder
- File watcher keeps them in sync
- UI shows both views (content | data) with toggle

**Rust backend additions needed:**
- `create_mirror` command — creates `_data/` structure
- `get_mirror_files` command — lists mirror contents
- `write_mirror_file` command — writes to mirror
- File watcher integration

**Files to create:**
- `src/lib/mirror.ts` — mirror folder logic
- `src/components/DataMirror/MirrorView.tsx` — mirror browser UI
- Extend `src-tauri/src/lib.rs` with mirror commands

---

### PRIORITY 4: YAML Global Engine

**Requirements:**
- `_engines/` folder in each vault
- Each engine: YAML config + optional Python script
- Forge scans for engines on vault open
- Settings page shows engines with on/off toggles
- Execution triggered by: manual, checkbox, save, schedule, or event

**Example engine YAML:**
```yaml
engine: tts
voice: "en-US-AriaNeural"
speed: 1.2
strip_links: true
output_format: mp3
output_to: mirror_folder
trigger: on_checkbox_complete
```

**Files to create:**
- `src/lib/engine.ts` — YAML engine discovery, parsing, execution
- `src/components/GlobalEngine/EngineManager.tsx` — engine config UI
- Default engines in `_engines/` directory

---

### PRIORITY 5: Version Control

**Requirements:**
- On every save, create a timestamped snapshot
- Store diffs, not full copies (for efficiency)
- Version browser UI (timeline view)
- Diff view between any two versions
- One-click rollback
- Grid changes trigger version snapshots

**Files to create:**
- `src/lib/versioning.ts` — version control logic
- `src/components/VersionControl/VersionBrowser.tsx` — timeline UI
- `src/components/VersionControl/DiffView.tsx` — diff comparison
- Extend `src-tauri/src/lib.rs` with snapshot commands

---

### PRIORITY 6: Data Ingestion Layer (Layer 0)

This comes BEFORE the knowledge graph. Any data source. Drop it in. Answer 3-5 questions. It's live.

**The flow:**
```
User drops Excel/CSV/JSON into FORGE
  → Setup wizard fires (3-5 questions max)
  → Data is ingested and indexed
  → Notes layer activates on top of it
  → AI partners start reading behind the scenes
  → Knowledge graph can consume it
```

**The 5-question wizard:**
1. What IS this? (Bible / Research papers / Stock prices / My notes / Other)
2. What's the primary key? (auto-detected, user confirms)
3. What do you want to DO with this? (Read, annotate, search, analyze, feed graph)
4. Any columns that are CANONICAL? (load-bearing, never overwrite)
5. What should the AI partners watch for? (plain language, or skip)

**Supported formats (v1):**
- Excel (.xlsx) — primary format, sheets become tabs
- CSV (.csv) — auto-detected delimiter
- JSON array — each object becomes a row
- Markdown folder — each .md file becomes a row
- PostgreSQL table — direct query, live sync
- Plain text — line-per-row, manual column mapping

**After ingestion, every row becomes:**
```json
{
  "id": "auto-generated FORGE UUID",
  "source": "KJV_Bible.xlsx",
  "primary_key": "JHN|1|1",
  "columns": { "Book": "John", "Chapter": 1, "Verse": 1, "Text": "..." },
  "notes": [],
  "anchors": [],
  "ai_flags": [],
  "graph_node": null
}
```

**Build order for ingestion:**
1. File drop handler — accept xlsx/csv/json, detect format
2. Setup wizard UI — 5-question flow, auto-detect primary key
3. Row renderer — display ingested data with notes column
4. Notes store — attach/read notes per row per source
5. AI-1 (Connector) — pattern match across sources
6. AI-2 (Challenger) — contradiction watch
7. AI-3 (Archivist) — gap detection
8. Graph bridge — expose scored rows to knowledge graph

---

### PRIORITY 7: Plugin Platform

**Goal:** Developer can build a plugin, drop it into `plugins/`, enable in Settings, see new commands/panels/dock actions immediately. No app rebuild.

**Architecture:**
- Extension host: sandboxed runtime (Web Worker / iframe / isolated ES module)
- Capability-based API: plugins request explicit permissions
- Single-writer guardrail: all note writes through `NoteGateway` queue
- Stable versioned plugin contract

**Plugin manifest:**
```json
{
  "id": "com.example.research-tools",
  "name": "Research Tools",
  "version": "0.1.0",
  "forgeApiVersion": "1.x",
  "entry": "main.js",
  "permissions": ["ui.command.register", "notes.read", "ai.chat"],
  "contributes": {
    "commands": [{ "id": "research.summarize", "title": "Summarize Selection" }],
    "panels": [{ "id": "research.panel", "title": "Research" }],
    "dock": [{ "id": "research.open", "title": "Research", "icon": "🔎" }]
  }
}
```

**Plugin API capabilities:**
- `notes.read` / `notes.write` — vault file access (write is queued + audited)
- `vault.search` — search across vault
- `ai.chat` / `ai.context.read` — AI interaction
- `ui.panel.register` / `ui.command.register` — UI contributions
- `launcher.open` / `files.open_path` — external resource access
- `network.http` — opt-in, domain allowlist

**Plugin build order:**
1. Plugin manifest schema + discovery + validation
2. Plugin manager UI (enable/disable, permissions view)
3. Command contribution + command palette integration
4. Panel contribution system
5. AI + vault APIs
6. Queued writes + audit log
7. GitHub installer
8. Signing/trust levels

---

### PRIORITY 8: UX Improvements (Fast Wins)

From the Simple First Roadmap:

**Phase 1: Stability + Navigation**
- Tauri `single-instance` — prevent duplicate app sessions
- Tauri `window-state` — layouts persist naturally
- `cmdk` command palette: open notebook, run launcher, switch AI provider

**Phase 2: Real TypingMind Feel**
- Chat folders + pinned chats + prompt snippets
- `assistant-ui` primitives for advanced chat UX
- Drag reorder via `dnd-kit` for chat folders, dock icons, quick places

**Phase 3: Obsidian Bridge (No Fighting)**
- Obsidian Local REST API integration for note ops when Obsidian is open
- Advanced URI for deep links (open workspace/file/heading)
- Write-mode toggle: `Forge Direct` vs `Via Obsidian API`
- "Active writer" indicator in status bar

**Recommended libraries:**
- `pacocoursey/cmdk` — command palette
- `assistant-ui/assistant-ui` — React chat primitives
- `bvaughn/react-resizable-panels` — stable 2/3/4 pane layouts
- `clauderic/dnd-kit` — drag reorder
- `coddingtonbear/obsidian-local-rest-api` — Obsidian bridge
- Tauri plugins: `store`, `window-state`, `single-instance`, `global-shortcut`

**Integration boundary — define one interface for note operations:**
```typescript
interface NoteGateway {
  listNotes(): Promise<NoteEntry[]>
  readNote(path: string): Promise<string>
  writeNote(path: string, content: string, mode: 'overwrite' | 'append'): Promise<void>
  patchNote(path: string, patchSpec: PatchSpec): Promise<void>
  openInObsidian(path: string, heading?: string): Promise<void>
}
// Implementations: FileSystemNoteGateway (current), ObsidianRestNoteGateway (next)
```

---

## THE CORE LOOP (CANONICAL)

**This is the rule. If you're building something that doesn't make this work better, you're building the wrong thing.**

```
1. SELECT   — any grain size: letter / word / sentence / block / paragraph
2. CHAT BOX — pops up inline, right where you are
3. DECLARE  — say what it is, what it means, what to do with it
4. CACHED   — AI stores it losslessly, enforces it going forward
```

No forms. No schema design. No dropdowns. No "pick a type from this list."
You teach the system by talking to it, exactly like you'd explain it to a person.

---

## REPO STRUCTURE

```
Forge/
├── README.md                       ← THIS FILE (complete build manifest)
├── FORGE_BUILD_SPEC_MASTER.md      ← Original full build spec
├── .gitignore
│
├── _FORGE_SOURCE/                  ← THE APP (Tauri + React + Rust)
│   ├── src/                        ← React frontend
│   │   ├── components/
│   │   │   ├── Editor/
│   │   │   │   ├── ForgeEditor.tsx      ← Extend with grid integration
│   │   │   │   ├── EditorToolbar.tsx
│   │   │   │   ├── InlineAiChat.tsx     ← Extend with cached instructions
│   │   │   │   ├── GridLayer.tsx        ← NEW: Grid visualization
│   │   │   │   └── PromotedBlock*.ts/x
│   │   │   ├── DataMirror/             ← NEW: Mirror folder UI
│   │   │   ├── VersionControl/          ← NEW: Version browser UI
│   │   │   ├── GlobalEngine/            ← NEW: Engine config UI
│   │   │   ├── miniapps/               ← LogicSheet, TruthLayerWorkbench
│   │   │   └── [Sidebar, AiPanel, BottomBar, Settings, etc.]
│   │   ├── lib/
│   │   │   ├── grid.ts                  ← Grid data structure (extend)
│   │   │   ├── ai.ts                    ← AI provider routing
│   │   │   ├── aiRuntime.ts             ← Runtime event log
│   │   │   ├── annotations.ts           ← NEW: anchors, display rules, macros
│   │   │   ├── instructionCache.ts      ← NEW: cached instruction enforcement
│   │   │   ├── mirror.ts               ← NEW: Data mirror logic
│   │   │   ├── versioning.ts           ← NEW: Version control
│   │   │   ├── engine.ts               ← NEW: YAML engine runner
│   │   │   ├── ingestion.ts            ← NEW: Data ingestion layer
│   │   │   └── [settings, types, markdown, pythonSidecar, noteMeta]
│   │   └── hooks/
│   │       └── useGrid.ts              ← Grid hook (extend)
│   ├── src-tauri/                      ← Rust backend
│   │   ├── src/lib.rs                  ← Add: grid, mirror, version, engine commands
│   │   ├── Cargo.toml                  ← Dependencies
│   │   └── tauri.conf.json             ← App config
│   ├── scripts/                        ← Python sidecar, truth-layer sync
│   ├── docs/                           ← Technical specs (selection annotation, truth layer, co-partner)
│   └── [package.json, vite.config.ts, tsconfig.json, etc.]
│
├── FORGE_DOCS/                         ← Design docs, specs, roadmaps
│   ├── FORGE_BUILD_SPEC_MASTER.md
│   ├── FORGE_SELECTION_ANNOTATION_SPEC.md  ← READ THIS FIRST
│   ├── FORGE_SIMPLE_FIRST_ROADMAP.md
│   ├── FORGE_PLUGIN_PLATFORM_ARCHITECTURE.md
│   ├── FORGE_DATA_LAYER_SPEC.md
│   ├── FORGE_RELEASE_WORKFLOW.md
│   ├── FORGE_HANDOFF_FOR_PROGRAMMER.md
│   └── [+ more specs and notes]
│
└── FORGE_SEMANTIC/                     ← Semantic layer specs
    ├── BIBLE_SEMANTIC_EXPLORER_AI_HANDOFF.md
    ├── CO_PARTNER_QUESTION_SYSTEM.md
    ├── forge-hybrid-template/
    ├── dashboard-plan/
    └── semantic-workspace-excel-layer/
```

---

## SETUP & DEVELOPMENT

### Prerequisites
- [Node.js](https://nodejs.org/) v18+
- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- [Tauri CLI](https://tauri.app/) (`cargo install tauri-cli`)
- PostgreSQL (optional — for Truth Layer persistence, at 192.168.1.177:2665)
- Python 3.10+ (optional — for AI sidecar scripts)

### Install & Run
```bash
cd _FORGE_SOURCE
npm install
npm run tauri:dev
```

### Build for Production
```bash
cd _FORGE_SOURCE
npm run tauri:build
```
Binary lands in `_FORGE_SOURCE/src-tauri/target/release/`.

### Slash Commands (Bottom Bar)
| Command | Action |
|---------|--------|
| `/ai [prompt]` | Open AI panel / send prompt to Interface role |
| `/logic [prompt]` | Send to Logic role |
| `/copilot [prompt]` | Send to Copilot role |
| `/open [title]` | Open or create a note by title |
| `/link [title]` | Same as `/open` |
| `/logicsheet` | Switch to Logic Sheet view |
| `/truth` | Switch to Truth Layer Workbench |
| `/editor` | Switch back to editor |
| `/python [instruction]` | Run Python sidecar action |
| `/settings` | Open settings |
| `/app [id]` | Launch a registered mini-app |

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+A` | Toggle AI Panel |
| `Ctrl+,` | Toggle Settings |

---

## WHAT NOT TO CHANGE

- Do NOT change the Tauri backend commands that already work
- Do NOT replace TipTap with a different editor (extend it)
- Do NOT change the file structure conventions
- Do NOT add Electron or any non-Tauri runtime
- Do NOT require additional software beyond what Tauri needs
- Do NOT run two independent write pipelines to the same note without lock/queue

---

## REFERENCE DOCS (Read Before Building)

Read these in order:
1. `FORGE_DOCS/FORGE_SELECTION_ANNOTATION_SPEC.md` — THE breakthrough spec (Core Loop)
2. `FORGE_BUILD_SPEC_MASTER.md` — Complete build specification
3. `FORGE_DOCS/FORGE_SIMPLE_FIRST_ROADMAP.md` — Phase plan and fast wins
4. `FORGE_DOCS/FORGE_PLUGIN_PLATFORM_ARCHITECTURE.md` — Engine/plugin architecture
5. `FORGE_DOCS/FORGE_DATA_LAYER_SPEC.md` — Data ingestion concept
6. `FORGE_SEMANTIC/forge-hybrid-template/FORGE_HYBRID_METHOD_BLUEPRINT.md` — Hybrid editor spec
7. `_FORGE_SOURCE/docs/FORGE_SELECTION_ANNOTATION_SPEC.md` — Selection spec (copy in source)
8. `_FORGE_SOURCE/docs/truth-layer/README.md` — Truth Layer architecture

---

## THE RULE

> The three-layer editor is the product. Everything else supports it. If you're building something that doesn't make "highlight → instruct → done" work better, you're building the wrong thing.

---

*POF 2828 | FORGE: Framework for Orchestrated Research, Growth, and Execution*  
*"Input → Memorize → Reform → Store or Reject."*  
*The forge is always hot.*
