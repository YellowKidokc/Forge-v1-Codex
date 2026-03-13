# FORGE HYBRID METHOD BLUEPRINT

## Purpose
Build a workspace that combines:
- Obsidian-style free writing + links (`[[...]]`)
- Notion-style structured blocks + properties

This is a single method for deriving, testing, and storing claims.

## Core Model
### Stage 0: Pre-Cognitive Orientation
- current belief
- alternatives
- what would change my mind

### Stage 1: Derivation Engine
- 4 question types:
  1. Does X hold?
  2. What is X?
  3. What grounds X?
  4. What must X be?
- death conditions:
  - self-refutation
  - infinite regress
  - logical incoherence
  - empirical contradiction

### Stage 2: Canonical Record
Each surviving node is stored with 7 facets:
1. Entity
2. Role
3. Evidence
4. Time
5. Ops
6. Context
7. Provenance

## UX Pattern (Obsidian + Notion Hybrid)
### A) Freeflow Canvas
- Long-form thought and links
- Fast scratch notes
- Inline wiki linking

### B) Structured Node Card
- Property panel (the 7 facets)
- Block sections (Question, Alternatives, Death Tests, Outcome)
- Status and confidence controls

### C) Zoom Levels
- Graph view (big picture)
- Node view (single claim)
- Derivation chain view (Q0 -> Q12 or any sequence)

## Minimum Views
1. `WORKSPACE` (write + link)
2. `NODE INSPECTOR` (7 facets)
3. `DERIVATION FLOW` (question/death/survivor path)
4. `EVIDENCE SWITCHBOARD` (claim -> evidence -> source)

## Required Data Objects
- `node`
- `annotation`
- `link`
- `decision`
- `conflict`
- `session`

## Publish-Grade Rules
1. No node without provenance.
2. No high-confidence claim without evidence status.
3. No canonical status without review state.
4. No closure claim without explicit dead-branch record.

## Build Sequence
1. Use `UNIVERSAL_NODE_TEMPLATE.md` for each new node.
2. Store block properties using `BLOCK_SCHEMA_TEMPLATE.json`.
3. Export to Excel/JSON pipeline after review.
