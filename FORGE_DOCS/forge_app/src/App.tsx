import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { openPath, openUrl } from '@tauri-apps/plugin-opener';
import Sidebar from './components/Sidebar';
import ForgeEditor from './components/Editor/ForgeEditor';
import AiPanel from './components/AiPanel';
import TopCommandBar from './components/TopCommandBar';
import SettingsPage from './components/SettingsPage';
import LogicSheet from './components/miniapps/LogicSheet';
import AIWorkspace from './components/AIWorkspace';
import ForgeDock from './components/ForgeDock';
import {
  FileEntry,
  NoteMetadata,
  SavedNotebook,
  ForgeSettings,
  MiniApp,
  DockLauncher,
  DockInternalTarget,
  QuickPlace,
} from './lib/types';
import { DEFAULT_SETTINGS, parseSettings, SETTINGS_STORAGE_KEY } from './lib/settings';

const NOTEBOOKS_STORAGE_KEY = 'forge_saved_notebooks_v1';
const ACTIVE_NOTEBOOK_STORAGE_KEY = 'forge_active_notebook_v1';

const EMPTY_METADATA: NoteMetadata = { tags: [], links: [] };

type CenterView = 'editor' | 'logic_sheet' | 'ai_workspace';
type PromptMode = 'interface' | 'logic' | 'copilot';

interface PromptPacket {
  id: number;
  text: string;
  mode?: PromptMode;
}

function isDockInternalTarget(value: string): value is DockInternalTarget {
  return (
    value === 'editor' ||
    value === 'logic_sheet' ||
    value === 'ai_workspace' ||
    value === 'ai_panel'
  );
}

function normalizePath(path: string): string {
  return path.trim().replace(/[\\/]+$/, '');
}

function getNotebookName(path: string): string {
  const pieces = path.split(/[\\/]/).filter(Boolean);
  return pieces[pieces.length - 1] || path;
}

