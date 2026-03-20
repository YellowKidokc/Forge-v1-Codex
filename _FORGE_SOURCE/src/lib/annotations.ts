/**
 * FORGE Annotation Store
 *
 * Three stored objects per the Selection-Annotation Spec:
 * 1. Canonical Anchors — what things ARE
 * 2. Display Rules — what to DO visually when you see them
 * 3. Expansion Macros — shorthand → full text
 *
 * All stored in localStorage. Flat key-value, fast lookup.
 */

// ─── Types ───────────────────────────────────────────────────

export type GrainSize = 'letter' | 'word' | 'sentence' | 'block';
export type AnnotationScope = 'local' | 'global';
export type DisplayShape = 'box' | 'circle' | 'underline' | 'highlight' | 'none';

export interface CanonicalAnchor {
  id: string;
  text: string;
  label: string;
  grain: GrainSize;
  scope: AnnotationScope;
  locked: boolean;
  docPath?: string;          // for local-scope anchors
  contradictionWatch: boolean;
  created: number;
}

export interface DisplayRule {
  id: string;
  trigger: string;           // text match, tag name, or domain
  triggerType: 'text' | 'tag' | 'domain';
  color: string;
  shape: DisplayShape;
  opacity: number;
  scope: AnnotationScope;
  docPath?: string;
  created: number;
}

export interface ExpansionMacro {
  id: string;
  shorthand: string;
  expansion: string;
  context: 'always' | string; // 'always' or specific doc/domain
  created: number;
}

// ─── Storage Keys ────────────────────────────────────────────

const ANCHORS_KEY = 'forge_canonical_anchors';
const RULES_KEY = 'forge_display_rules';
const MACROS_KEY = 'forge_expansion_macros';

// ─── ID Generation ───────────────────────────────────────────

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ─── CRUD: Canonical Anchors ─────────────────────────────────

export function getAnchors(): CanonicalAnchor[] {
  try {
    return JSON.parse(localStorage.getItem(ANCHORS_KEY) || '[]');
  } catch { return []; }
}

export function saveAnchors(anchors: CanonicalAnchor[]): void {
  localStorage.setItem(ANCHORS_KEY, JSON.stringify(anchors));
}

export function addAnchor(partial: Omit<CanonicalAnchor, 'id' | 'created'>): CanonicalAnchor {
  const anchor: CanonicalAnchor = { ...partial, id: uid(), created: Date.now() };
  const all = getAnchors();
  all.push(anchor);
  saveAnchors(all);
  return anchor;
}

export function removeAnchor(id: string): void {
  saveAnchors(getAnchors().filter(a => a.id !== id));
}

export function updateAnchor(id: string, updates: Partial<CanonicalAnchor>): void {
  saveAnchors(getAnchors().map(a => a.id === id ? { ...a, ...updates } : a));
}

// ─── CRUD: Display Rules ────────────────────────────────────

export function getRules(): DisplayRule[] {
  try {
    return JSON.parse(localStorage.getItem(RULES_KEY) || '[]');
  } catch { return []; }
}

export function saveRules(rules: DisplayRule[]): void {
  localStorage.setItem(RULES_KEY, JSON.stringify(rules));
}

export function addRule(partial: Omit<DisplayRule, 'id' | 'created'>): DisplayRule {
  const rule: DisplayRule = { ...partial, id: uid(), created: Date.now() };
  const all = getRules();
  all.push(rule);
  saveRules(all);
  return rule;
}

export function removeRule(id: string): void {
  saveRules(getRules().filter(r => r.id !== id));
}

// ─── CRUD: Expansion Macros ─────────────────────────────────

export function getMacros(): ExpansionMacro[] {
  try {
    return JSON.parse(localStorage.getItem(MACROS_KEY) || '[]');
  } catch { return []; }
}

export function saveMacros(macros: ExpansionMacro[]): void {
  localStorage.setItem(MACROS_KEY, JSON.stringify(macros));
}

export function addMacro(partial: Omit<ExpansionMacro, 'id' | 'created'>): ExpansionMacro {
  const macro: ExpansionMacro = { ...partial, id: uid(), created: Date.now() };
  const all = getMacros();
  all.push(macro);
  saveMacros(all);
  return macro;
}

export function removeMacro(id: string): void {
  saveMacros(getMacros().filter(m => m.id !== id));
}

// ─── Fuzzy Matching ──────────────────────────────────────────

export function fuzzyMatch(text: string, anchor: string, threshold = 0.8): boolean {
  const a = text.toLowerCase().trim();
  const b = anchor.toLowerCase().trim();
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;

  // Simple character-level similarity (Jaccard on bigrams)
  const bigrams = (s: string): Set<string> => {
    const set = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
    return set;
  };
  const ba = bigrams(a);
  const bb = bigrams(b);
  let intersection = 0;
  for (const bg of ba) { if (bb.has(bg)) intersection++; }
  const union = ba.size + bb.size - intersection;
  return union > 0 && (intersection / union) >= threshold;
}

