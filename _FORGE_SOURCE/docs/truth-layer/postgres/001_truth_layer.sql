-- Truth Layer v1
-- Postgres migration for Forge semantic truth pipeline

CREATE SCHEMA IF NOT EXISTS truth;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'scope_level') THEN
    CREATE TYPE truth.scope_level AS ENUM ('word','sentence','paragraph','verse','chapter','book','corpus');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'question_type') THEN
    CREATE TYPE truth.question_type AS ENUM ('does_x_hold','what_is_x','what_grounds_x','what_must_x_be');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'edge_type') THEN
    CREATE TYPE truth.edge_type AS ENUM ('supports','attacks','depends_on','bridges','extends','contradicts','maps_to','references');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'evidence_status') THEN
    CREATE TYPE truth.evidence_status AS ENUM ('asserted','provisional','verified','disputed','unresolved');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS truth.truth_nodes (
  node_id UUID PRIMARY KEY,
  statement TEXT NOT NULL,
  scope truth.scope_level NOT NULL,
  question_type truth.question_type NOT NULL,

  facet_entity TEXT NOT NULL DEFAULT '',
  facet_role TEXT NOT NULL DEFAULT '',
  facet_evidence TEXT NOT NULL DEFAULT '',
  facet_time TEXT NOT NULL DEFAULT '',
  facet_ops TEXT NOT NULL DEFAULT '',
  facet_context TEXT NOT NULL DEFAULT '',
  facet_provenance TEXT NOT NULL DEFAULT '',

  self_refutation BOOLEAN NOT NULL DEFAULT FALSE,
  infinite_regress BOOLEAN NOT NULL DEFAULT FALSE,
  empirical_contradiction BOOLEAN NOT NULL DEFAULT FALSE,
  logical_incoherence BOOLEAN NOT NULL DEFAULT FALSE,

  gate_structural NUMERIC(5,2) NOT NULL DEFAULT 50.00 CHECK (gate_structural >= 0 AND gate_structural <= 100),
  gate_mathematical NUMERIC(5,2) NOT NULL DEFAULT 50.00 CHECK (gate_mathematical >= 0 AND gate_mathematical <= 100),
  gate_empirical NUMERIC(5,2) NOT NULL DEFAULT 50.00 CHECK (gate_empirical >= 0 AND gate_empirical <= 100),
  gate_cross_domain NUMERIC(5,2) NOT NULL DEFAULT 50.00 CHECK (gate_cross_domain >= 0 AND gate_cross_domain <= 100),
  gate_adversarial NUMERIC(5,2) NOT NULL DEFAULT 50.00 CHECK (gate_adversarial >= 0 AND gate_adversarial <= 100),

  t_score NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (t_score >= 0 AND t_score <= 100),
  tier TEXT NOT NULL DEFAULT 'weak',

  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS truth.truth_edges (
  edge_id UUID PRIMARY KEY,
  from_node_id UUID NOT NULL REFERENCES truth.truth_nodes(node_id) ON DELETE CASCADE,
  to_node_id UUID NOT NULL REFERENCES truth.truth_nodes(node_id) ON DELETE CASCADE,
  edge_type truth.edge_type NOT NULL,
  weight NUMERIC(4,3) NOT NULL DEFAULT 1.000 CHECK (weight >= 0 AND weight <= 1),
  evidence_status truth.evidence_status NOT NULL DEFAULT 'asserted',
  context TEXT,
  provenance TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (from_node_id, to_node_id, edge_type)
);

CREATE TABLE IF NOT EXISTS truth.truth_sessions (
  session_id UUID PRIMARY KEY,
  topic TEXT NOT NULL,
  confidence_before NUMERIC(4,3) CHECK (confidence_before >= 0 AND confidence_before <= 1),
  confidence_after NUMERIC(4,3) CHECK (confidence_after >= 0 AND confidence_after <= 1),
  protocol JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_truth_nodes_scope ON truth.truth_nodes(scope);
CREATE INDEX IF NOT EXISTS idx_truth_nodes_tier ON truth.truth_nodes(tier);
CREATE INDEX IF NOT EXISTS idx_truth_nodes_tscore ON truth.truth_nodes(t_score DESC);
CREATE INDEX IF NOT EXISTS idx_truth_nodes_updated ON truth.truth_nodes(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_truth_edges_from ON truth.truth_edges(from_node_id);
CREATE INDEX IF NOT EXISTS idx_truth_edges_to ON truth.truth_edges(to_node_id);
CREATE INDEX IF NOT EXISTS idx_truth_edges_type ON truth.truth_edges(edge_type);

CREATE OR REPLACE FUNCTION truth.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_truth_nodes_updated_at ON truth.truth_nodes;
CREATE TRIGGER trg_truth_nodes_updated_at
BEFORE UPDATE ON truth.truth_nodes
FOR EACH ROW EXECUTE FUNCTION truth.set_updated_at();

CREATE OR REPLACE VIEW truth.truth_node_health AS
SELECT
  n.node_id,
  n.statement,
  n.scope,
  n.t_score,
  n.tier,
  (
    CASE WHEN n.facet_entity <> '' THEN 1 ELSE 0 END +
    CASE WHEN n.facet_role <> '' THEN 1 ELSE 0 END +
    CASE WHEN n.facet_evidence <> '' THEN 1 ELSE 0 END +
    CASE WHEN n.facet_time <> '' THEN 1 ELSE 0 END +
    CASE WHEN n.facet_ops <> '' THEN 1 ELSE 0 END +
    CASE WHEN n.facet_context <> '' THEN 1 ELSE 0 END +
    CASE WHEN n.facet_provenance <> '' THEN 1 ELSE 0 END
  ) AS facet_coverage,
  (
    SELECT COUNT(*) FROM truth.truth_edges e
    WHERE e.to_node_id = n.node_id AND e.edge_type = 'supports'
  ) AS supports_in,
  (
    SELECT COUNT(*) FROM truth.truth_edges e
    WHERE e.to_node_id = n.node_id AND e.edge_type = 'attacks'
  ) AS attacks_in
FROM truth.truth_nodes n;
