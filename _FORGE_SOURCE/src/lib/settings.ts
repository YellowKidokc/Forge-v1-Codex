import { ForgeSettings, AiProvider, AiRole, AiRoleConfig } from './types';

export const SETTINGS_STORAGE_KEY = 'forge_settings_v1';

export const DEFAULT_SETTINGS: ForgeSettings = {
  autosaveDelayMs: 2000,
  aiUseWorkspaceContext: true,
  aiProvider: 'ollama',
  aiRoleRouting: 'shared',
  ollamaModel: 'llama3.1:8b',
  aiRoles: {
    interface: { provider: 'ollama', model: 'llama3.1:8b' },
    logic: { provider: 'ollama', model: 'llama3.1:8b' },
    copilot: { provider: 'ollama', model: 'llama3.1:8b' },
  },
  topPromptBarEnabled: true,
  miniApps: [],
};

export function normalizeAutosaveDelay(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SETTINGS.autosaveDelayMs;
  return Math.max(500, Math.min(10000, Math.round(value)));
}

function parseProvider(value: unknown): AiProvider {
  if (value === 'openai' || value === 'anthropic' || value === 'ollama') {
    return value;
  }
  return DEFAULT_SETTINGS.aiProvider;
}

function normalizeOllamaModel(value: unknown): string {
  if (typeof value !== 'string') return DEFAULT_SETTINGS.ollamaModel;
  const trimmed = value.trim();
  return trimmed || DEFAULT_SETTINGS.ollamaModel;
}

function parseRoleRouting(value: unknown): ForgeSettings['aiRoleRouting'] {
  return value === 'split' ? 'split' : 'shared';
}

function normalizeRoleConfig(value: unknown, fallback: AiRoleConfig): AiRoleConfig {
  if (typeof value !== 'object' || value === null) {
    return fallback;
  }
  const provider = parseProvider((value as { provider?: unknown }).provider);
  const model = normalizeOllamaModel((value as { model?: unknown }).model);
  return { provider, model };
}

function parseRoleConfigs(value: unknown): Record<AiRole, AiRoleConfig> {
  const incoming = typeof value === 'object' && value !== null ? value as Partial<Record<AiRole, unknown>> : {};
  return {
    interface: normalizeRoleConfig(incoming.interface, DEFAULT_SETTINGS.aiRoles.interface),
    logic: normalizeRoleConfig(incoming.logic, DEFAULT_SETTINGS.aiRoles.logic),
    copilot: normalizeRoleConfig(incoming.copilot, DEFAULT_SETTINGS.aiRoles.copilot),
  };
}

export function parseSettings(raw: string | null): ForgeSettings {
  if (!raw) {
    return DEFAULT_SETTINGS;
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      autosaveDelayMs: normalizeAutosaveDelay(
        typeof parsed?.autosaveDelayMs === 'number'
          ? parsed.autosaveDelayMs
          : DEFAULT_SETTINGS.autosaveDelayMs
      ),
      // Force context sharing on so every AI mode sees current work context.
      aiUseWorkspaceContext: true,
      aiProvider: parseProvider(parsed?.aiProvider),
      aiRoleRouting: parseRoleRouting(parsed?.aiRoleRouting),
      ollamaModel: normalizeOllamaModel(parsed?.ollamaModel),
      aiRoles: parseRoleConfigs(parsed?.aiRoles),
      topPromptBarEnabled:
        typeof parsed?.topPromptBarEnabled === 'boolean'
          ? parsed.topPromptBarEnabled
          : DEFAULT_SETTINGS.topPromptBarEnabled,
      miniApps: Array.isArray(parsed?.miniApps)
        ? parsed.miniApps
            .filter(
              (item: unknown) =>
                typeof item === 'object' &&
                item !== null &&
                typeof (item as { id?: unknown }).id === 'string' &&
                typeof (item as { name?: unknown }).name === 'string' &&
                typeof (item as { url?: unknown }).url === 'string'
            )
            .map((item: { id: string; name: string; url: string }) => ({
              id: item.id,
              name: item.name,
              url: item.url,
            }))
        : [],
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
