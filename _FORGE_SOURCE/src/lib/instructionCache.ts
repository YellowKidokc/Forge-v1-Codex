import type { InlineContext } from '../components/Editor/InlineAiChat';

export interface CachedInstruction {
  id: string;
  instruction: string;
  pattern: string;
  action: 'rewrite' | 'tag' | 'link' | 'summarize' | 'format' | 'unknown';
  createdAt: number;
  uses: number;
}

const STORAGE_KEY = 'forge.instruction-cache.v1';

function uid(): string {
  return `inst_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function getInstructionCache(): CachedInstruction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setInstructionCache(items: CachedInstruction[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 200)));
}

function inferAction(instruction: string): CachedInstruction['action'] {
  const lower = instruction.toLowerCase();
  if (/(rewrite|fix|improve|correct|translate|simplify|expand)/.test(lower)) return 'rewrite';
  if (/(tag|label|canonical|classify)/.test(lower)) return 'tag';
  if (/(link|wikilink|reference|connect)/.test(lower)) return 'link';
  if (/(summary|summarize|tldr)/.test(lower)) return 'summarize';
  if (/(format|style|heading|bold|italic)/.test(lower)) return 'format';
  return 'unknown';
}

function inferPattern(instruction: string, context: InlineContext): string {
  const quoted = instruction.match(/"([^"]+)"/);
  if (quoted?.[1]) return quoted[1];
  if (context.selectedText) return context.selectedText;
  return instruction;
}

export function cacheInstruction(instruction: string, context: InlineContext): CachedInstruction {
  const existing = getInstructionCache();
  const pattern = inferPattern(instruction, context);
  const action = inferAction(instruction);

  const dupeIdx = existing.findIndex((entry) =>
    entry.pattern.toLowerCase() === pattern.toLowerCase() && entry.action === action,
  );

  if (dupeIdx >= 0) {
    const current = existing[dupeIdx];
    const updated: CachedInstruction = { ...current, instruction, uses: current.uses + 1 };
    existing.splice(dupeIdx, 1);
    existing.unshift(updated);
    setInstructionCache(existing);
    return updated;
  }

  const item: CachedInstruction = {
    id: uid(),
    instruction,
    pattern,
    action,
    createdAt: Date.now(),
    uses: 1,
  };
  existing.unshift(item);
  setInstructionCache(existing);
  return item;
}
