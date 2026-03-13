# FORGE BUILD SPEC — Master Handoff
## For: Claude Code / Codex / Command Line
## Date: March 13, 2026 | POF 2828

---

## WHAT FORGE IS (One Sentence)

A desktop app where the user writes in an Obsidian/Notion hybrid editor, every character lives in an addressable Excel-like grid underneath, and an AI layer below that executes any instruction the user gives by highlighting text — eliminating the need for plugins forever.

---

## THE THREE-LAYER EDITOR (This Is The Breakthrough)

### Layer 1: Surface (What the user sees)
- Obsidian-style markdown writing + Notion-style structured blocks
- Rich text, headings, links, tables, callouts, YAML frontmatter
- Beautiful, clean, familiar to anyone who's used Obsidian or Notion
- **Currently built with TipTap (ProseMirror) in React + TypeScript**

### Layer 2: Grid (The addressable substrate)
- Every character, word, and sentence has a coordinate — like Excel cells
- The AI can read any cell, write any cell, relate any cell to any other cell
- This is NOT visible by default — it's the structural backbone
- Toggle view: user can switch to see the grid if they want
- Grid enables precision — AI isn't guessing "which paragraph?" — it KNOWS: Row 14, Cell B7

### Layer 3: AI (The execution engine)
- Lives under everything, has full access to the grid
- User highlights text → chat box appears inline → user says what they want → AI executes
- No plugins. No marketplace. No config files. Just: highlight, instruct, done.
- The AI writes whatever code is needed on the fly, executes it, result shows in Layer 1

### The Interaction Loop (CANONICAL — from FORGE_SELECTION_ANNOTATION_SPEC.md)
```
1. SELECT   — any grain size: letter / word / sentence / block / paragraph
2. CHAT BOX — pops up inline, right where you are
3. DECLARE  — say what it is, what it means, what to do with it
4. CACHED   — AI stores it losslessly, enforces it going forward
```

### What Users Can Say (Examples)
```
"This is an axiom. Find all axioms in this document."
"When I write Grace, highlight amber, circle shape."
"This paragraph is load-bearing. Flag if anything contradicts it."
"I want three links condensed into a hover tooltip here."
"Anytime I write entropy in a physics context, link to E7.1."
"Summarize this section in one sentence and put it in the margin."
"Run TTS on this document when I click the checkmark."
```

---

## THE FOUR PILLARS (Architecture)

### Pillar 1: Version Control
- Built-in git-style versioning (not requiring external git)
- Every save creates a snapshot
- Diff view between versions
- Rollback to any point
- Branch for experimental edits

### Pillar 2: Content Layer (The Three-Layer Editor above)
- Where the user writes and interacts
- Obsidian/Notion hybrid surface
- Excel grid underneath
- AI underneath that
- File tree sidebar for navigation
- Notebook/vault concept (point at a folder, it becomes your workspace)

### Pillar 3: Data Mirror
- Every content folder has a shadow/mirror folder
- Content folder: your markdown files (clean, readable)
- Mirror folder: everything GENERATED from that content
  - HTML reports
  - CSV exports
  - Graph outputs
  - Audio files (TTS)
  - Images
  - Python script outputs
  - Statistics
- Content stays clean. Data stays organized. They're linked but separate.
- Third-party developers can drop Python scripts into mirror folders

### Pillar 4: Global Engine (YAML-Driven)
- Every capability is: Python script + YAML config = run/don't run
- Example — TTS Global Engine:
```yaml
engine: tts
voice: "en-US-AriaNeural"
speed: 1.2
strip_links: true
strip_code_blocks: false
output_format: mp3
output_to: mirror_folder
trigger: on_checkbox_complete
```
- Same pattern works for EVERYTHING:
  - Semantic tagging engine
  - Link extraction
  - Statistics generation
  - Export to PDF/HTML/DOCX
  - API calls
  - AI analysis passes
- The Global Engine is what turns a folder of markdown into a living system
- Premium/upsell tier — the free version has content + mirror, paid has the engine

---

## TECH STACK (Already Chosen)

