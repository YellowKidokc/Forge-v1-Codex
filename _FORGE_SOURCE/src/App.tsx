import { useState, useEffect, useCallback, useMemo, useRef, type MutableRefObject } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import Sidebar from './components/Sidebar';
import ForgeEditor from './components/Editor/ForgeEditor';
import AiPanel from './components/AiPanel';
import BottomBar from './components/BottomBar';
import NodeSidePanel from './components/NodeSidePanel';
import SettingsPage from './components/SettingsPage';
import LogicSheet from './components/miniapps/LogicSheet';
import TruthLayerWorkbench from './components/miniapps/TruthLayerWorkbench';
import MirrorView from './components/DataMirror/MirrorView';
import { FileEntry, NoteMetadata, SavedNotebook, ForgeSettings, MiniApp, EditorSettings } from './lib/types';
// TopCommandBar replaced by BottomBar — do not re-import
import { DEFAULT_SETTINGS, parseSettings, SETTINGS_STORAGE_KEY } from './lib/settings';
import { clearAiSettingsCache, getRoleConfig, providerLabel, runAiRoleChat, type ChatTurn } from './lib/ai';
import { appendAiRuntimeEvent, summarizeAiText } from './lib/aiRuntime';
import { runPythonSidecar } from './lib/pythonSidecar';

const NOTEBOOKS_STORAGE_KEY = 'forge_saved_notebooks_v1';
const ACTIVE_NOTEBOOK_STORAGE_KEY = 'forge_active_notebook_v1';

const EMPTY_METADATA: NoteMetadata = { tags: [], links: [] };

type CenterView = 'editor' | 'logic_sheet' | 'truth_layer' | 'data_mirror';
type PromptMode = 'interface' | 'logic' | 'copilot';

interface PromptPacket {
  id: number;
  text: string;
  mode?: PromptMode;
}

function normalizePath(path: string): string {
  return path.trim().replace(/[\\/]+$/, '');
}

