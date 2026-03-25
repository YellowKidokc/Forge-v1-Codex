import { ForgeSettings, AiProvider, AiRole, AiRoleConfig } from './types';

export const SETTINGS_STORAGE_KEY = 'forge_settings_v1';

export const DEFAULT_SETTINGS: ForgeSettings = {
  autosaveDelayMs: 2000,
  editorFontFamily: 'Inter, system-ui, sans-serif',
  editorFontSize: 16,
  editorLineHeight: 1.7,
  editorMaxWidth: 720,
  editorTheme: 'dark',
  editorAccentColor: '#e8a912',
  spellcheck: false,
  vimMode: false,
  showLineNumbers: false,
  tabSize: 4,
  autoPairBrackets: true,
  foldHeadings: false,
  defaultNewNoteLocation: 'root',
  trashMethod: 'system',
  excludedFolders: ['_data', '_engines'],
  attachmentFolder: '_attachments',
  enableBackgroundAi: true,
  backgroundAiDebounce: 6000,
  aiMaxTokens: 2048,
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

function normalizeEditorFontFamily(value: unknown): string {
  if (typeof value !== 'string') return DEFAULT_SETTINGS.editorFontFamily;
  const trimmed = value.trim();
  return trimmed || DEFAULT_SETTINGS.editorFontFamily;
}

function normalizeEditorFontSize(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_SETTINGS.editorFontSize;
  return Math.max(12, Math.min(24, Math.round(value)));
}

function normalizeEditorLineHeight(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_SETTINGS.editorLineHeight;
  return Math.max(1.2, Math.min(2.4, Math.round(value * 10) / 10));
}

function normalizeEditorMaxWidth(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_SETTINGS.editorMaxWidth;
  return Math.max(480, Math.min(1200, Math.round(value / 40) * 40));
}

function parseEditorTheme(value: unknown): ForgeSettings['editorTheme'] {
  return value === 'darker' || value === 'midnight' ? value : 'dark';
}

function normalizeAccent(value: unknown): string {
  if (typeof value !== 'string') return DEFAULT_SETTINGS.editorAccentColor;
  const trimmed = value.trim();
  return trimmed || DEFAULT_SETTINGS.editorAccentColor;
}

function normalizeTabSize(value: unknown): ForgeSettings['tabSize'] {
  return value === 2 || value === 8 ? value : 4;
}

function parseNewNoteLocation(value: unknown): ForgeSettings['defaultNewNoteLocation'] {
  return value === 'same-folder' ? 'same-folder' : 'root';
}

function parseTrashMethod(value: unknown): ForgeSettings['trashMethod'] {
  if (value === 'vault-trash' || value === 'permanent') return value;
  return 'system';
}

function normalizeExcludedFolders(value: unknown): string[] {
  if (!Array.isArray(value)) return [...DEFAULT_SETTINGS.excludedFolders];
  return value
    .filter((folder): folder is string => typeof folder === 'string' && folder.trim().length > 0)
    .map((folder) => folder.trim());
}

function normalizeAttachmentFolder(value: unknown): string {
  if (typeof value !== 'string') return DEFAULT_SETTINGS.attachmentFolder;
  const trimmed = value.trim();
  return trimmed || DEFAULT_SETTINGS.attachmentFolder;
}

function normalizeBackgroundDebounce(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_SETTINGS.backgroundAiDebounce;
  return Math.max(3000, Math.min(30000, Math.round(value / 1000) * 1000));
}

function normalizeAiMaxTokens(value: unknown): ForgeSettings['aiMaxTokens'] {
  return value === 1024 || value === 4096 || value === 8192 ? value : 2048;
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
      editorFontFamily: normalizeEditorFontFamily(parsed?.editorFontFamily),
      editorFontSize: normalizeEditorFontSize(parsed?.editorFontSize),
      editorLineHeight: normalizeEditorLineHeight(parsed?.editorLineHeight),
      editorMaxWidth: normalizeEditorMaxWidth(parsed?.editorMaxWidth),
      editorTheme: parseEditorTheme(parsed?.editorTheme),
      editorAccentColor: normalizeAccent(parsed?.editorAccentColor),
      spellcheck: typeof parsed?.spellcheck === 'boolean' ? parsed.spellcheck : DEFAULT_SETTINGS.spellcheck,
      vimMode: typeof parsed?.vimMode === 'boolean' ? parsed.vimMode : DEFAULT_SETTINGS.vimMode,
      showLineNumbers:
        typeof parsed?.showLineNumbers === 'boolean'
          ? parsed.showLineNumbers
          : DEFAULT_SETTINGS.showLineNumbers,
      tabSize: normalizeTabSize(parsed?.tabSize),
      autoPairBrackets:
        typeof parsed?.autoPairBrackets === 'boolean'
          ? parsed.autoPairBrackets
          : DEFAULT_SETTINGS.autoPairBrackets,
      foldHeadings:
        typeof parsed?.foldHeadings === 'boolean'
          ? parsed.foldHeadings
          : DEFAULT_SETTINGS.foldHeadings,
      defaultNewNoteLocation: parseNewNoteLocation(parsed?.defaultNewNoteLocation),
      trashMethod: parseTrashMethod(parsed?.trashMethod),
      excludedFolders: normalizeExcludedFolders(parsed?.excludedFolders),
      attachmentFolder: normalizeAttachmentFolder(parsed?.attachmentFolder),
      enableBackgroundAi:
        typeof parsed?.enableBackgroundAi === 'boolean'
          ? parsed.enableBackgroundAi
          : DEFAULT_SETTINGS.enableBackgroundAi,
      backgroundAiDebounce: normalizeBackgroundDebounce(parsed?.backgroundAiDebounce),
      aiMaxTokens: normalizeAiMaxTokens(parsed?.aiMaxTokens),
      aiUseWorkspaceContext:
        typeof parsed?.aiUseWorkspaceContext === 'boolean'
          ? parsed.aiUseWorkspaceContext
          : DEFAULT_SETTINGS.aiUseWorkspaceContext,
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