| Component | Technology | Status |
|-----------|-----------|--------|
| Runtime | Tauri v2 (Rust backend + webview) | ✅ Built |
| Frontend | React 19 + TypeScript + Vite | ✅ Built |
| Editor | TipTap (ProseMirror) | ✅ Built (Layer 1 only) |
| Styling | Tailwind CSS | ✅ Built |
| AI Sidecar | Python script (ai_sidecar.py) | ✅ Built |
| Database | PostgreSQL (192.168.1.177:2665) | ✅ Connected |
| Icons | Lucide React | ✅ Installed |
| Animation | Framer Motion | ✅ Installed |
| Grid Layer | — | ❌ NOT BUILT |
| AI Inline Chat | — | ❌ NOT BUILT |
| Version Control | — | ❌ NOT BUILT |
| Data Mirror | — | ❌ NOT BUILT |
| Global Engine | — | ❌ NOT BUILT |
| YAML Config System | — | ❌ NOT BUILT |

---

## EXISTING CODEBASE (What's Already There)

### Location: `O:\Forge\_FORGE_SOURCE\`

### Rust Backend (`src-tauri/src/lib.rs` — 416 lines)
Already has:
- `set_vault` / `get_vault_files` — vault selection and file scanning
- `read_note` / `write_note` / `create_note` / `create_folder` — full file CRUD
- `open_or_create_note_by_title` — wikilink resolution (recursive search)
- `rename_item` / `delete_item` — file management
- `connect_db` — PostgreSQL connection with credential fallback
- `run_python_sidecar` — executes Python AI scripts with JSON payload

### React Frontend (`src/`)
Already has:
- `App.tsx` (580 lines) — main app with state management, notebook switching, AI panel toggle
- `components/Editor/ForgeEditor.tsx` — TipTap-based markdown editor
- `components/Editor/EditorToolbar.tsx` — formatting toolbar
- `components/Editor/PromotedBlockExtension.ts` — custom TipTap extension
- `components/Sidebar.tsx` — file tree navigation
- `components/AiPanel.tsx` — AI chat panel
- `components/BottomBar.tsx` — status bar
- `components/SettingsPage.tsx` — settings UI
- `components/miniapps/LogicSheet.tsx` — logic sheet miniapp
- `components/miniapps/TruthLayerWorkbench.tsx` — truth layer miniapp
- `lib/ai.ts` — AI provider routing
- `lib/aiRuntime.ts` — AI event logging
- `lib/pythonSidecar.ts` — Python sidecar bridge
- `lib/settings.ts` — settings management
- `lib/types.ts` — TypeScript types

### Config
- `tauri.conf.json` — app name "FORGE: Logos Workshop", 1200x800 window
- `package.json` — all dependencies installed (TipTap, React 19, Tauri, PG, etc.)

---

## WHAT TO BUILD (Priority Order)

### Priority 1: The Grid Layer (Layer 2)
This is the hardest piece and the foundation for everything else.

**Requirements:**
- Every TipTap node (paragraph, heading, list item, etc.) gets a stable ID
- Within each node, every word gets an index
- Optionally: every character gets an index
- The grid is a data structure that mirrors the TipTap document
- Grid updates automatically as user types
- Grid is queryable: "give me all words in paragraph 5" or "what's at position [14, 3]?"
- Grid is writable: AI can modify grid cells and changes reflect in Layer 1

**Approach options:**
1. TipTap decoration system — annotate existing nodes with position metadata
2. Parallel data structure — maintain a separate grid that syncs with TipTap's document model
3. ProseMirror node attributes — store grid coordinates as node/mark attributes

**Output:** A `useGrid()` hook or equivalent that provides:
```typescript
grid.getCell(row, col) // returns content + metadata
grid.setCell(row, col, value) // writes to grid + syncs to editor
grid.query("all words where tag === 'axiom'") // semantic query
grid.highlight(row, col, style) // visual feedback
```

### Priority 2: Inline AI Chat (The Selection → Instruct Loop)
**Requirements:**
- User selects text in the editor
- A small chat bubble appears inline (near the selection, not in a sidebar)
- User types instruction in natural language
- AI reads the selection + grid context + instruction
- AI executes (tag, link, format, transform, generate, whatever)
- Result appears in Layer 1
- Instruction is cached for future enforcement

**Key insight:** The chat bubble is NOT a full chat interface. It's a command line that happens to understand English. Quick, inline, disappears after execution.

