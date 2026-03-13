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

export type AiProvider = 'anthropic' | 'openai';
export type DockLauncherType = 'internal' | 'url' | 'path';
export type DockInternalTarget = 'editor' | 'logic_sheet' | 'ai_workspace' | 'ai_panel';
export type QuickPlaceMode = 'notebook' | 'path';

export interface DockLauncher {
  id: string;
  name: string;
  icon: string;
  type: DockLauncherType;
  target: string;
  pinned: boolean;
  core?: boolean;
}

export interface QuickPlace {
  id: string;
  name: string;
  path: string;
  mode: QuickPlaceMode;
  pinned: boolean;
}

export interface ForgeSettings {
  autosaveDelayMs: number;
  aiUseWorkspaceContext: boolean;
  aiProvider: AiProvider;
  topPromptBarEnabled: boolean;
  miniApps: MiniApp[];
  dockLaunchers: DockLauncher[];
  quickPlaces: QuickPlace[];
  uiFontFamily: string;
  uiBaseFontPx: number;
  editorFontPx: number;
}
