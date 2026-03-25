export type AnnotationScope = 'local' | 'global';

export interface CanonicalAnchor {
  id: string;
  label: string;
  text: string;
  grain: 'document' | 'paragraph' | 'sentence' | 'selection';
  scope: AnnotationScope;
  locked: boolean;
  createdAt: number;
}

export interface DisplayRule {
  id: string;
  trigger: string;
  color: string;
  shape: 'underline' | 'circle' | 'pill' | 'background';
  opacity: number;
  scope: AnnotationScope;
  createdAt: number;
}

export interface ExpansionMacro {
  id: string;
  abbreviation: string;
  expansion: string;
  scope: AnnotationScope;
  createdAt: number;
}

interface AnnotationState {
  anchors: CanonicalAnchor[];
  displayRules: DisplayRule[];
  macros: ExpansionMacro[];
}

const STORAGE_KEY = 'forge.annotations.v1';
const MAX_ANCHORS = 500;
const MAX_DISPLAY_RULES = 200;
const MAX_MACROS = 200;

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function readState(): AnnotationState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { anchors: [], displayRules: [], macros: [] };
    const parsed = JSON.parse(raw);
    return {
      anchors: Array.isArray(parsed.anchors) ? parsed.anchors : [],
      displayRules: Array.isArray(parsed.displayRules) ? parsed.displayRules : [],
      macros: Array.isArray(parsed.macros) ? parsed.macros : [],
    };
  } catch {
    return { anchors: [], displayRules: [], macros: [] };
  }
}

function writeState(state: AnnotationState) {
  state.anchors = state.anchors.slice(0, MAX_ANCHORS);
  state.displayRules = state.displayRules.slice(0, MAX_DISPLAY_RULES);
  state.macros = state.macros.slice(0, MAX_MACROS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getAnnotations() {
  return readState();
}

export function addCanonicalAnchor(input: Omit<CanonicalAnchor, 'id' | 'createdAt'>): CanonicalAnchor {
  const state = readState();
  const anchor: CanonicalAnchor = { ...input, id: uid('anchor'), createdAt: Date.now() };
  state.anchors.unshift(anchor);
  if (state.anchors.length > MAX_ANCHORS) {
    state.anchors = state.anchors.slice(0, MAX_ANCHORS);
  }
  writeState(state);
  return anchor;
}

export function addDisplayRule(input: Omit<DisplayRule, 'id' | 'createdAt'>): DisplayRule {
  const state = readState();
  const rule: DisplayRule = { ...input, id: uid('rule'), createdAt: Date.now() };
  state.displayRules.unshift(rule);
  if (state.displayRules.length > MAX_DISPLAY_RULES) {
    state.displayRules = state.displayRules.slice(0, MAX_DISPLAY_RULES);
  }
  writeState(state);
  return rule;
}

export function addExpansionMacro(input: Omit<ExpansionMacro, 'id' | 'createdAt'>): ExpansionMacro {
  const state = readState();
  const macro: ExpansionMacro = { ...input, id: uid('macro'), createdAt: Date.now() };
  state.macros.unshift(macro);
  if (state.macros.length > MAX_MACROS) {
    state.macros = state.macros.slice(0, MAX_MACROS);
  }
  writeState(state);
  return macro;
}