### Priority 3: Data Mirror Folders
**Requirements:**
- When user opens a vault/notebook, Forge creates a `_data/` mirror directory
- Structure mirrors the content folder exactly
- Generated outputs go to mirror, not content folder
- File watcher keeps them in sync
- UI shows both views (content | data) with toggle

### Priority 4: YAML Global Engine
**Requirements:**
- A `_engines/` folder in each vault
- Each engine is a YAML file + optional Python script
- Forge scans for engines on vault open
- Settings page shows all available engines with on/off toggles
- Engine execution triggered by: manual, checkbox, save, schedule, or event

### Priority 5: Version Control
**Requirements:**
- On every save, create a timestamped snapshot
- Store diffs, not full copies (for efficiency)
- Version browser UI (timeline view)
- Diff view between any two versions
- One-click rollback

---

## WHAT NOT TO CHANGE

- Do NOT change the Tauri backend commands that already work
- Do NOT replace TipTap with a different editor (extend it)
- Do NOT change the file structure conventions
- Do NOT add Electron or any non-Tauri runtime
- Do NOT require the user to install additional software beyond what Tauri needs

---

## REPO STRUCTURE

```
forge/
├── src-tauri/          ← Rust backend (DON'T TOUCH what works)
│   └── src/lib.rs      ← Add new commands for grid, versioning, engine
├── src/
│   ├── components/
│   │   ├── Editor/
│   │   │   ├── ForgeEditor.tsx      ← Extend with grid integration
│   │   │   ├── GridLayer.tsx        ← NEW: Grid visualization
│   │   │   ├── InlineAiChat.tsx     ← NEW: Selection → Instruct UI
│   │   │   └── ...existing...
│   │   ├── DataMirror/              ← NEW: Mirror folder UI
│   │   ├── VersionControl/          ← NEW: Version browser UI
│   │   ├── GlobalEngine/            ← NEW: Engine config UI
│   │   └── ...existing...
│   ├── lib/
│   │   ├── grid.ts                  ← NEW: Grid data structure + hooks
│   │   ├── mirror.ts               ← NEW: Data mirror logic
│   │   ├── versioning.ts           ← NEW: Version control logic
│   │   ├── engine.ts               ← NEW: YAML engine runner
│   │   └── ...existing...
│   └── ...
├── _engines/                        ← Default global engines (YAML + scripts)
│   ├── tts.yaml
│   ├── export_html.yaml
│   ├── semantic_tag.yaml
│   └── ...
└── docs/
    ├── FORGE_SELECTION_ANNOTATION_SPEC.md   ← READ THIS FIRST
    └── ...
```

---

## FOR EACH AGENT

### Claude Code (GitHub):
Focus on **Priority 1 (Grid Layer)** and **Priority 2 (Inline AI Chat)**. These are the core editor extensions. You have the TipTap codebase. Extend it.

### Codex:
Focus on **Priority 3 (Data Mirror)** and **Priority 4 (Global Engine)**. These are the infrastructure pieces. You have the Tauri backend. Add new commands for mirror folder management and YAML engine execution.

### Command Line Claude:
Focus on **Priority 5 (Version Control)** and **integration testing**. Wire the pieces together. Make sure grid changes trigger version snapshots. Make sure engine outputs go to mirror folders. Make sure it all compiles.

---

## REFERENCE DOCS (Read Before Building)

1. `O:\Forge\FORGE_DOCS\FORGE_SELECTION_ANNOTATION_SPEC.md` — THE breakthrough spec
2. `O:\Forge\FORGE_DOCS\FORGE_SIMPLE_FIRST_ROADMAP.md` — Phase plan
3. `O:\Forge\FORGE_DOCS\FORGE_PLUGIN_PLATFORM_ARCHITECTURE.md` — Engine architecture
4. `O:\Forge\FORGE_DOCS\FORGE_DATA_LAYER_SPEC.md` — Data mirror concept
5. `O:\Forge\FORGE_SEMANTIC\forge-hybrid-template\FORGE_HYBRID_METHOD_BLUEPRINT.md` — Hybrid editor spec

---

## THE RULE

The three-layer editor is the product. Everything else supports it. If you're building something that doesn't make "highlight → instruct → done" work better, you're building the wrong thing.

---

*POF 2828 | FORGE: Framework for Orchestrated Research, Growth, and Execution*
*"Input → Memorize → Reform → Store or Reject."*
*The forge is always hot.*