function getNotebookName(path: string): string {
  const pieces = path.split(/[\\/]/).filter(Boolean);
  return pieces[pieces.length - 1] || path;
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

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  const seqRef = useRef(0);

  useEffect(() => {
    seqRef.current += 1;
    const current = seqRef.current;
    const timeout = window.setTimeout(() => {
      if (seqRef.current === current) {
        setDebounced(value);
      }
    }, delayMs);
    return () => window.clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
}

function App() {
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [, setModified] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [savedNotebooks, setSavedNotebooks] = useState<SavedNotebook[]>([]);
  const [activeNotebookPath, setActiveNotebookPath] = useState<string | null>(null);
  const [noteMetadata, setNoteMetadata] = useState<NoteMetadata>(EMPTY_METADATA);
  const [activeNoteMarkdown, setActiveNoteMarkdown] = useState('');
  const debouncedNoteMarkdown = useDebouncedValue(activeNoteMarkdown, 1000);
  const [refreshToken, setRefreshToken] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<ForgeSettings>(DEFAULT_SETTINGS);
  const [centerView, setCenterView] = useState<CenterView>('editor');
  const [filesSnapshot, setFilesSnapshot] = useState<FileEntry[]>([]);
  const [queuedPrompt, setQueuedPrompt] = useState<PromptPacket | null>(null);
  const promptCounterRef = useRef(1);
  const backgroundSignatureRef = useRef<string>('');
  const logicAbortRef = useRef<AbortController | null>(null);
  const copilotAbortRef = useRef<AbortController | null>(null);

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
    clearAiSettingsCache();
  }, [settings]);

  useEffect(() => {
    const root = document.documentElement;
    const themeVars: { bg: string; bgSecondary: string; panel: string } = {
      dark: { bg: '#1a1a1a', bgSecondary: '#161616', panel: '#111115' },
      darker: { bg: '#111115', bgSecondary: '#0f1014', panel: '#0b0c10' },
      midnight: { bg: '#0a0a0f', bgSecondary: '#07070b', panel: '#06060a' },
    }[settings.editorTheme];
    root.style.setProperty('--forge-bg', themeVars.bg);
    root.style.setProperty('--forge-bg-secondary', themeVars.bgSecondary);
    root.style.setProperty('--forge-panel', themeVars.panel);
    root.style.setProperty('--forge-accent', settings.editorAccentColor);
  }, [settings.editorTheme, settings.editorAccentColor]);

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

  const workspaceContext = useMemo(() => {
    const fileNames = flattenEntryNames(filesSnapshot).join(', ');
    const noteExcerpt = debouncedNoteMarkdown.trim()
      ? debouncedNoteMarkdown.replace(/\s+/g, ' ').slice(0, 4000)
      : 'none';
    return [
      `Active notebook: ${activeNotebookPath || 'none'}`,
      `Active file: ${activeFile || 'none'}`,
      `Tags: ${noteMetadata.tags.join(', ') || 'none'}`,
      `Links: ${noteMetadata.links.join(', ') || 'none'}`,
      `Visible files: ${fileNames || 'none'}`,
      `Current note excerpt: ${noteExcerpt}`,
    ].join('\n');
  }, [activeNotebookPath, activeFile, noteMetadata.tags, noteMetadata.links, filesSnapshot, debouncedNoteMarkdown]);

  const editorSettings: EditorSettings = useMemo(() => ({
    autosaveDelayMs: settings.autosaveDelayMs,
    editorFontFamily: settings.editorFontFamily,
    editorFontSize: settings.editorFontSize,
    editorLineHeight: settings.editorLineHeight,
    editorMaxWidth: settings.editorMaxWidth,
    editorTheme: settings.editorTheme,
    editorAccentColor: settings.editorAccentColor,
    spellcheck: settings.spellcheck,
    vimMode: settings.vimMode,
    showLineNumbers: settings.showLineNumbers,
    tabSize: settings.tabSize,
    autoPairBrackets: settings.autoPairBrackets,
    foldHeadings: settings.foldHeadings,
  }), [settings]);

  const runPythonPlan = useCallback(
    async (prompt: string, selection?: string): Promise<boolean> => {
      const result = await runPythonSidecar({
        mode: 'selection_action',
        prompt,
        selection,
        context: workspaceContext,
        model: settings.ollamaModel,
      });

      const summary = result.ok
        ? `${result.summary} (${result.actions.length} actions${result.warnings.length ? `, ${result.warnings.length} warnings` : ''})`
        : result.summary;

      appendAiRuntimeEvent({
        role: 'logic',
        kind: 'command',
        summary: summarizeAiText(`Python sidecar: ${summary}`, 180),
        provider: result.engine,
        model: settings.ollamaModel,
        status: result.ok ? 'completed' : 'failed',
      }, 1000 * 15);

      setAiPanelOpen(true);
      setQueuedPrompt({
        id: promptCounterRef.current++,
        mode: 'logic',
        text: `Review this Python sidecar action plan and help apply it:\n\n${JSON.stringify(result, null, 2)}`,
      });
      return result.ok;
    },
    [settings.ollamaModel, workspaceContext]
  );

  useEffect(() => {
    if (!settings.enableBackgroundAi) {
      return;
    }
    const noteBody = activeNoteMarkdown.trim();
    const noteBodySignature = activeNoteMarkdown.replace(/\s+/g, ' ').trim();
    if (!activeFile || noteBody.length < 120) {
      return;
    }

    const signature = `${activeFile}|${noteBodySignature}`;
    if (backgroundSignatureRef.current === signature) {
      return;
    }

    const timeout = window.setTimeout(() => {
      backgroundSignatureRef.current = signature;

      const sharedMessages: ChatTurn[] = [
        {
          role: 'user',
          content: `Current note body:\n${noteBody.slice(0, 6000)}`,
        },
      ];

      const runBackgroundRole = async (
        role: 'logic' | 'copilot',
        prompt: string,
        abortRef: MutableRefObject<AbortController | null>
      ) => {
        if (abortRef.current) {
          abortRef.current.abort();
          abortRef.current = null;
        }

        const controller = new AbortController();
        abortRef.current = controller;
        const roleConfig = getRoleConfig(role);
        let fullText = '';
        try {
          await runAiRoleChat(
            role,
            sharedMessages,
            {
              onToken: (token) => {
                fullText += token;
              },
              onComplete: () => {
                appendAiRuntimeEvent({
                  role,
                  kind: 'message',
                  summary: summarizeAiText(fullText || '(no output)'),
                  provider: providerLabel(roleConfig.provider),
                  model: roleConfig.model,
                  status: 'completed',
                }, 1000 * 60 * 12);
              },
              onError: (error) => {
                appendAiRuntimeEvent({
                  role,
                  kind: 'error',
                  summary: summarizeAiText(error),
                  provider: providerLabel(roleConfig.provider),
                  model: roleConfig.model,
                  status: 'failed',
                }, 1000 * 60 * 6);
              },
            },
            controller.signal,
            settings.aiUseWorkspaceContext ? `Workspace context:\n${workspaceContext}` : '',
            prompt
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Background AI failed';
          appendAiRuntimeEvent({
            role,
            kind: 'error',
            summary: summarizeAiText(message),
            provider: providerLabel(roleConfig.provider),
            model: roleConfig.model,
            status: 'failed',
          }, 1000 * 60 * 6);
        } finally {
          abortRef.current = null;
        }
      };

      void runBackgroundRole(
        'logic',
        'Background logic scan. Review the current note for structural breaks, contradictions, drift from canonical definitions, or weak assumptions. Return only the 1-3 highest-signal findings.',
        logicAbortRef
      );
      void runBackgroundRole(
        'copilot',
        'Background copilot scan. Suggest the next 2-3 highest-leverage actions for the current note. Be concrete, brief, and execution-focused.',
        copilotAbortRef
      );
    }, settings.backgroundAiDebounce);

    return () => {
      window.clearTimeout(timeout);
      logicAbortRef.current?.abort();
      logicAbortRef.current = null;
      copilotAbortRef.current?.abort();
      copilotAbortRef.current = null;
    };
  }, [activeFile, activeNoteMarkdown, settings.enableBackgroundAi, settings.backgroundAiDebounce, settings.aiUseWorkspaceContext, workspaceContext]);

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

      if (command === 'editor') {
        setCenterView('editor');
        return true;
      }

      if (command === 'truth' || command === 'truthlayer') {
        setCenterView('truth_layer');
        return true;
      }

      if (command === 'data' || command === 'mirror') {
        setCenterView('data_mirror');
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

      if (command === 'python' || command === 'py') {
        if (!argument) {
          return false;
        }
        await runPythonPlan(argument);
        return true;
      }

      if (command === 'app') {
        if (!argument) {
          return false;
        }
        const app = settings.miniApps.find((item) => item.id === argument);
        if (!app) {
          return false;
        }
        await launchMiniApp(app);
        return true;
      }

      queuePrompt(trimmedPrompt, 'interface');
      return true;
    },
    [launchMiniApp, openOrCreateLinkedNote, queuePrompt, runPythonPlan, settings.miniApps]
  );

  return (
    <div
      className="flex h-screen w-screen text-white overflow-hidden font-sans"
      style={{ backgroundColor: 'var(--forge-bg, #1a1a1a)' }}
    >
      <Sidebar
        onFileSelect={(path) => {
          setCenterView('editor');
          setActiveFile(path);
        }}
        activeFile={activeFile}
        activeNotebookPath={activeNotebookPath}
        savedNotebooks={savedNotebooks}
        onActivateNotebook={activateNotebook}
        onRemoveNotebook={removeNotebook}
        refreshToken={refreshToken}
        onOpenSettings={() => setSettingsOpen(true)}
        onFilesSnapshotChange={setFilesSnapshot}
      />

      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        {/* Main content + right panel */}
        <div className="flex flex-1 min-h-0">
          {centerView === 'logic_sheet' ? (
            <LogicSheet open />
          ) : centerView === 'truth_layer' ? (
            <TruthLayerWorkbench open />
          ) : centerView === 'data_mirror' ? (
            <MirrorView activeNotebookPath={activeNotebookPath} />
          ) : (
            <>
              <ForgeEditor
                filePath={activeFile}
                onContentChange={setModified}
                onMetadataChange={setNoteMetadata}
                onDocumentSnapshot={setActiveNoteMarkdown}
                onOpenWikiLink={openOrCreateLinkedNote}
                onSendPromptToAi={(text) => queuePrompt(text, 'interface')}
                onRunPythonPlan={runPythonPlan}
                editorSettings={editorSettings}
                workspaceContext={workspaceContext}
              />
              <NodeSidePanel
                filePath={activeFile}
                metadata={noteMetadata}
                onOpenWikiLink={openOrCreateLinkedNote}
                onSendPromptToAi={(text) => queuePrompt(text, 'interface')}
                onRunPythonPlan={runPythonPlan}
              />
            </>
          )}
        </div>

        {/* Bottom bar — APPS / AI / WEB faces */}
        <BottomBar
          onSubmitPrompt={handlePromptSubmit}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenAi={() => setAiPanelOpen(true)}
          onOpenLogicSheet={() => setCenterView('logic_sheet')}
          onOpenTruthLayer={() => setCenterView('truth_layer')}
          onOpenDataMirror={() => setCenterView('data_mirror')}
          miniApps={settings.miniApps}
        />
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
        activeNotebookPath={activeNotebookPath}
      />
    </div>
  );
}

export default App;
