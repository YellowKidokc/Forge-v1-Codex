# GPT Conversation Extract -> Implementation Memo

## Purpose
Convert the long GPT thread into concrete system work for Forge + Obsidian + web proof explorer.

## What This Conversation Added
- Confirmed value of interactive proof explorer over static poster.
- Identified trace-mode as the core differentiator (assumption -> propagation -> failure point).
- Clarified need for section-level pages (not everything on one page).
- Clarified need for two-layer AI workflow:
  - front-facing user questions
  - hidden AI reasoning routine
- Confirmed requirement for layered annotation scopes:
  - word, sentence, paragraph, verse, chapter, book, corpus
- Confirmed Excel interoperability as foundational ingest/export bridge.

## Canonical Product Direction (Synthesis)
1. Bible-first implementation for fast real-world testing.
2. Domain-general taxonomy so it scales to physics/law/knowledge work.
3. Web-first UI for iteration speed.
4. Obsidian adapter for day-to-day operator workflow.
5. Forge as orchestration + persistence layer.

## Immediate Build Backlog (Ordered)
1. Proof Explorer v2 IA
- Keep `/proof/` overview map.
- Maintain deep pages:
  - foundation
  - subsystems
  - bifurcation
  - evidence
  - falsification
  - closure

2. Interaction Upgrades
- Section headers clickable with section-definition panel.
- Node detail contract:
  - claim
  - type (axiom/definition/theorem/derivation/commitment/evidence)
  - why it follows
  - break conditions
  - alternatives
  - status
- Trace-mode persistable URL state.

3. Auditability
- Source drawer per node:
  - canonical file anchor
  - theorem anchor
  - empirical anchor
- Distinguish explicitly:
  - derivation vs commitment vs evidence.

4. Co-Partner Session Engine
- Front question flow wired in UI.
- Hidden protocol checks run automatically.
- Output JSON validated against schema.

5. Excel Layer v2
- Expand from token-only to segment model:
  - word/sentence/paragraph/verse/chapter/book/corpus
- Add:
  - `segments`
  - `segment_annotations`
  - `segment_links`
- Maintain click-through References/Actions/Notes.

6. Obsidian Connector
- Render paragraph-first reading mode.
- Inline controls: `◀ ✚ ▶`.
- Left/right panel mutual exclusivity.
- Overlay/deep modes with accessibility-safe visual grammar.

## Design/UX Guidance from Thread
- Academic, measured, not flashy.
- Controlled interactivity over animation.
- "Map then zoom" architecture.
- Keep typography and palette aligned to structural-isomorphism canon.

## Risk Register
1. Overcrowding single-page visuals -> use multi-page sectional architecture.
2. Token-only model misses higher-order meaning -> enforce layered scopes.
3. Beautiful but unauditable diagrams -> require source/theorem drawer.
4. AI oversteering user decisions -> enforce co-partner protocol constraints.

## Success Criteria
- A user can select an assumption and trace full downstream consequences.
- A user can inspect node-level proof role and section-level purpose.
- A session produces structured output without manual note-taking.
- Excel <-> JSON <-> UI pipeline round-trips cleanly.
- Obsidian and web share the same semantic core contract.

## Next Concrete Deliverables
1. Build `proof-explorer-state-schema.json` (URL/panel/toggle/trace state model).
2. Build `excel_to_semantic_json.py` converter from current workbook.
3. Build Forge "Session Runner" page using co-partner docs and schema.
4. Build Obsidian prototype view with paragraph reader and layered scope tagging.

## Working Interpretation
This thread was not noise. It resolved architecture:
- interaction model,
- audit model,
- data model,
- workflow model.

Use this memo as execution reference for all AI contributors.