function createItemId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}`;
}

function touchNotebook(list: SavedNotebook[], path: string): SavedNotebook[] {
  const now = Date.now();
  return list
    .map((notebook) =>
      notebook.path === path ? { ...notebook, lastOpened: now } : notebook
    )
    .sort((a, b) => b.lastOpened - a.lastOpened);
}

function flattenEntryNames(entries: FileEntry[], out: string[] = [], depth = 0): string[] {
  if (depth > 3) return out;
  for (const entry of entries) {
    out.push(entry.name);
    if (entry.children?.length) {
      flattenEntryNames(entry.children, out, depth + 1);
    }
    if (out.length >= 120) return out;
  }
  return out;
}

function App() {
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [, setModified] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [savedNotebooks, setSavedNotebooks] = useState<SavedNotebook[]>([]);
  const [activeNotebookPath, setActiveNotebookPath] = useState<string | null>(null);
  const [noteMetadata, setNoteMetadata] = useState<NoteMetadata>(EMPTY_METADATA);
  const [activeNoteMarkdown, setActiveNoteMarkdown] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<ForgeSettings>(DEFAULT_SETTINGS);
  const [centerView, setCenterView] = useState<CenterView>('editor');
  const [filesSnapshot, setFilesSnapshot] = useState<FileEntry[]>([]);
  const [queuedPrompt, setQueuedPrompt] = useState<PromptPacket | null>(null);
  const promptCounterRef = useRef(1);
  const pendingUrlLauncherIdRef = useRef<string | null>(null);

  useEffect(() => {
    const launcherId = new URL(window.location.href).searchParams.get('launcher');
    pendingUrlLauncherIdRef.current = launcherId;
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setAiPanelOpen((prev) => !prev);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        setSettingsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    setSettings(parseSettings(localStorage.getItem(SETTINGS_STORAGE_KEY)));
  }, []);

  useEffect(() => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    document.documentElement.style.fontSize = `${settings.uiBaseFontPx}px`;
    document.documentElement.style.setProperty('--forge-ui-font-family', settings.uiFontFamily);
    document.documentElement.style.setProperty('--forge-editor-font-size', `${settings.editorFontPx}px`);
  }, [settings.editorFontPx, settings.uiBaseFontPx, settings.uiFontFamily]);

  useEffect(() => {
    let parsed: SavedNotebook[] = [];

    try {
      const raw = localStorage.getItem(NOTEBOOKS_STORAGE_KEY);
      if (raw) {
        const maybeList = JSON.parse(raw);
        if (Array.isArray(maybeList)) {
          parsed = maybeList
            .filter((notebook) => notebook && typeof notebook.path === 'string')
            .map((notebook) => ({
              path: normalizePath(notebook.path),
              name: typeof notebook.name === 'string' && notebook.name.trim() ? notebook.name : getNotebookName(notebook.path),
              lastOpened: typeof notebook.lastOpened === 'number' ? notebook.lastOpened : 0,
            }));
        }
      }
    } catch (err) {
      console.error('Failed to parse saved notebooks:', err);
    }

    const deduped = [...new Map(parsed.map((notebook) => [notebook.path, notebook])).values()]
      .sort((a, b) => b.lastOpened - a.lastOpened);

    setSavedNotebooks(deduped);

    const preferred = localStorage.getItem(ACTIVE_NOTEBOOK_STORAGE_KEY);
    const candidate =
      preferred && deduped.some((notebook) => notebook.path === normalizePath(preferred))
        ? normalizePath(preferred)
        : deduped[0]?.path ?? null;

    if (!candidate) {
      return;
    }

    invoke('set_vault', { path: candidate })
      .then(() => {
        setActiveNotebookPath(candidate);
        setSavedNotebooks((prev) => touchNotebook(prev, candidate));
      })
      .catch((err) => {
        console.error('Failed to restore notebook:', err);
      });
  }, []);

  useEffect(() => {
    localStorage.setItem(NOTEBOOKS_STORAGE_KEY, JSON.stringify(savedNotebooks));
  }, [savedNotebooks]);

  useEffect(() => {
    if (activeNotebookPath) {
      localStorage.setItem(ACTIVE_NOTEBOOK_STORAGE_KEY, activeNotebookPath);
    } else {
      localStorage.removeItem(ACTIVE_NOTEBOOK_STORAGE_KEY);
    }
  }, [activeNotebookPath]);

  const queuePrompt = useCallback((text: string, mode?: PromptMode) => {
    setAiPanelOpen(true);
    setQueuedPrompt({
      id: promptCounterRef.current++,
      text,
      mode,
    });
  }, []);

  const activateNotebook = useCallback(async (inputPath: string): Promise<boolean> => {
    const path = normalizePath(inputPath);
    try {
      await invoke('set_vault', { path });
      setActiveNotebookPath(path);
      setActiveFile(null);
      setNoteMetadata(EMPTY_METADATA);
      setSavedNotebooks((prev) => {
        const exists = prev.some((notebook) => notebook.path === path);
        const next = exists
          ? prev
          : [{ path, name: getNotebookName(path), lastOpened: Date.now() }, ...prev];
        return touchNotebook(next, path);
      });
      setRefreshToken((prev) => prev + 1);
      return true;
    } catch (err) {
      console.error('Failed to activate notebook:', err);
      return false;
    }
  }, []);

  const removeNotebook = useCallback(
    async (inputPath: string) => {
      const path = normalizePath(inputPath);
      const next = savedNotebooks.filter((notebook) => notebook.path !== path);
      setSavedNotebooks(next);

      if (activeNotebookPath !== path) {
        return;
      }

      const fallback = next[0]?.path ?? null;
      if (!fallback) {
        setActiveNotebookPath(null);
        setActiveFile(null);
        setNoteMetadata(EMPTY_METADATA);
        return;
      }

      await activateNotebook(fallback);
    },
    [activeNotebookPath, activateNotebook, savedNotebooks]
  );

  const openOrCreateLinkedNote = useCallback(
    async (linkTarget: string) => {
      if (!activeNotebookPath || !linkTarget.trim()) {
        return;
      }
      try {
        const resolvedPath = await invoke<string>('open_or_create_note_by_title', {
          title: linkTarget.trim(),
        });
        setCenterView('editor');
        setActiveFile(resolvedPath);
        setRefreshToken((prev) => prev + 1);
      } catch (err) {
        console.error('Failed to open wiki link:', err);
      }
    },
    [activeNotebookPath]
  );

  const launchMiniApp = useCallback(async (app: MiniApp) => {
    try {
      await openUrl(app.url);
    } catch (err) {
      console.error('Failed to open mini app:', err);
    }
  }, []);

  const openQuickPlace = useCallback(
    async (place: QuickPlace) => {
      const path = place.path.trim();
      if (!path) return;
      if (place.mode === 'notebook') {
        await activateNotebook(path);
        return;
      }
      try {
        await openPath(path);
      } catch (err) {
        console.error('Failed to open quick place path:', err);
      }
    },
    [activateNotebook]
  );

  const pinCurrentNotebook = useCallback(() => {
    if (!activeNotebookPath) {
      return;
    }
    const suggested = getNotebookName(activeNotebookPath);
    const enteredName = prompt('Quick place name:', suggested);
    if (!enteredName) return;
    const name = enteredName.trim() || suggested;
    const path = normalizePath(activeNotebookPath);

    setSettings((prev) => {
      const exists = prev.quickPlaces.some(
        (item) => item.mode === 'notebook' && normalizePath(item.path) === path
      );
      if (exists) return prev;
      return {
        ...prev,
        quickPlaces: [
          ...prev.quickPlaces,
          {
            id: createItemId('place'),
            name,
            path: activeNotebookPath,
            mode: 'notebook',
            pinned: true,
          },
        ],
      };
    });
  }, [activeNotebookPath]);

  const launchInternalTarget = useCallback((target: DockInternalTarget) => {
    if (target === 'ai_panel') {
      setAiPanelOpen(true);
      return;
    }
    setCenterView(target);
  }, []);

  const launchInNewWindow = useCallback((launcher: DockLauncher) => {
    const label = `forge-${launcher.id}-${Date.now().toString(36)}`.replace(/[^a-zA-Z0-9\-/:_]/g, '-');
    const url = new URL(window.location.href);
    url.searchParams.set('launcher', launcher.id);

    const win = new WebviewWindow(label, {
      url: url.toString(),
      title: `FORGE - ${launcher.name}`,
      width: 1440,
      height: 900,
      resizable: true,
      focus: true,
    });

    win.once('tauri://error', (event) => {
      console.error('Failed to create launcher window:', event);
    });
  }, []);

  const launchDockLauncher = useCallback(
    async (launcher: DockLauncher, options?: { openInNewWindow?: boolean }) => {
      try {
        if (options?.openInNewWindow && launcher.type === 'internal') {
          launchInNewWindow(launcher);
          return;
        }

        if (launcher.type === 'internal') {
          if (!isDockInternalTarget(launcher.target)) {
            console.error('Unknown internal launcher target:', launcher.target);
            return;
          }
          launchInternalTarget(launcher.target);
          return;
        }

        if (launcher.type === 'url') {
          await openUrl(launcher.target);
          return;
        }

        if (launcher.type === 'path') {
          await openPath(launcher.target);
        }
      } catch (err) {
        console.error('Failed to launch dock item:', err);
      }
    },
    [launchInNewWindow, launchInternalTarget]
  );

  useEffect(() => {
    const launcherId = pendingUrlLauncherIdRef.current;
    if (!launcherId) return;
    const launcher = settings.dockLaunchers.find((item) => item.id === launcherId);
    if (!launcher) return;
    pendingUrlLauncherIdRef.current = null;
    void launchDockLauncher(launcher);
  }, [launchDockLauncher, settings.dockLaunchers]);

  const workspaceContext = useMemo(() => {
    const fileNames = flattenEntryNames(filesSnapshot).join(', ');
    const noteExcerpt = activeNoteMarkdown.trim()
      ? activeNoteMarkdown.replace(/\s+/g, ' ').slice(0, 4000)
      : 'none';
    return [
      `Active notebook: ${activeNotebookPath || 'none'}`,
      `Active file: ${activeFile || 'none'}`,
      `Tags: ${noteMetadata.tags.join(', ') || 'none'}`,
      `Links: ${noteMetadata.links.join(', ') || 'none'}`,
      `Visible files: ${fileNames || 'none'}`,
      `Current note excerpt: ${noteExcerpt}`,
    ].join('\n');
  }, [activeNotebookPath, activeFile, noteMetadata.tags, noteMetadata.links, filesSnapshot, activeNoteMarkdown]);

  const handlePromptSubmit = useCallback(
    async (prompt: string): Promise<boolean> => {
      const trimmedPrompt = prompt.trim();
      if (!trimmedPrompt) {
        return false;
      }

      const commandMatch = trimmedPrompt.match(/^\/([a-z]+)(?:\s+(.+))?$/i);
      if (!commandMatch) {
        queuePrompt(trimmedPrompt, 'interface');
        return true;
      }

      const command = commandMatch[1].toLowerCase();
      const argument = (commandMatch[2] || '').trim();

      if (command === 'open' || command === 'link') {
        if (!argument) {
          return false;
        }
        await openOrCreateLinkedNote(argument);
        return true;
      }

      if (command === 'settings') {
        setSettingsOpen(true);
        return true;
      }

      if (command === 'logicsheet') {
        setCenterView('logic_sheet');
        return true;
      }

      if (command === 'aiworkspace') {
        setCenterView('ai_workspace');
        return true;
      }

      if (command === 'editor') {
        setCenterView('editor');
        return true;
      }

      if (command === 'ai') {
        if (!argument) {
          setAiPanelOpen(true);
          return true;
        }
        queuePrompt(argument, 'interface');
        return true;
      }

      if (command === 'logic') {
        if (!argument) {
          setAiPanelOpen(true);
          return true;
        }
        queuePrompt(argument, 'logic');
        return true;
      }

      if (command === 'copilot') {
        if (!argument) {
          setAiPanelOpen(true);
          return true;
        }
        queuePrompt(argument, 'copilot');
        return true;
      }

      if (command === 'app') {
        if (!argument) {
          return false;
        }
        const launcher = settings.dockLaunchers.find((item) => item.id === argument);
        if (launcher) {
          await launchDockLauncher(launcher);
          return true;
        }

        const app = settings.miniApps.find(
          (item) => item.id === argument || item.name.toLowerCase() === argument.toLowerCase()
        );
        if (app) {
          await launchMiniApp(app);
          return true;
        }
        return false;
      }

      queuePrompt(trimmedPrompt, 'interface');
      return true;
    },
    [launchDockLauncher, launchMiniApp, openOrCreateLinkedNote, queuePrompt, settings.dockLaunchers, settings.miniApps]
  );

  return (
    <div className="flex h-screen w-screen bg-[#1a1a1a] text-white overflow-hidden">
      <Sidebar
        onFileSelect={(path) => {
          setCenterView('editor');
          setActiveFile(path);
        }}
        activeFile={activeFile}
        activeNotebookPath={activeNotebookPath}
        savedNotebooks={savedNotebooks}
        quickPlaces={settings.quickPlaces}
        onActivateNotebook={activateNotebook}
        onRemoveNotebook={removeNotebook}
        onOpenQuickPlace={(place) => {
          void openQuickPlace(place);
        }}
        onPinCurrentNotebook={pinCurrentNotebook}
        refreshToken={refreshToken}
        onOpenSettings={() => setSettingsOpen(true)}
        onFilesSnapshotChange={setFilesSnapshot}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex-1 min-h-0 flex min-w-0">
          <div className="flex-1 flex flex-col min-w-0">
            {settings.topPromptBarEnabled && (
              <TopCommandBar
                onSubmitPrompt={handlePromptSubmit}
                onOpenSettings={() => setSettingsOpen(true)}
                onOpenAi={() => setAiPanelOpen(true)}
                onOpenLogicSheet={() => setCenterView('logic_sheet')}
                miniApps={settings.miniApps}
              />
            )}

            {centerView === 'logic_sheet' ? (
              <LogicSheet open />
            ) : centerView === 'ai_workspace' ? (
              <AIWorkspace
                activeFile={activeFile}
                workspaceContext={workspaceContext}
                onOpenSettings={() => setSettingsOpen(true)}
              />
            ) : (
              <ForgeEditor
                filePath={activeFile}
                onContentChange={setModified}
                onMetadataChange={setNoteMetadata}
                onDocumentSnapshot={setActiveNoteMarkdown}
                onOpenWikiLink={openOrCreateLinkedNote}
                onSendPromptToAi={(text) => queuePrompt(text, 'interface')}
                autosaveDelayMs={settings.autosaveDelayMs}
              />
            )}
          </div>

          <AiPanel
            open={aiPanelOpen}
            onClose={() => setAiPanelOpen(false)}
            activeFile={activeFile}
            noteMetadata={noteMetadata}
            savedNotebooks={savedNotebooks}
            activeNotebookPath={activeNotebookPath}
            onActivateNotebook={activateNotebook}
            onRemoveNotebook={removeNotebook}
            onOpenWikiLink={openOrCreateLinkedNote}
            queuedPrompt={queuedPrompt}
            onConsumeQueuedPrompt={(id) => {
              setQueuedPrompt((prev) => (prev?.id === id ? null : prev));
            }}
            workspaceContext={workspaceContext}
            aiUseWorkspaceContext={settings.aiUseWorkspaceContext}
          />
        </div>

        <ForgeDock
          activeView={centerView}
          aiPanelOpen={aiPanelOpen}
          launchers={settings.dockLaunchers}
          onLaunchLauncher={(launcher, options) => {
            void launchDockLauncher(launcher, options);
          }}
          onUpdateLauncher={(id, updates) => {
            setSettings((prev) => {
              const currentLauncher = prev.dockLaunchers.find((item) => item.id === id);
              const nextLaunchers = prev.dockLaunchers.map((item) =>
                item.id === id ? { ...item, ...updates } : item
              );

              let nextMiniApps = prev.miniApps;
              if (id.startsWith('mini-')) {
                const miniId = id.slice(5);
                nextMiniApps = prev.miniApps.map((app) => {
                  if (app.id !== miniId) return app;
                  const nextName = typeof updates.name === 'string' ? updates.name : app.name;
                  const nextTargetType = updates.type ?? currentLauncher?.type;
                  const nextUrl =
                    typeof updates.target === 'string' && nextTargetType === 'url'
                      ? updates.target
                      : app.url;
                  return { ...app, name: nextName, url: nextUrl };
                });
              }

              return {
                ...prev,
                dockLaunchers: nextLaunchers,
                miniApps: nextMiniApps,
              };
            });
          }}
          onRemoveLauncher={(id) => {
            setSettings((prev) => {
              const nextLaunchers = prev.dockLaunchers.filter((item) => item.id !== id);
              const nextMiniApps = id.startsWith('mini-')
                ? prev.miniApps.filter((item) => `mini-${item.id}` !== id)
                : prev.miniApps;
              return {
                ...prev,
                dockLaunchers: nextLaunchers,
                miniApps: nextMiniApps,
              };
            });
          }}
        />
      </div>

      {!aiPanelOpen && (
        <button
          onClick={() => setAiPanelOpen(true)}
          className="ai-panel-toggle"
          title="Open AI Panel (Ctrl+Shift+A)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </button>
      )}

      <SettingsPage
        open={settingsOpen}
        settings={settings}
        onUpdateSettings={setSettings}
        onClose={() => setSettingsOpen(false)}
        onLaunchMiniApp={launchMiniApp}
      />
    </div>
  );
}

export default App;

