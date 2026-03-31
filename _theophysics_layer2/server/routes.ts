import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertAxiomSchema,
  insertCategorySchema,
  insertDependencySchema,
  insertEnableSchema,
  insertPerspectiveSchema,
} from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/categories", async (_req, res) => {
    const cats = await storage.getCategories();
    res.json(cats);
  });

  app.get("/api/categories/:slug", async (req, res) => {
    const cat = await storage.getCategoryBySlug(req.params.slug);
    if (!cat) return res.status(404).json({ message: "Category not found" });
    res.json(cat);
  });

  app.get("/api/axioms", async (req, res) => {
    const categorySlug = req.query.category as string | undefined;
    if (categorySlug) {
      const list = await storage.getAxiomsByCategory(categorySlug);
      return res.json(list);
    }
    const list = await storage.getAxioms();
    res.json(list);
  });

  app.get("/api/axioms/:nodeId", async (req, res) => {
    const axiom = await storage.getAxiomByNodeId(req.params.nodeId);
    if (!axiom) return res.status(404).json({ message: "Axiom not found" });

    const [dependencies, enables, persp] = await Promise.all([
      storage.getDependencies(axiom.nodeId),
      storage.getEnables(axiom.nodeId),
      storage.getPerspectives(axiom.nodeId),
    ]);

    res.json({ ...axiom, dependencies, enables, perspectives: persp });
  });

  app.post("/api/axioms", async (req, res) => {
    try {
      const parsed = insertAxiomSchema.parse(req.body);
      const axiom = await storage.createAxiom(parsed);
      res.status(201).json(axiom);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.patch("/api/axioms/:nodeId", async (req, res) => {
    try {
      const partial = insertAxiomSchema.partial().parse(req.body);
      const updated = await storage.updateAxiom(req.params.nodeId, partial);
      if (!updated) return res.status(404).json({ message: "Axiom not found" });
      res.json(updated);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.post("/api/dependencies", async (req, res) => {
    try {
      const parsed = insertDependencySchema.parse(req.body);
      const dep = await storage.createDependency(parsed);
      res.status(201).json(dep);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.post("/api/enables", async (req, res) => {
    try {
      const parsed = insertEnableSchema.parse(req.body);
      const en = await storage.createEnable(parsed);
      res.status(201).json(en);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.post("/api/perspectives", async (req, res) => {
    try {
      const parsed = insertPerspectiveSchema.parse(req.body);
      const p = await storage.createPerspective(parsed);
      res.status(201).json(p);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.post("/api/categories", async (req, res) => {
    try {
      const parsed = insertCategorySchema.parse(req.body);
      const cat = await storage.createCategory(parsed);
      res.status(201).json(cat);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // \u2500\u2500\u2500 Graph API \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

  app.get("/api/graph/neighborhood/:nodeId", async (req, res) => {
    try {
      const neighborhood = await storage.getGraphNeighborhood(req.params.nodeId);
      res.json(neighborhood);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // \u2500\u2500\u2500 AI Chat API \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { axiomId, prompt, persona } = req.body;

      if (!axiomId || !prompt) {
        return res.status(400).json({ message: "axiomId and prompt are required" });
      }

      const axiom = await storage.getAxiomByNodeId(axiomId);
      if (!axiom) {
        return res.status(404).json({ message: "Axiom not found" });
      }

      const [deps, enables, persp] = await Promise.all([
        storage.getDependencies(axiomId),
        storage.getEnables(axiomId),
        storage.getPerspectives(axiomId),
      ]);

      const contextParts: string[] = [
        `AXIOM: ${axiom.nodeId} \u2014 ${axiom.title}`,
        `TYPE: ${axiom.objectType} | STAGE: ${axiom.stage} | STATUS: ${axiom.status}`,
      ];

      if (axiom.formalStatement) contextParts.push(`FORMAL STATEMENT: ${axiom.formalStatement}`);
      if (axiom.intendedMeaning) contextParts.push(`INTENDED MEANING: ${axiom.intendedMeaning}`);
      if (axiom.verdict) contextParts.push(`VERDICT: ${axiom.verdict}`);
      if (axiom.physicsMapping) contextParts.push(`PHYSICS: ${axiom.physicsMapping}`);
      if (axiom.theologyMapping) contextParts.push(`THEOLOGY: ${axiom.theologyMapping}`);
      if (axiom.avg7qScore) contextParts.push(`7Q SCORE: ${axiom.avg7qScore}`);
      if (axiom.executiveSummary) contextParts.push(`SUMMARY: ${axiom.executiveSummary}`);

      if (deps.length > 0) {
        contextParts.push(`DEPENDS ON: ${deps.map(d => d.dependsOnNodeId).join(", ")}`);
      }
      if (enables.length > 0) {
        contextParts.push(`ENABLES: ${enables.map(e => e.enablesNodeId).join(", ")}`);
      }
      if (axiom.defeatConditions?.length) {
        contextParts.push(`DEFEAT CONDITIONS: ${axiom.defeatConditions.join("; ")}`);
      }

      const personaLabel = persona || "researcher";
      const context = contextParts.join("\n");

      const answer = generateMockResponse(prompt, axiom, personaLabel, context);

      res.json({
        answer,
        citations: [axiom.nodeId, ...deps.map(d => d.dependsOnNodeId).slice(0, 3)],
        suggestedViews: axiom.avg7qScore ? ["7Q Deep", "Judge & Jury"] : ["Formal Statement"],
      });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  return httpServer;
}

function generateMockResponse(
  prompt: string,
  axiom: any,
  persona: string,
  context: string,
): string {
  const lower = prompt.toLowerCase();

  if (lower.includes("objection") || lower.includes("strongest")) {
    const objections = axiom.standardObjections || [];
    if (objections.length > 0) {
      return `[${persona.toUpperCase()} ANALYSIS]\n\nThe strongest objection to ${axiom.nodeId} (${axiom.title}):\n\n"${objections[0].objection}"\n\nResponse: ${objections[0].response}\n\n${axiom.verdict ? `Verdict: ${axiom.verdict}` : "No verdict recorded."}`;
    }
    return `[${persona.toUpperCase()} ANALYSIS]\n\nNo standard objections are currently recorded for ${axiom.nodeId}. This axiom may need adversarial review.`;
  }

  if (lower.includes("falsif") || lower.includes("kill") || lower.includes("defeat")) {
    const conditions = axiom.defeatConditions || [];
    if (conditions.length > 0) {
      return `[${persona.toUpperCase()} ANALYSIS]\n\nDefeat conditions for ${axiom.nodeId}:\n${conditions.map((c: string, i: number) => `${i + 1}. ${c}`).join("\n")}\n\n${axiom.collapseAnalysis ? `Collapse analysis: ${axiom.collapseAnalysis}` : ""}`;
    }
    return `[${persona.toUpperCase()} ANALYSIS]\n\nNo explicit defeat conditions recorded for ${axiom.nodeId}. Consider running a falsification analysis.`;
  }

  if (lower.includes("explain") || lower.includes("non-physicist") || lower.includes("simple")) {
    return `[${persona.toUpperCase()} \u2014 PLAIN LANGUAGE]\n\n${axiom.commonSenseTruth || axiom.intendedMeaning || axiom.formalStatement || "No simplified explanation available."}\n\n${axiom.commonSenseExplanation || ""}`;
  }

  if (lower.includes("quantum") || lower.includes("physics") || lower.includes("connect")) {
    const mappings: string[] = [];
    if (axiom.physicsMapping) mappings.push(`Physics: ${axiom.physicsMapping}`);
    if (axiom.quantumMapping) mappings.push(`Quantum: ${axiom.quantumMapping}`);
    if (axiom.consciousnessMapping) mappings.push(`Consciousness: ${axiom.consciousnessMapping}`);
    if (axiom.theologyMapping) mappings.push(`Theology: ${axiom.theologyMapping}`);

    if (mappings.length > 0) {
      return `[${persona.toUpperCase()} \u2014 CROSS-DOMAIN BRIDGES]\n\n${mappings.join("\n\n")}\n\nBridge count: ${axiom.bridgeCount}/7`;
    }
    return `[${persona.toUpperCase()}]\n\nNo cross-domain mappings recorded for ${axiom.nodeId}.`;
  }

  return `[${persona.toUpperCase()} ANALYSIS \u2014 ${axiom.nodeId}]\n\n${axiom.title}\n\n${axiom.formalStatement || ""}\n\n${axiom.intendedMeaning || ""}\n\n7Q Score: ${axiom.avg7qScore || "not scored"}\nStatus: ${axiom.status}\nChain position: ${axiom.chainPosition}/${axiom.totalChain}\n\n---\nThis is a context-aware mock response. Connect a real AI provider (Anthropic, OpenAI, or Ollama) to enable full analysis.`;
}
