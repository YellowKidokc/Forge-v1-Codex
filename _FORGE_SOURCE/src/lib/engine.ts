import { invoke } from '@tauri-apps/api/core';

export interface EngineEntry {
  id: string;
  name: string;
  file: string;
  enabled: boolean;
  trigger: string;
}

export async function ensureEngineFolder(): Promise<string> {
  return invoke<string>('ensure_engine_folder');
}

export async function getEngines(): Promise<EngineEntry[]> {
  return invoke<EngineEntry[]>('get_engines');
}

export async function createEngine(file: string, name: string, trigger: string, enabled = false): Promise<string> {
  return invoke<string>('create_engine', { file, name, trigger, enabled });
}

export async function toggleEngine(file: string, enabled: boolean): Promise<void> {
  return invoke('toggle_engine', { file, enabled });
}
