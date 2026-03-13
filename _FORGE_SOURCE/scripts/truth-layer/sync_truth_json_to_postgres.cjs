#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { Client } = require("pg");

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "true";
    out[key] = value;
  }
  return out;
}

function must(args, key) {
  if (!args[key]) {
    throw new Error(`Missing required --${key}`);
  }
  return args[key];
}

function toBool(v) {
  return String(v).toLowerCase() === "true";
}

function clamp(num, lo, hi) {
  return Math.max(lo, Math.min(hi, num));
}

function computeTier(score) {
  if (score >= 90) return "near-canonical";
  if (score >= 75) return "strong";
  if (score >= 60) return "provisional";
  return "weak";
}

function computeTScore(gates, death) {
  const avg = (
    Number(gates.structural || 50) +
    Number(gates.mathematical || 50) +
    Number(gates.empirical || 50) +
    Number(gates.cross_domain || 50) +
    Number(gates.adversarial || 50)
  ) / 5;
  const penalty =
    (death.self_refutation ? 20 : 0) +
    (death.infinite_regress ? 15 : 0) +
    (death.empirical_contradiction ? 20 : 0) +
    (death.logical_incoherence ? 20 : 0);
  return clamp(avg - penalty, 0, 100);
}

function safeFacet(facets, key) {
  const raw = facets?.[key];
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object" && typeof raw.value === "string") return raw.value;
  return "";
}

function uuid(v) {
  return v && typeof v === "string" ? v : crypto.randomUUID();
}

function normalizeFromTruthRecord(record) {
  const death = {
    self_refutation: Boolean(record?.deathTests?.selfRefutation ?? record?.death_tests?.self_refutation),
    infinite_regress: Boolean(record?.deathTests?.infiniteRegress ?? record?.death_tests?.infinite_regress),
    empirical_contradiction: Boolean(record?.deathTests?.empiricalContradiction ?? record?.death_tests?.empirical_contradiction),
    logical_incoherence: Boolean(record?.deathTests?.logicalIncoherence ?? record?.death_tests?.logical_incoherence)
  };
  const gates = {
    structural: Number(record?.gates?.structural ?? 50),
    mathematical: Number(record?.gates?.mathematical ?? 50),
    empirical: Number(record?.gates?.empirical ?? 50),
    cross_domain: Number(record?.gates?.crossDomain ?? record?.gates?.cross_domain ?? 50),
    adversarial: Number(record?.gates?.adversarial ?? 50)
  };
  const tScore = Number(record?.t_score ?? computeTScore(gates, death));
  return {
    node_id: uuid(record?.id ?? record?.node_id),
    statement: String(record?.statement ?? "").trim(),
    scope: String(record?.scope ?? "paragraph"),
    question_type: String(record?.questionType ?? record?.question_type ?? "what_is_x"),
    facet_entity: safeFacet(record?.facets, "entity"),
    facet_role: safeFacet(record?.facets, "role"),
    facet_evidence: safeFacet(record?.facets, "evidence"),
    facet_time: safeFacet(record?.facets, "time"),
    facet_ops: safeFacet(record?.facets, "ops"),
    facet_context: safeFacet(record?.facets, "context"),
    facet_provenance: safeFacet(record?.facets, "provenance"),
    death,
    gates,
    t_score: clamp(tScore, 0, 100),
    tier: computeTier(tScore),
    raw_payload: record
  };
}

function normalizeNode(node) {
  const n = normalizeFromTruthRecord(node);
  // Accept bundle-native keys too
  n.node_id = uuid(node?.node_id ?? n.node_id);
  n.statement = String(node?.statement ?? n.statement).trim();
  n.scope = String(node?.scope ?? n.scope);
  n.question_type = String(node?.question_type ?? n.question_type);
  if (node?.facets && typeof node.facets === "object") {
    n.facet_entity = safeFacet(node.facets, "entity") || n.facet_entity;
    n.facet_role = safeFacet(node.facets, "role") || n.facet_role;
    n.facet_evidence = safeFacet(node.facets, "evidence") || n.facet_evidence;
    n.facet_time = safeFacet(node.facets, "time") || n.facet_time;
    n.facet_ops = safeFacet(node.facets, "ops") || n.facet_ops;
    n.facet_context = safeFacet(node.facets, "context") || n.facet_context;
    n.facet_provenance = safeFacet(node.facets, "provenance") || n.facet_provenance;
  }
  return n;
}

function normalizeEdge(edge) {
  return {
    edge_id: uuid(edge?.edge_id),
    from_node_id: uuid(edge?.from_node_id),
    to_node_id: uuid(edge?.to_node_id),
    edge_type: String(edge?.edge_type ?? "references"),
    weight: clamp(Number(edge?.weight ?? 1), 0, 1),
    evidence_status: String(edge?.evidence_status ?? "asserted"),
    context: edge?.context ? String(edge.context) : null,
    provenance: edge?.provenance ? String(edge.provenance) : null,
    metadata: edge?.metadata && typeof edge.metadata === "object" ? edge.metadata : {}
  };
}

function loadPayload(inputPath) {
  const abs = path.resolve(inputPath);
  const raw = fs.readFileSync(abs, "utf8");
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) {
    return { nodes: parsed.map(normalizeFromTruthRecord), edges: [], session: null };
  }
  const nodes = Array.isArray(parsed?.nodes) ? parsed.nodes.map(normalizeNode) : [];
  const edges = Array.isArray(parsed?.edges) ? parsed.edges.map(normalizeEdge) : [];
  const session = parsed?.session || null;
  return { nodes, edges, session };
}

