import { invoke } from '@tauri-apps/api/core';
import type { PythonSidecarResult } from './types';

interface RunPythonSidecarInput {
  mode: string;
  prompt: string;
  selection?: string;
  context?: string;
  model?: string;
}

export async function runPythonSidecar(input: RunPythonSidecarInput): Promise<PythonSidecarResult> {
  const raw = await invoke<string>('run_python_sidecar', {
    request: {
      mode: input.mode,
      prompt: input.prompt,
      selection: input.selection ?? null,
      context: input.context ?? null,
      model: input.model ?? null,
    },
  });

  const parsed = JSON.parse(raw) as PythonSidecarResult;
  return {
    ok: Boolean(parsed.ok),
    engine: parsed.engine || 'python-sidecar',
    summary: parsed.summary || '',
    actions: Array.isArray(parsed.actions) ? parsed.actions : [],
    warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
  };
}
