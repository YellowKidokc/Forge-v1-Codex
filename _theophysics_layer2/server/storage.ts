import { eq, asc, or, inArray } from "drizzle-orm";
import { db } from "./db";
import {
  users, categories, axioms, axiomDependencies, axiomEnables, perspectives,
  type User, type InsertUser,
  type Category, type InsertCategory,
  type Axiom, type InsertAxiom,
  type AxiomDependency, type InsertDependency,
  type AxiomEnable, type InsertEnable,
  type Perspective, type InsertPerspective,
} from "@shared/schema";

export interface GraphNode {
  id: string;
  title: string;
  categorySlug: string | null;
  avg7qScore: string | null;
  chainPosition: number;
  bridgeCount: number;
  killCount: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: "chain" | "reference";
}

export interface GraphNeighborhood {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getCategories(): Promise<Category[]>;
  getCategoryBySlug(slug: string): Promise<Category | undefined>;
  createCategory(cat: InsertCategory): Promise<Category>;

  getAxioms(): Promise<Axiom[]>;
  getAxiomByNodeId(nodeId: string): Promise<Axiom | undefined>;
  getAxiomsByCategory(categorySlug: string): Promise<Axiom[]>;
  createAxiom(axiom: InsertAxiom): Promise<Axiom>;
  updateAxiom(nodeId: string, data: Partial<InsertAxiom>): Promise<Axiom | undefined>;

  getDependencies(axiomNodeId: string): Promise<AxiomDependency[]>;
  createDependency(dep: InsertDependency): Promise<AxiomDependency>;

  getEnables(axiomNodeId: string): Promise<AxiomEnable[]>;
  createEnable(en: InsertEnable): Promise<AxiomEnable>;

  getPerspectives(axiomNodeId: string): Promise<Perspective[]>;
  createPerspective(p: InsertPerspective): Promise<Perspective>;

  getGraphNeighborhood(nodeId: string): Promise<GraphNeighborhood>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getCategories(): Promise<Category[]> {
    return db.select().from(categories).orderBy(asc(categories.sortOrder));
  }

  async getCategoryBySlug(slug: string): Promise<Category | undefined> {
    const [cat] = await db.select().from(categories).where(eq(categories.slug, slug));
    return cat;
  }

  async createCategory(cat: InsertCategory): Promise<Category> {
    const [created] = await db.insert(categories).values(cat).returning();
    return created;
  }

  async getAxioms(): Promise<Axiom[]> {
    return db.select().from(axioms).orderBy(asc(axioms.chainPosition));
  }

  async getAxiomByNodeId(nodeId: string): Promise<Axiom | undefined> {
    const [axiom] = await db.select().from(axioms).where(eq(axioms.nodeId, nodeId));
    return axiom;
  }

  async getAxiomsByCategory(categorySlug: string): Promise<Axiom[]> {
    return db.select().from(axioms).where(eq(axioms.categorySlug, categorySlug)).orderBy(asc(axioms.chainPosition));
  }

  async createAxiom(axiom: InsertAxiom): Promise<Axiom> {
    const [created] = await db.insert(axioms).values(axiom).returning();
    return created;
  }

  async updateAxiom(nodeId: string, data: Partial<InsertAxiom>): Promise<Axiom | undefined> {
    const [updated] = await db.update(axioms).set(data).where(eq(axioms.nodeId, nodeId)).returning();
    return updated;
  }

  async getDependencies(axiomNodeId: string): Promise<AxiomDependency[]> {
    return db.select().from(axiomDependencies).where(eq(axiomDependencies.axiomNodeId, axiomNodeId));
  }

  async createDependency(dep: InsertDependency): Promise<AxiomDependency> {
    const [created] = await db.insert(axiomDependencies).values(dep).returning();
    return created;
  }

  async getEnables(axiomNodeId: string): Promise<AxiomEnable[]> {
    return db.select().from(axiomEnables).where(eq(axiomEnables.axiomNodeId, axiomNodeId));
  }

  async createEnable(en: InsertEnable): Promise<AxiomEnable> {
    const [created] = await db.insert(axiomEnables).values(en).returning();
    return created;
  }

  async getPerspectives(axiomNodeId: string): Promise<Perspective[]> {
    return db.select().from(perspectives).where(eq(perspectives.axiomNodeId, axiomNodeId)).orderBy(asc(perspectives.sortOrder));
  }

  async createPerspective(p: InsertPerspective): Promise<Perspective> {
    const [created] = await db.insert(perspectives).values(p).returning();
    return created;
  }

  async getGraphNeighborhood(nodeId: string): Promise<GraphNeighborhood> {
    const deps = await db.select().from(axiomDependencies)
      .where(or(
        eq(axiomDependencies.axiomNodeId, nodeId),
        eq(axiomDependencies.dependsOnNodeId, nodeId),
      ));

    const ens = await db.select().from(axiomEnables)
      .where(or(
        eq(axiomEnables.axiomNodeId, nodeId),
        eq(axiomEnables.enablesNodeId, nodeId),
      ));

    const neighborIds = new Set<string>();
    neighborIds.add(nodeId);
    for (const d of deps) {
      neighborIds.add(d.axiomNodeId);
      neighborIds.add(d.dependsOnNodeId);
    }
    for (const e of ens) {
      neighborIds.add(e.axiomNodeId);
      neighborIds.add(e.enablesNodeId);
    }

    const hop1Ids = Array.from(neighborIds);
    const deps2 = hop1Ids.length > 0
      ? await db.select().from(axiomDependencies)
          .where(or(
            inArray(axiomDependencies.axiomNodeId, hop1Ids),
            inArray(axiomDependencies.dependsOnNodeId, hop1Ids),
          ))
      : [];

    const ens2 = hop1Ids.length > 0
      ? await db.select().from(axiomEnables)
          .where(or(
            inArray(axiomEnables.axiomNodeId, hop1Ids),
            inArray(axiomEnables.enablesNodeId, hop1Ids),
          ))
      : [];

    for (const d of deps2) {
      neighborIds.add(d.axiomNodeId);
      neighborIds.add(d.dependsOnNodeId);
    }
    for (const e of ens2) {
      neighborIds.add(e.axiomNodeId);
      neighborIds.add(e.enablesNodeId);
    }

    const allIds = Array.from(neighborIds);
    const axiomRows = allIds.length > 0
      ? await db.select().from(axioms).where(inArray(axioms.nodeId, allIds))
      : [];

    const nodes: GraphNode[] = axiomRows.map((a) => ({
      id: a.nodeId,
      title: a.title,
      categorySlug: a.categorySlug,
      avg7qScore: a.avg7qScore,
      chainPosition: a.chainPosition,
      bridgeCount: a.bridgeCount,
      killCount: a.killCount ?? 0,
    }));

    const edgeSet = new Set<string>();
    const edges: GraphEdge[] = [];

    const addEdge = (source: string, target: string, type: "chain" | "reference") => {
      const key = `${source}\u2192${target}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push({ source, target, type });
      }
    };

    for (const d of [...deps, ...deps2]) {
      addEdge(d.axiomNodeId, d.dependsOnNodeId, "chain");
    }
    for (const e of [...ens, ...ens2]) {
      addEdge(e.axiomNodeId, e.enablesNodeId, "reference");
    }

    return { nodes, edges };
  }
}

export const storage = new DatabaseStorage();
