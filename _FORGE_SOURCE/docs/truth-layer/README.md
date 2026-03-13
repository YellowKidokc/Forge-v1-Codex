# Truth Layer Backbone (Forge)

This folder contains the portable data contract and persistence layer for the Theophysics Truth Layer.

## Purpose
- Define canonical machine-readable contracts (`Node`, `Edge`, `Session`).
- Provide a Postgres schema with strict UUID and relationship integrity.
- Provide a sync script to ingest JSON exports into Postgres.

## Files
- `contracts/truth_node.schema.json`
- `contracts/truth_edge.schema.json`
- `contracts/truth_session.schema.json`
- `contracts/truth_bundle.schema.json`
- `postgres/001_truth_layer.sql`

## Sync Script
Use:
- `scripts/truth-layer/sync_truth_json_to_postgres.cjs`

### Command
```powershell
node scripts/truth-layer/sync_truth_json_to_postgres.cjs `
  --conn "postgresql://user:pass@host:2665/theophysics" `
  --input "C:\path\to\truth-records.json"
```

### Supported Input Shapes
1. **Truth records array** (from TruthLayerWorkbench export):
```json
[
  {
    "id": "uuid",
    "statement": "...",
    "scope": "paragraph",
    "questionType": "what_is_x",
    "facets": {
      "entity": { "value": "...", "attachments": [] },
      "role": { "value": "...", "attachments": [] },
      "evidence": { "value": "...", "attachments": [] },
      "time": { "value": "...", "attachments": [] },
      "ops": { "value": "...", "attachments": [] },
      "context": { "value": "...", "attachments": [] },
      "provenance": { "value": "...", "attachments": [] }
    },
    "deathTests": {
      "selfRefutation": false,
      "infiniteRegress": false,
      "empiricalContradiction": false,
      "logicalIncoherence": false
    },
    "gates": {
      "structural": 70,
      "mathematical": 80,
      "empirical": 60,
      "crossDomain": 75,
      "adversarial": 65
    }
  }
]
```

2. **Bundle shape**:
```json
{
  "nodes": [...],
  "edges": [...],
  "session": { ... }
}
```

## Design Notes
- 7 facets are first-class columns on `truth_nodes` for fast query.
- Full source payload is retained in `raw_payload` JSONB for audit.
- T-score is persisted as a numeric snapshot (`t_score`) for deterministic downstream views.
- Edges are explicit and typed (`supports`, `attacks`, `depends_on`, `bridges`, etc.).
