import {
  ForgeSettings,
  AiProvider,
  DockLauncher,
  DockLauncherType,
  QuickPlace,
  QuickPlaceMode,
} from './types';

export const SETTINGS_STORAGE_KEY = 'forge_settings_v1';

function isDockLauncherType(value: unknown): value is DockLauncherType {
  return value === 'internal' || value === 'url' || value === 'path';
}

function isQuickPlaceMode(value: unknown): value is QuickPlaceMode {
  return value === 'notebook' || value === 'path';
}

function normalizeLauncherName(value: string, fallback: string): string {
  const trimmed = value.trim();
  return trimmed || fallback;
}

function normalizeFontPx(value: unknown, fallback: number, min: number, max: number): number {
  const numeric = typeof value === 'number' ? value : fallback;
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, Math.round(numeric)));
}

export function getDefaultDockLaunchers(): DockLauncher[] {
  return [
    {
      id: 'core-editor',
      name: 'Editor',
      icon: '📝',
      type: 'internal',
      target: 'editor',
      pinned: true,
      core: true,
    },
    {
      id: 'core-logic',
      name: 'Logic',
      icon: '▦',
      type: 'internal',
      target: 'logic_sheet',
      pinned: true,
      core: true,
    },
    {
      id: 'core-ai-workspace',
      name: 'AI Workspace',
      icon: '◇',
      type: 'internal',
      target: 'ai_workspace',
      pinned: true,
      core: true,
    },
    {
      id: 'core-ai-panel',
      name: 'AI Panel',
      icon: '◉',
      type: 'internal',
      target: 'ai_panel',
      pinned: true,
      core: true,
    },
  ];
}

function parseProvider(value: unknown): AiProvider {
  return value === 'openai' ? 'openai' : 'anthropic';
}

function normalizeAutosaveDelayInternal(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(500, Math.min(10000, Math.round(value)));
}

function parseMiniApps(parsed: unknown): ForgeSettings['miniApps'] {
  if (!Array.isArray(parsed)) return [];
  return parsed
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
    }));
}

function parseQuickPlaces(parsed: unknown): QuickPlace[] {
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter(
      (item: unknown) =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as { id?: unknown }).id === 'string' &&
        typeof (item as { name?: unknown }).name === 'string' &&
        typeof (item as { path?: unknown }).path === 'string' &&
        isQuickPlaceMode((item as { mode?: unknown }).mode) &&
        typeof (item as { pinned?: unknown }).pinned === 'boolean'
    )
    .map((item: QuickPlace) => ({
      id: item.id,
      name: item.name.trim() || 'Place',
      path: item.path.trim(),
      mode: item.mode,
      pinned: item.pinned,
    }))
    .filter((item) => item.path.length > 0);
}

function parseDockLaunchers(raw: unknown, miniApps: ForgeSettings['miniApps']): DockLauncher[] {
  const defaults = getDefaultDockLaunchers();

  const parsedLaunchers = Array.isArray(raw)
    ? raw
        .filter(
          (item: unknown) =>
            typeof item === 'object' &&
            item !== null &&
            typeof (item as { id?: unknown }).id === 'string' &&
            typeof (item as { name?: unknown }).name === 'string' &&
            typeof (item as { icon?: unknown }).icon === 'string' &&
            isDockLauncherType((item as { type?: unknown }).type) &&
            typeof (item as { target?: unknown }).target === 'string' &&
            typeof (item as { pinned?: unknown }).pinned === 'boolean'
        )
        .map((item: DockLauncher) => ({
          id: item.id,
          name: normalizeLauncherName(item.name, 'Launcher'),
          icon: item.icon.trim() || '◻',
          type: item.type,
          target: item.target,
          pinned: item.pinned,
          core: Boolean(item.core),
        }))
    : [];

  const byId = new Map<string, DockLauncher>();

  for (const launcher of defaults) {
    byId.set(launcher.id, launcher);
  }

  for (const launcher of parsedLaunchers) {
    byId.set(launcher.id, launcher);
  }

  for (const app of miniApps) {
    const id = `mini-${app.id}`;
    if (!byId.has(id)) {
      byId.set(id, {
        id,
        name: normalizeLauncherName(app.name, 'Mini App'),
        icon: '✦',
        type: 'url',
        target: app.url,
        pinned: true,
      });
    }
  }

  return [...byId.values()];
}

export const DEFAULT_SETTINGS: ForgeSettings = {
  autosaveDelayMs: 2000,
  aiUseWorkspaceContext: true,
  aiProvider: 'anthropic',
  topPromptBarEnabled: true,
  miniApps: [],
  dockLaunchers: getDefaultDockLaunchers(),
  quickPlaces: [],
  uiFontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif',
  uiBaseFontPx: 16,
  editorFontPx: 15,
};

export function normalizeAutosaveDelay(value: number): number {
  return normalizeAutosaveDelayInternal(value, DEFAULT_SETTINGS.autosaveDelayMs);
}

export function parseSettings(raw: string | null): ForgeSettings {
  if (!raw) {
    return DEFAULT_SETTINGS;
  }

  try {
    const parsed = JSON.parse(raw);
    const miniApps = parseMiniApps(parsed?.miniApps);

    return {
      autosaveDelayMs: normalizeAutosaveDelayInternal(
        typeof parsed?.autosaveDelayMs === 'number'
          ? parsed.autosaveDelayMs
          : DEFAULT_SETTINGS.autosaveDelayMs,
        DEFAULT_SETTINGS.autosaveDelayMs
      ),
      aiUseWorkspaceContext: true,
      aiProvider: parseProvider(parsed?.aiProvider),
      topPromptBarEnabled:
        typeof parsed?.topPromptBarEnabled === 'boolean'
          ? parsed.topPromptBarEnabled
          : DEFAULT_SETTINGS.topPromptBarEnabled,
      miniApps,
      dockLaunchers: parseDockLaunchers(parsed?.dockLaunchers, miniApps),
      quickPlaces: parseQuickPlaces(parsed?.quickPlaces),
      uiFontFamily:
        typeof parsed?.uiFontFamily === 'string' && parsed.uiFontFamily.trim().length > 0
          ? parsed.uiFontFamily
          : DEFAULT_SETTINGS.uiFontFamily,
      uiBaseFontPx: normalizeFontPx(parsed?.uiBaseFontPx, DEFAULT_SETTINGS.uiBaseFontPx, 14, 21),
      editorFontPx: normalizeFontPx(parsed?.editorFontPx, DEFAULT_SETTINGS.editorFontPx, 13, 22),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
