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
  aiUseWorkspaceContext: boolean;
  aiProvider: AiProvider;
  aiRoleRouting: AiRoleRouting;
  ollamaModel: string;
  aiRoles: Record<AiRole, AiRoleConfig>;
  topPromptBarEnabled: boolean;
  miniApps: MiniApp[];
}

// ─── Chat Persistence Types ─────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChatThread {
  id: string;
  title: string;
  folderId: string | null;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

export interface ChatFolder {
  id: string;
  name: string;
  order: number;
}

export interface PromptSnippet {
  id: string;
  title: string;
  content: string;
  tags: string[];
  order: number;
}

// ─── Python Sidecar Types ───────────────────────────────────────

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