// ─── Match Engine ────────────────────────────────────────────
// Given a block of text, find all matching anchors, rules, and macros.

export interface AnnotationMatch {
  type: 'anchor' | 'rule' | 'macro';
  id: string;
  matchStart: number;  // character offset in text
  matchEnd: number;
  anchor?: CanonicalAnchor;
  rule?: DisplayRule;
  macro?: ExpansionMacro;
}

export function findMatches(text: string, docPath?: string): AnnotationMatch[] {
  const matches: AnnotationMatch[] = [];
  const lower = text.toLowerCase();

  // Match anchors
  for (const anchor of getAnchors()) {
    if (anchor.scope === 'local' && anchor.docPath !== docPath) continue;
    const anchorLower = anchor.text.toLowerCase();
    let idx = lower.indexOf(anchorLower);
    while (idx !== -1) {
      matches.push({
        type: 'anchor',
        id: anchor.id,
        matchStart: idx,
        matchEnd: idx + anchorLower.length,
        anchor,
      });
      idx = lower.indexOf(anchorLower, idx + 1);
    }
  }

  // Match display rules (text trigger type)
  for (const rule of getRules()) {
    if (rule.scope === 'local' && rule.docPath !== docPath) continue;
    if (rule.triggerType !== 'text') continue;
    const triggerLower = rule.trigger.toLowerCase();
    let idx = lower.indexOf(triggerLower);
    while (idx !== -1) {
      matches.push({
        type: 'rule',
        id: rule.id,
        matchStart: idx,
        matchEnd: idx + triggerLower.length,
        rule,
      });
      idx = lower.indexOf(triggerLower, idx + 1);
    }
  }

  // Match macros
  for (const macro of getMacros()) {
    const shortLower = macro.shorthand.toLowerCase();
    let idx = lower.indexOf(shortLower);
    while (idx !== -1) {
      // Only match whole words for macros
      const before = idx > 0 ? text[idx - 1] : ' ';
      const after = idx + shortLower.length < text.length ? text[idx + shortLower.length] : ' ';
      if (/\s|^$/.test(before) && /\s|[.,;:!?]|^$/.test(after)) {
        matches.push({
          type: 'macro',
          id: macro.id,
          matchStart: idx,
          matchEnd: idx + shortLower.length,
          macro,
        });
      }
      idx = lower.indexOf(shortLower, idx + 1);
    }
  }

  return matches.sort((a, b) => a.matchStart - b.matchStart);
}

// ─── Natural Language Instruction Parser ─────────────────────
// Parses user declarations from the inline chat into stored objects.

export interface ParsedInstruction {
  type: 'anchor' | 'rule' | 'macro' | 'unknown';
  anchor?: Omit<CanonicalAnchor, 'id' | 'created'>;
  rule?: Omit<DisplayRule, 'id' | 'created'>;
  macro?: Omit<ExpansionMacro, 'id' | 'created'>;
  description: string;
}

const COLOR_MAP: Record<string, string> = {
  amber: '#f59e0b', yellow: '#eab308', gold: '#d97706',
  red: '#ef4444', crimson: '#dc2626',
  blue: '#3b82f6', cyan: '#06b6d4', sky: '#0ea5e9',
  green: '#22c55e', emerald: '#10b981',
  purple: '#a855f7', violet: '#8b5cf6', indigo: '#6366f1',
  pink: '#ec4899', rose: '#f43f5e',
  orange: '#f97316',
  white: '#ffffff', gray: '#9ca3af', grey: '#9ca3af',
};

