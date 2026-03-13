# FORGE — Logos Workshop

> A desktop writing app where every character lives on an addressable grid, and an AI layer underneath executes whatever the user says — no plugins, no config, just highlight and instruct.

**Version:** 1.0.0  
**Stack:** Tauri 2 · React 19 · TypeScript · TipTap (ProseMirror) · Rust · PostgreSQL  
**Identifier:** `com.theophysics.forge`

---

## What Forge Does

Forge is a three-layer editor:

1. **Surface** — Obsidian-style markdown + Notion-style blocks. Clean rich text with headings, tables, callouts, YAML frontmatter.
2. **Grid** — Every character, word, and sentence has a coordinate (like Excel cells). The AI reads and writes to specific cells. No guessing "which paragraph" — it knows: Row 14, Cell B7.
3. **AI** — Lives under everything. Highlight text → inline chat appears → say what you want → AI executes. It writes whatever code is needed on the fly.

### The Interaction Loop

```
SELECT  → any grain: letter / word / sentence / block / paragraph
CHAT    → pops up inline, right where you are
DECLARE → say what it is, what it means, what to do with it
CACHED  → AI stores it losslessly, enforces it going forward
```

Examples of what users can say:
- "This is an axiom. Find all axioms in this document."
- "When I write Grace, highlight amber, circle shape."
- "This paragraph is load-bearing. Flag if anything contradicts it."
- "Summarize this section in one sentence and put it in the margin."

---

## Architecture

### Four Pillars
- **Version Control** — built-in git-style snapshotting per save
- **Truth Layer** — canonical definitions enforced across documents
- **AI Roles** — Interface (user-facing), Logic (structural analysis), Copilot (proactive suggestions)
- **Plugin-Free Extensibility** — AI generates and runs code on the fly instead of requiring plugin installs

### AI Roles (Three-Role System)
| Role | Purpose |
|------|---------|
| **Interface** | Direct user interaction — respond to prompts, execute instructions |
| **Logic** | Background structural scanning — contradictions, drift, weak assumptions |
| **Copilot** | Background action suggestions — next highest-leverage moves |

### Key Components

| File | What It Does |
|------|-------------|
| `App.tsx` | Main orchestrator — notebooks, file tree, editor, AI panel, settings, routing |
| `ForgeEditor.tsx` | TipTap-based rich text editor with inline AI chat |
| `AiPanel.tsx` | Slide-out AI conversation panel (Ctrl+Shift+A) |
| `LogicSheet.tsx` | Spreadsheet-style logic view |
| `TruthLayerWorkbench.tsx` | Canonical truth management |
| `ai.ts` / `aiRuntime.ts` | AI provider abstraction, role routing, runtime event log |
| `grid.ts` | The addressable grid substrate |
| `pythonSidecar.ts` | Python execution bridge for AI-generated code |
| `BottomBar.tsx` | Command bar with `/commands` — apps, AI, logic, truth layer |

---

## Repo Structure

```
Forge/
├── _FORGE_SOURCE/          # The app (Tauri + React + Rust)
│   ├── src/                # React frontend
│   │   ├── components/     # UI components
│   │   ├── lib/            # Core logic (AI, grid, settings, types)
│   │   └── hooks/          # React hooks
│   ├── src-tauri/          # Rust backend (Tauri commands, PostgreSQL)
│   ├── scripts/            # Python sidecar, truth-layer sync
│   ├── docs/               # Technical specs
│   └── public/             # Static assets
├── FORGE_DOCS/             # Design docs, specs, roadmaps, upgrade logs
├── FORGE_SEMANTIC/         # Semantic layer specs (Bible explorer, co-partner system)
└── FORGE_BUILD_SPEC_MASTER.md  # Complete build specification
```

---

## Setup & Development

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- [Tauri CLI](https://tauri.app/) (`cargo install tauri-cli`)
- PostgreSQL (optional — for Truth Layer persistence)
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

The compiled binary lands in `_FORGE_SOURCE/src-tauri/target/release/`.

### Slash Commands (Bottom Bar)

| Command | Action |
|---------|--------|
| `/ai [prompt]` | Open AI panel / send prompt |
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

## Design Documentation

The `FORGE_DOCS/` directory contains all specs and roadmaps:

- **FORGE_BUILD_SPEC_MASTER.md** — Complete build specification (three-layer architecture, four pillars)
- **FORGE_SIMPLE_FIRST_ROADMAP.md** — Development roadmap and priorities
- **FORGE_DATA_LAYER_SPEC.md** — Data persistence architecture
- **FORGE_PLUGIN_PLATFORM_ARCHITECTURE.md** — How plugin-free extensibility works
- **FORGE_SELECTION_ANNOTATION_SPEC.md** — The canonical select → chat → declare → cache loop
- **FORGE_RELEASE_WORKFLOW.md** — Build and release pipeline
- **FORGE_HANDOFF_FOR_PROGRAMMER.md** — Onboarding doc for new contributors

The `FORGE_SEMANTIC/` directory contains the semantic layer and Bible explorer specs.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Tauri 2 (Rust) |
| Frontend | React 19 + TypeScript + Vite |
| Editor | TipTap / ProseMirror |
| Styling | Tailwind CSS 4 |
| AI providers | Configurable (Anthropic, OpenAI, Ollama, custom) |
| Database | PostgreSQL (via sqlx in Rust, pg in Node) |
| Sidecar | Python (for AI-generated code execution) |
| Animations | Framer Motion |

---

## License

Proprietary — © 2026 Theophysics / David Lowery. All rights reserved.
