export interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  children?: FileEntry[];
}

export interface NoteState {
  path: string;
  content: string;
  modified: boolean;
  lastSaved: number | null;
}

export interface SavedNotebook {
  path: string;
  name: string;
  lastOpened: number;
}

export interface NoteMetadata {
  tags: string[];
  links: string[];
}

export interface MiniApp {
  id: string;
  name: string;
  url: string;
}

export type AiProvider = 'anthropic' | 'openai' | 'ollama';
export type AiRole = 'interface' | 'logic' | 'copilot';
export type AiRoleRouting = 'shared' | 'split';

export interface AiRoleConfig {
  provider: AiProvider;
  model: string;
}

export interface ForgeSettings {
  autosaveDelayMs: number;
  editorFontFamily: string;
  editorFontSize: number;
  editorLineHeight: number;
  editorMaxWidth: number;
  editorTheme: 'dark' | 'darker' | 'midnight';
  editorAccentColor: string;
  spellcheck: boolean;
  vimMode: boolean;
  showLineNumbers: boolean;
  tabSize: 2 | 4 | 8;
  autoPairBrackets: boolean;
  foldHeadings: boolean;
  defaultNewNoteLocation: 'root' | 'same-folder';
  trashMethod: 'system' | 'vault-trash' | 'permanent';
  excludedFolders: string[];
  attachmentFolder: string;
  enableBackgroundAi: boolean;
  backgroundAiDebounce: number;
  aiMaxTokens: 1024 | 2048 | 4096 | 8192;
  aiUseWorkspaceContext: boolean;
  aiProvider: AiProvider;
  aiRoleRouting: AiRoleRouting;
  ollamaModel: string;
  aiRoles: Record<AiRole, AiRoleConfig>;
  topPromptBarEnabled: boolean;
  miniApps: MiniApp[];
}

export type EditorSettings = Pick<
  ForgeSettings,
  | 'autosaveDelayMs'
  | 'editorFontFamily'
  | 'editorFontSize'
  | 'editorLineHeight'
  | 'editorMaxWidth'
  | 'editorTheme'
  | 'editorAccentColor'
  | 'spellcheck'
  | 'vimMode'
  | 'showLineNumbers'
  | 'tabSize'
  | 'autoPairBrackets'
  | 'foldHeadings'
>;

export interface PythonSidecarAction {
  type: string;
  [key: string]: unknown;
}

export interface PythonSidecarResult {
  ok: boolean;
  engine: string;
  summary: string;
  actions: PythonSidecarAction[];
  warnings: string[];
}
