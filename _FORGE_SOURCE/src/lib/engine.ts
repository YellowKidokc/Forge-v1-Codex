import { invoke } from '@tauri-apps/api/core';

export interface EngineEntry {
  id: string;
  config_path: string;
  script_path: string | null;
  raw_yaml: string;
}

export interface EngineRunResult {
  engine_id: string;
  ok: boolean;
  stdout: string;
  stderr: string;
}

export interface ParsedEngineConfig {
  engine: string;
  trigger: string;
  enabled: boolean;
  [key: string]: unknown;
}

export async function scanEngines(): Promise<EngineEntry[]> {
  return invoke<EngineEntry[]>('scan_engines');
}

export async function readEngineConfig(engineId: string): Promise<string> {
  return invoke<string>('read_engine_config', { engineId });
}

export async function writeEngineConfig(engineId: string, content: string): Promise<void> {
  return invoke<void>('write_engine_config', { engineId, content });
}

export async function runEngine(engineId: string): Promise<EngineRunResult> {
  return invoke<EngineRunResult>('run_engine', { engineId });
}

/** Simple YAML parser for engine configs (handles flat key: value pairs) */
export function parseYaml(raw: string): ParsedEngineConfig {
  const result: Record<string, unknown> = {
    engine: 'unknown',
    trigger: 'manual',
    enabled: true,
  };

  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;

    const key = trimmed.slice(0, colonIdx).trim();
    let value: unknown = trimmed.slice(colonIdx + 1).trim();

    // Remove quotes
    if (typeof value === 'string' && value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }

    // Parse booleans and numbers
    if (value === 'true') value = true;
    else if (value === 'false') value = false;
    else if (typeof value === 'string' && /^\d+(\.\d+)?$/.test(value)) {
      value = parseFloat(value as string);
    }

    result[key] = value;
  }

  return result as ParsedEngineConfig;
}

/** Convert config object back to YAML string */
export function toYaml(config: Record<string, unknown>): string {
  return Object.entries(config)
    .map(([key, value]) => {
      if (typeof value === 'string') return `${key}: "${value}"`;
      return `${key}: ${value}`;
    })
    .join('\n');
}

const ENABLED_ENGINES_KEY = 'forge_enabled_engines_v1';

export function getEnabledEngines(): Set<string> {
  try {
    const raw = localStorage.getItem(ENABLED_ENGINES_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export function setEngineEnabled(engineId: string, enabled: boolean): void {
  const set = getEnabledEngines();
  if (enabled) set.add(engineId);
  else set.delete(engineId);
  localStorage.setItem(ENABLED_ENGINES_KEY, JSON.stringify([...set]));
}