async function run() {
  const args = parseArgs(process.argv);
  const conn = must(args, "conn");
  const input = must(args, "input");
  const runMigration = toBool(args.migrate || "false");

  const client = new Client({ connectionString: conn });
  await client.connect();

  try {
    if (runMigration) {
      const migrationPath = path.resolve(
        process.cwd(),
        "docs",
        "truth-layer",
        "postgres",
        "001_truth_layer.sql"
      );
      const migrationSql = fs.readFileSync(migrationPath, "utf8");
      await client.query(migrationSql);
      console.log(`Applied migration: ${migrationPath}`);
    }

    const payload = loadPayload(input);
    if (payload.nodes.length === 0) {
      throw new Error("No nodes found in input.");
    }

    await client.query("BEGIN");

    const upsertNodeSql = `
      INSERT INTO truth.truth_nodes (
        node_id, statement, scope, question_type,
        facet_entity, facet_role, facet_evidence, facet_time, facet_ops, facet_context, facet_provenance,
        self_refutation, infinite_regress, empirical_contradiction, logical_incoherence,
        gate_structural, gate_mathematical, gate_empirical, gate_cross_domain, gate_adversarial,
        t_score, tier, raw_payload
      ) VALUES (
        $1,$2,$3::truth.scope_level,$4::truth.question_type,
        $5,$6,$7,$8,$9,$10,$11,
        $12,$13,$14,$15,
        $16,$17,$18,$19,$20,
        $21,$22,$23::jsonb
      )
      ON CONFLICT (node_id) DO UPDATE SET
        statement = EXCLUDED.statement,
        scope = EXCLUDED.scope,
        question_type = EXCLUDED.question_type,
        facet_entity = EXCLUDED.facet_entity,
        facet_role = EXCLUDED.facet_role,
        facet_evidence = EXCLUDED.facet_evidence,
        facet_time = EXCLUDED.facet_time,
        facet_ops = EXCLUDED.facet_ops,
        facet_context = EXCLUDED.facet_context,
        facet_provenance = EXCLUDED.facet_provenance,
        self_refutation = EXCLUDED.self_refutation,
        infinite_regress = EXCLUDED.infinite_regress,
        empirical_contradiction = EXCLUDED.empirical_contradiction,
        logical_incoherence = EXCLUDED.logical_incoherence,
        gate_structural = EXCLUDED.gate_structural,
        gate_mathematical = EXCLUDED.gate_mathematical,
        gate_empirical = EXCLUDED.gate_empirical,
        gate_cross_domain = EXCLUDED.gate_cross_domain,
        gate_adversarial = EXCLUDED.gate_adversarial,
        t_score = EXCLUDED.t_score,
        tier = EXCLUDED.tier,
        raw_payload = EXCLUDED.raw_payload,
        updated_at = now()
    `;

    for (const n of payload.nodes) {
      await client.query(upsertNodeSql, [
        n.node_id,
        n.statement,
        n.scope,
        n.question_type,
        n.facet_entity,
        n.facet_role,
        n.facet_evidence,
        n.facet_time,
        n.facet_ops,
        n.facet_context,
        n.facet_provenance,
        n.death.self_refutation,
        n.death.infinite_regress,
        n.death.empirical_contradiction,
        n.death.logical_incoherence,
        n.gates.structural,
        n.gates.mathematical,
        n.gates.empirical,
        n.gates.cross_domain,
        n.gates.adversarial,
        n.t_score,
        n.tier,
        JSON.stringify(n.raw_payload || {})
      ]);
    }

    const upsertEdgeSql = `
      INSERT INTO truth.truth_edges (
        edge_id, from_node_id, to_node_id, edge_type, weight, evidence_status, context, provenance, metadata
      ) VALUES ($1,$2,$3,$4::truth.edge_type,$5,$6::truth.evidence_status,$7,$8,$9::jsonb)
      ON CONFLICT (edge_id) DO UPDATE SET
        from_node_id = EXCLUDED.from_node_id,
        to_node_id = EXCLUDED.to_node_id,
        edge_type = EXCLUDED.edge_type,
        weight = EXCLUDED.weight,
        evidence_status = EXCLUDED.evidence_status,
        context = EXCLUDED.context,
        provenance = EXCLUDED.provenance,
        metadata = EXCLUDED.metadata
    `;

    for (const e of payload.edges) {
      await client.query(upsertEdgeSql, [
        e.edge_id,
        e.from_node_id,
        e.to_node_id,
        e.edge_type,
        e.weight,
        e.evidence_status,
        e.context,
        e.provenance,
        JSON.stringify(e.metadata || {})
      ]);
    }

    if (payload.session && typeof payload.session === "object") {
      const s = payload.session;
      const insertSessionSql = `
        INSERT INTO truth.truth_sessions (
          session_id, topic, confidence_before, confidence_after, protocol, notes, raw_payload
        ) VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7::jsonb)
        ON CONFLICT (session_id) DO UPDATE SET
          topic = EXCLUDED.topic,
          confidence_before = EXCLUDED.confidence_before,
          confidence_after = EXCLUDED.confidence_after,
          protocol = EXCLUDED.protocol,
          notes = EXCLUDED.notes,
          raw_payload = EXCLUDED.raw_payload
      `;
      await client.query(insertSessionSql, [
        uuid(s.session_id),
        String(s.topic || "Truth Session"),
        s.confidence_before ?? null,
        s.confidence_after ?? null,
        JSON.stringify(s.protocol || {}),
        s.notes ? String(s.notes) : null,
        JSON.stringify(s)
      ]);
    }

    await client.query("COMMIT");
    console.log(
      `Synced: nodes=${payload.nodes.length}, edges=${payload.edges.length}, session=${payload.session ? 1 : 0}`
    );
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error("Sync failed:", err.message);
  process.exit(1);
});