function extractColor(text: string): string | null {
  // Check for hex color
  const hexMatch = text.match(/#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/);
  if (hexMatch) return hexMatch[0];

  // Check for named colors
  const lower = text.toLowerCase();
  for (const [name, hex] of Object.entries(COLOR_MAP)) {
    if (lower.includes(name)) return hex;
  }
  return null;
}

function extractShape(text: string): DisplayShape | null {
  const lower = text.toLowerCase();
  if (lower.includes('circle')) return 'circle';
  if (lower.includes('box')) return 'box';
  if (lower.includes('underline')) return 'underline';
  if (lower.includes('highlight')) return 'highlight';
  return null;
}

export function parseInstruction(instruction: string, selectedText: string, docPath?: string): ParsedInstruction {
  const lower = instruction.toLowerCase().trim();

  // Pattern: "X = Y" → expansion macro
  const macroMatch = instruction.match(/^(\S+)\s*=\s*(.+)$/);
  if (macroMatch && macroMatch[1].length <= 10) {
    return {
      type: 'macro',
      macro: {
        shorthand: macroMatch[1],
        expansion: macroMatch[2].trim(),
        context: 'always',
      },
      description: `Macro: ${macroMatch[1]} → ${macroMatch[2].trim()}`,
    };
  }

  // Pattern: "when I write X, highlight/color Y" → display rule
  const rulePatterns = [
    /(?:when\s+(?:i\s+)?(?:write|type|see)\s+)(.+?)(?:,\s*|\s+)(highlight|color|make|show)\s+(.+)/i,
    /(?:highlight|color|make)\s+(?:this|it|".*?")\s+(.+)/i,
  ];

  for (const pattern of rulePatterns) {
    const match = instruction.match(pattern);
    if (match) {
      const color = extractColor(instruction) || '#f59e0b';
      const shape = extractShape(instruction) || 'highlight';
      const trigger = match[1]?.trim() || selectedText;
      return {
        type: 'rule',
        rule: {
          trigger,
          triggerType: 'text',
          color,
          shape,
          opacity: 1.0,
          scope: lower.includes('global') || lower.includes('everywhere') ? 'global' : 'local',
          docPath,
        },
        description: `Display rule: "${trigger}" → ${color} ${shape}`,
      };
    }
  }

  // Simple highlight pattern: "highlight amber" / "make this blue"
  if (/^(?:highlight|color|make\s+(?:this|it))\s+/i.test(lower)) {
    const color = extractColor(instruction) || '#f59e0b';
    const shape = extractShape(instruction) || 'highlight';
    return {
      type: 'rule',
      rule: {
        trigger: selectedText,
        triggerType: 'text',
        color,
        shape,
        opacity: 1.0,
        scope: lower.includes('global') || lower.includes('everywhere') ? 'global' : 'local',
        docPath,
      },
      description: `Display rule: "${selectedText}" → ${color} ${shape}`,
    };
  }

  // Pattern: "this is canonical/the canonical X" → canonical anchor
  const canonicalPatterns = [
    /(?:this\s+is\s+)?(?:the\s+)?canonical\s+(.+)/i,
    /(?:this\s+is\s+)(?:a\s+|the\s+)?(.+)/i,
    /(?:mark|set|declare)\s+(?:as|this\s+as)\s+(.+)/i,
  ];

  // Check for load-bearing / contradiction watch
  const isLoadBearing = lower.includes('load-bearing') || lower.includes('load bearing');
  const watchContradictions = lower.includes('contradict') || lower.includes('flag if');

  for (const pattern of canonicalPatterns) {
    const match = instruction.match(pattern);
    if (match) {
      const label = match[1].replace(/[."']+$/g, '').trim();
      return {
        type: 'anchor',
        anchor: {
          text: selectedText,
          label,
          grain: selectedText.split(/\s+/).length <= 1 ? 'word'
            : selectedText.length < 80 ? 'sentence' : 'block',
          scope: lower.includes('global') || lower.includes('everywhere') ? 'global' : 'local',
          locked: lower.includes('lock') || lower.includes('canonical') || lower.includes('frozen'),
          docPath,
          contradictionWatch: watchContradictions || isLoadBearing,
        },
        description: `Anchor: "${selectedText}" → ${label}`,
      };
    }
  }

  // Fallback: if it has load-bearing/flag keywords, treat as anchor
  if (isLoadBearing || watchContradictions) {
    return {
      type: 'anchor',
      anchor: {
        text: selectedText,
        label: isLoadBearing ? 'load-bearing' : 'watched',
        grain: selectedText.split(/\s+/).length <= 1 ? 'word' : 'sentence',
        scope: 'local',
        locked: false,
        docPath,
        contradictionWatch: true,
      },
      description: `Anchor: "${selectedText}" → load-bearing (contradiction watch)`,
    };
  }

  return { type: 'unknown', description: instruction };
}

// ─── Get Display Style for a Match ───────────────────────────

export interface DisplayStyle {
  backgroundColor?: string;
  borderColor?: string;
  textDecorationLine?: string;
  textDecorationColor?: string;
  outline?: string;
  opacity?: number;
}

export function getDisplayStyle(rule: DisplayRule): DisplayStyle {
  const style: DisplayStyle = {};

  switch (rule.shape) {
    case 'highlight':
      style.backgroundColor = rule.color + '30';
      break;
    case 'underline':
      style.textDecorationLine = 'underline';
      style.textDecorationColor = rule.color;
      break;
    case 'box':
      style.borderColor = rule.color;
      style.backgroundColor = rule.color + '10';
      break;
    case 'circle':
      style.outline = `2px solid ${rule.color}`;
      break;
    case 'none':
      break;
  }

  if (rule.opacity < 1.0) {
    style.opacity = rule.opacity;
  }

  return style;
}
