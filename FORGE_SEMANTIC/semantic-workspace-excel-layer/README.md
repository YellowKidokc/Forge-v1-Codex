# Semantic Workspace Excel Layer

This folder defines the Excel interoperability layer for the Semantic Workspace (Obsidian + Forge compatible).

## Files
- `build_excel_template.py`: generates the workbook template.
- `Semantic_Workspace_Template_v1.xlsx`: generated workbook.
- `build_excel_nodes_edges_template.py`: generates simplified 2-tab truth model.
- `Semantic_Workspace_Nodes_Edges_v2.xlsx`: generated 2-tab workbook.

## How to build
```powershell
python O:\_Theophysics_v4\David\Programs\semantic-workspace-excel-layer\build_excel_template.py
python O:\FORGE\FORGE_SEMANTIC\semantic-workspace-excel-layer\build_excel_nodes_edges_template.py
```

## Workbook design
- `tokens_home`: one row per word (Genesis 1 starter rows included).
- `word_references`: definitions, evidence, crossrefs, source links.
- `word_actions`: links/operations attached to word.
- `word_notes`: freeform analysis by word.
- `claims`, `evidence`, `sources`, `import_log`: evidence chain tables.
- `README`: in-workbook instructions.

## Clickable flow
From each `tokens_home` row:
- `references_link` -> `word_references`
- `actions_link` -> `word_actions`
- `notes_link` -> `word_notes`

## Why this split
- `references` = what supports/interprets a word
- `actions` = what the system/user is doing with the word
- `notes` = analyst commentary

This mirrors your requested model and keeps analysis clean at scale.

## v2 Nodes+Edges model (recommended core)
- `NODES`: one row per node/claim
- `RELATIONSHIPS`: one row per typed edge

`NODES.t_score` is computed from relationship weights:
- support_score
- attack_score
- structure_score
- death_penalty

This makes truth-confidence relationship-driven instead of note-driven.
