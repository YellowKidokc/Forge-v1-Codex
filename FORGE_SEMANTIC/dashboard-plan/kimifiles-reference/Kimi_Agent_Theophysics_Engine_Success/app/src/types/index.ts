export interface Axiom {
  id: string;
  title: string;
  chainPosition: number;
  stage: number;
  tier: 'primitive' | 'derived' | 'definition' | 'lemma';
  status: 'draft' | 'validated' | 'review' | 'critical';
  domain: string;
  category: 'axiom' | 'definition' | 'lemma';
  assumes: Assumption[];
  formalStatement: string;
  formalStatementMath?: string;
  mappings: Mapping[];
  enables: Enable[];
  objections: Objection[];
  defeatConditions: DefeatCondition[];
  analytics: Analytics;
  dependencies: string[];
  tags: string[];
}

export interface Assumption {
  id: string;
  title: string;
  description: string;
  validated: boolean;
}

export interface Mapping {
  domain: string;
  mapping: string;
  status: 'grounded' | 'scripture' | 'suggest' | 'empirical' | 'shannon';
  source: string;
}

export interface Enable {
  id: string;
  title: string;
  type: string;
  description: string;
}

export interface Objection {
  id: number;
  title: string;
  objection: string;
  response: string;
  suggestion?: string;
}

export interface DefeatCondition {
  condition: string;
  status: 'no-empirical-defeat' | 'open' | 'resolved';
}

export interface Analytics {
  contradictions: number;
  bridgeScore: number;
  crRating: 'Critical' | 'High' | 'Medium' | 'Low';
  cooccurrence: Cooccurrence[];
}

export interface Cooccurrence {
  name: string;
  percentage: number;
  color: string;
}

export interface Category {
  id: string;
  name: string;
  items: AxiomSummary[];
}

export interface AxiomSummary {
  id: string;
  title: string;
  chainPosition: number;
  tier: string;
  status: string;
}

export interface GraphNode {
  id: string;
  title: string;
  x: number;
  y: number;
  type: 'current' | 'dependency' | 'dependent' | 'other';
}

export interface GraphEdge {
  from: string;
  to: string;
  type: 'depends' | 'enables';
}
