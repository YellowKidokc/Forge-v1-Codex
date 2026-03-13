import type { AiRole } from './types';

export type AiRuntimeEventKind = 'message' | 'command' | 'error';
export type AiRuntimeEventStatus = 'completed' | 'failed';

export interface AiRuntimeEvent {
  id: string;
  role: AiRole;
  kind: AiRuntimeEventKind;
  summary: string;
  provider: string;
  model: string;
  status: AiRuntimeEventStatus;
  createdAt: number;
}

const AI_RUNTIME_EVENTS_KEY = 'forge_ai_runtime_events_v1';
const MAX_EVENTS = 120;
const DEFAULT_COOLDOWN_MS = 1000 * 60 * 8;

function parseEvents(raw: string | null): AiRuntimeEvent[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item: unknown): item is AiRuntimeEvent =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as AiRuntimeEvent).id === 'string' &&
        typeof (item as AiRuntimeEvent).role === 'string' &&
        typeof (item as AiRuntimeEvent).kind === 'string' &&
        typeof (item as AiRuntimeEvent).summary === 'string' &&
        typeof (item as AiRuntimeEvent).provider === 'string' &&
        typeof (item as AiRuntimeEvent).model === 'string' &&
        typeof (item as AiRuntimeEvent).status === 'string' &&
        typeof (item as AiRuntimeEvent).createdAt === 'number'
    );
  } catch {
    return [];
  }
}

function writeEvents(events: AiRuntimeEvent[]): void {
  localStorage.setItem(AI_RUNTIME_EVENTS_KEY, JSON.stringify(events.slice(0, MAX_EVENTS)));
}

export function getAiRuntimeEvents(): AiRuntimeEvent[] {
  return parseEvents(localStorage.getItem(AI_RUNTIME_EVENTS_KEY))
    .sort((a, b) => b.createdAt - a.createdAt);
}

function normalizeSummary(summary: string): string {
  return summary.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function shouldLogAiRuntimeEvent(
  event: Omit<AiRuntimeEvent, 'id' | 'createdAt'>,
  cooldownMs = DEFAULT_COOLDOWN_MS
): boolean {
  const current = getAiRuntimeEvents();
  const normalized = normalizeSummary(event.summary);
  return !current.some((existing) => {
    if (existing.role !== event.role) return false;
    if (existing.kind !== event.kind) return false;
    if (existing.status !== event.status) return false;
    if (existing.provider !== event.provider) return false;
    if (existing.model !== event.model) return false;
    if (Date.now() - existing.createdAt > cooldownMs) return false;
    return normalizeSummary(existing.summary) === normalized;
  });
}

export function appendAiRuntimeEvent(
  event: Omit<AiRuntimeEvent, 'id' | 'createdAt'>,
  cooldownMs = DEFAULT_COOLDOWN_MS
): AiRuntimeEvent | null {
  if (!shouldLogAiRuntimeEvent(event, cooldownMs)) {
    return null;
  }

  const fullEvent: AiRuntimeEvent = {
    ...event,
    id: `${event.role}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  };
  const current = getAiRuntimeEvents();
  writeEvents([fullEvent, ...current]);
  return fullEvent;
}

export function clearAiRuntimeEvents(): void {
  localStorage.removeItem(AI_RUNTIME_EVENTS_KEY);
}

export function summarizeAiText(text: string, limit = 96): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '(empty)';
  if (cleaned.length <= limit) return cleaned;
  return `${cleaned.slice(0, limit - 1)}…`;
}
