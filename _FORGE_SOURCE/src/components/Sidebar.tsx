import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Hammer,
  FolderOpen,
  Plus,
  RefreshCw,
  Search,
  Settings,
  PlusSquare,
  Trash2,
  MessageSquare,
  BookOpen,
  Database,
  Bot,
} from 'lucide-react';
import FileTree from './FileTree';
import { FileEntry, SavedNotebook } from '../lib/types';
import { hasApiKey } from '../lib/ai';
import { getAiRuntimeEvents } from '../lib/aiRuntime';

interface SidebarProps {
  onFileSelect: (path: string) => void;
  activeFile: string | null;
  activeNotebookPath: string | null;
  savedNotebooks: SavedNotebook[];
  onActivateNotebook: (path: string) => Promise<boolean>;
  onRemoveNotebook: (path: string) => void | Promise<void>;
  refreshToken: number;
  onOpenSettings: () => void;
  onFilesSnapshotChange?: (entries: FileEntry[]) => void;
}

type SidebarMode = 'notes' | 'chats' | 'prompts' | 'kb';
type NotesSurface = 'content' | 'data';

const Sidebar: React.FC<SidebarProps> = ({
  onFileSelect,
  activeFile,
  activeNotebookPath,
  savedNotebooks,
  onActivateNotebook,
  onRemoveNotebook,
  refreshToken,
  onOpenSettings,
  onFilesSnapshotChange,
}) => {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<'disconnected' | 'connected' | 'error'>('disconnected');
  const [searchQuery, setSearchQuery] = useState('');
  const [vaultInput, setVaultInput] = useState('');
  const [showVaultPicker, setShowVaultPicker] = useState(false);
  const [apiKeySet] = useState(hasApiKey());
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>('notes');
  const [notesSurface, setNotesSurface] = useState<NotesSurface>('content');
  const [runtimeTick, setRuntimeTick] = useState(0);

  const setVaultHandler = async (path: string) => {
    if (!path.trim()) {
      return;
    }
    const ok = await onActivateNotebook(path.trim());
    if (ok) {
      setShowVaultPicker(false);
      setVaultInput('');
    }
  };

  const refreshFiles = useCallback(async () => {
    if (!activeNotebookPath) {
      setFiles([]);
      return;
    }
    setLoading(true);
    try {
      const entries = notesSurface === 'content'
        ? await invoke<FileEntry[]>('get_vault_files')
        : await (async () => {
            await invoke<string>('create_mirror');
            return invoke<FileEntry[]>('get_mirror_files');
          })();
      setFiles(entries);
      onFilesSnapshotChange?.(entries);
    } catch (err) {
      console.error('Failed to list files:', err);
    } finally {
      setLoading(false);
    }
  }, [activeNotebookPath, notesSurface, onFilesSnapshotChange]);

  const connectDb = async () => {
    try {
      await invoke('connect_db');
      setDbStatus('connected');
    } catch (err) {
      setDbStatus('error');
      console.error('DB connection failed:', err);
    }
  };

  const createNewNote = async () => {
    if (!activeNotebookPath) return;
    if (notesSurface !== 'content') {
      alert('Switch to Content view to create source notes.');
      return;
    }
    const name = prompt('Note name:');
    if (!name) return;
    const filename = name.endsWith('.md') ? name : `${name}.md`;
    try {
      const fullPath = await invoke<string>('create_note', { path: filename });
      await refreshFiles();
      onFileSelect(fullPath);
    } catch (err) {
      console.error('Failed to create note:', err);
    }
  };

  const createNewFolder = async () => {
    if (!activeNotebookPath) return;
    if (notesSurface !== 'content') {
      alert('Switch to Content view to create source folders.');
      return;
    }
    const name = prompt('Folder name:');
    if (!name) return;
    try {
      await invoke('create_folder', { path: name });
      await refreshFiles();
    } catch (err) {
      console.error('Failed to create folder:', err);
    }
  };

  useEffect(() => {
    connectDb();
  }, []);

  useEffect(() => {
    refreshFiles();
  }, [activeNotebookPath, refreshToken, refreshFiles]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setRuntimeTick((prev) => prev + 1);
    }, 4000);
    return () => window.clearInterval(interval);
  }, []);

  const runtimeEvents = getAiRuntimeEvents().slice(0, 12);
  const promptLibrary = [
    'Summarize this note in 5 bullets',
    'Find contradictions in current note',
    'Link this to the Master Equation',
    'Extract canonical definitions',
    'Build a sermon outline from this section',
    'Find Stanford Encyclopedia sources',
    'Turn this into a formal axiom',
    'Generate outgoing and incoming links',
  ].filter((item) => item.toLowerCase().includes(searchQuery.toLowerCase()));

  const knowledgeRows = files
    .filter((entry) => entry.is_dir || entry.name.toLowerCase().includes('.md'))
    .filter((entry) => entry.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .slice(0, 24);

  const modeTabs: Array<{ id: SidebarMode; label: string; icon: React.ReactNode }> = [
    { id: 'notes', label: 'Notes', icon: <FolderOpen size={12} /> },
    { id: 'chats', label: 'Chats', icon: <MessageSquare size={12} /> },
    { id: 'prompts', label: 'Prompts', icon: <Bot size={12} /> },
    { id: 'kb', label: 'KB', icon: <Database size={12} /> },
  ];

  return (
    <div className="w-72 h-screen bg-forge-iron border-r border-forge-steel flex flex-col shrink-0 z-10 text-white">
      <div className="p-4 border-b border-forge-steel">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-bold text-forge-ember tracking-tighter flex items-center gap-2 uppercase">
            <Hammer size={18} />
            FORGE
          </h1>
          <div className="flex items-center gap-2">
            <div
              className={`w-1.5 h-1.5 rounded-full ${dbStatus === 'connected' ? 'bg-green-500' : dbStatus === 'error' ? 'bg-red-500' : 'bg-gray-600'}`}
              title={`DB: ${dbStatus}`}
            />
            <div
              className={`w-1.5 h-1.5 rounded-full ${apiKeySet ? 'bg-blue-500' : 'bg-gray-600'}`}
              title={`AI: ${apiKeySet ? 'configured' : 'no key'}`}
            />
          </div>
        </div>
        <p className="text-[10px] text-gray-600 uppercase tracking-widest font-black italic">Logos Workshop</p>
      </div>

      <div className="px-3 py-2 border-b border-forge-steel space-y-2">
        {!showVaultPicker ? (
          <button
            onClick={() => setShowVaultPicker(true)}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs text-gray-400 hover:text-forge-ember border border-dashed border-forge-steel rounded hover:border-forge-ember/50 transition-colors cursor-pointer"
          >
            <FolderOpen size={14} /> Add Notebook
          </button>
        ) : (
          <div className="space-y-2">
            <input
              type="text"
              value={vaultInput}
              onChange={(e) => setVaultInput(e.target.value)}
              placeholder="Notebook path (O:\\...)"
              className="w-full bg-black/40 border border-forge-steel p-1.5 rounded text-xs outline-none focus:border-forge-ember transition-colors font-mono text-white"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && vaultInput.trim()) {
                  setVaultHandler(vaultInput.trim());
                }
                if (e.key === 'Escape') {
                  setShowVaultPicker(false);
                }
              }}
              autoFocus
            />
            <div className="flex gap-1">
              <button
                onClick={() => vaultInput.trim() && setVaultHandler(vaultInput.trim())}
                className="flex-1 text-[10px] py-1 bg-forge-ember/20 text-forge-ember rounded hover:bg-forge-ember/30 transition-colors cursor-pointer"
              >
                Save & Open
              </button>
              <button
                onClick={() => setShowVaultPicker(false)}
                className="flex-1 text-[10px] py-1 bg-forge-steel text-gray-500 rounded hover:text-gray-400 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {savedNotebooks.length > 0 && (
          <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
            {savedNotebooks.map((notebook) => {
              const isActive = notebook.path === activeNotebookPath;
              return (
                <div
                  key={notebook.path}
                  className={`group flex items-center gap-1 rounded border px-1.5 py-1 text-[10px] ${
                    isActive
                      ? 'border-forge-ember/40 bg-forge-ember/10 text-forge-ember'
                      : 'border-forge-steel text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <button
                    onClick={() => onActivateNotebook(notebook.path)}
                    title={notebook.path}
                    className="flex-1 truncate text-left cursor-pointer"
                  >
                    {notebook.name}
                  </button>
                  <button
                    onClick={() => onRemoveNotebook(notebook.path)}
                    title="Remove notebook"
                    className="text-gray-600 hover:text-red-400 transition-colors cursor-pointer"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {activeNotebookPath && (
          <div className="rounded border border-forge-ember/30 bg-forge-ember/5 px-2 py-2">
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => setShowVaultPicker(true)}
                className="text-[11px] text-forge-ember font-mono truncate hover:text-white transition-colors cursor-pointer"
                title={activeNotebookPath}
              >
                {activeNotebookPath.split(/[\\/]/).pop() || 'notebook'}
              </button>
              <span className="text-[9px] uppercase tracking-widest text-gray-500">Locked</span>
            </div>
            <div className="mt-2 flex items-center gap-1">
              <button onClick={createNewFolder} className="text-gray-500 hover:text-forge-ember transition-colors cursor-pointer" title="New folder">
                <PlusSquare size={14} />
              </button>
              <button onClick={createNewNote} className="text-gray-500 hover:text-forge-ember transition-colors cursor-pointer" title="New note">
                <Plus size={14} />
              </button>
              <button onClick={refreshFiles} className="text-gray-500 hover:text-forge-ember transition-colors cursor-pointer" title="Refresh">
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={() => setSidebarMode('notes')}
                className={`ml-auto text-[10px] px-2 py-1 rounded border transition-colors cursor-pointer ${
                  sidebarMode === 'notes'
                    ? 'border-forge-ember/40 text-forge-ember'
                    : 'border-forge-steel text-gray-500'
                }`}
                title="Open notebook view"
              >
                Obsidian v4
              </button>
            </div>
          </div>
        )}
      </div>

      {activeNotebookPath && (
        <>
          <div className="px-3 py-2 border-b border-forge-steel space-y-2">
            {sidebarMode === 'notes' && (
              <div className="flex items-center gap-1 rounded border border-forge-steel p-1">
                <button
                  onClick={() => setNotesSurface('content')}
                  className={`flex-1 text-[10px] px-2 py-1 rounded cursor-pointer transition-colors ${
                    notesSurface === 'content'
                      ? 'bg-forge-ember/15 text-forge-ember border border-forge-ember/40'
                      : 'text-gray-500 border border-transparent hover:text-gray-300'
                  }`}
                >
                  Content
                </button>
                <button
                  onClick={() => setNotesSurface('data')}
                  className={`flex-1 text-[10px] px-2 py-1 rounded cursor-pointer transition-colors ${
                    notesSurface === 'data'
                      ? 'bg-forge-ember/15 text-forge-ember border border-forge-ember/40'
                      : 'text-gray-500 border border-transparent hover:text-gray-300'
                  }`}
                >
                  Data Mirror
                </button>
              </div>
            )}
            <div className="grid grid-cols-4 gap-1">
              {modeTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSidebarMode(tab.id)}
                  className={`flex items-center justify-center gap-1 rounded px-2 py-2 text-[10px] uppercase tracking-widest border transition-colors cursor-pointer ${
                    sidebarMode === tab.id
                      ? 'border-forge-ember/50 text-forge-ember bg-forge-ember/10'
                      : 'border-forge-steel text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-1.5 text-gray-600" size={12} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  sidebarMode === 'notes'
                    ? notesSurface === 'content'
                      ? 'Search notes...'
                      : 'Search data mirror...'
                    : sidebarMode === 'chats'
                    ? 'Search talks...'
                    : sidebarMode === 'prompts'
                    ? 'Search prompts...'
                    : 'Search knowledge...'
                }
                className="w-full bg-black/30 border border-forge-steel/50 py-1 pl-6 pr-2 rounded text-[11px] outline-none focus:border-forge-ember/50 transition-colors text-white"
              />
            </div>
          </div>
        </>
      )}

      <div className="flex-1 overflow-y-auto">
        {sidebarMode === 'notes' && (
          <FileTree
            entries={files}
            onFileSelect={onFileSelect}
            activeFile={activeFile}
            searchQuery={searchQuery}
            onRefresh={refreshFiles}
          />
        )}

        {sidebarMode === 'chats' && (
          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest text-gray-500">Talk Threads</span>
              <span className="text-[10px] text-gray-600">{runtimeTick}</span>
            </div>
            {runtimeEvents.length === 0 && (
              <p className="text-[11px] text-gray-600">No chats or AI feed items yet.</p>
            )}
            {runtimeEvents
              .filter((item) => item.summary.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((event) => (
                <button
                  key={event.id}
                  className="w-full text-left rounded border border-forge-steel bg-black/10 px-2 py-2 hover:border-forge-ember/30 cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] uppercase tracking-widest text-forge-ember">{event.role}</span>
                    <span className="text-[10px] text-gray-500">{event.provider}</span>
                  </div>
                  <div className="text-[11px] text-gray-300 mt-1 whitespace-pre-wrap">{event.summary}</div>
                </button>
              ))}
          </div>
        )}

        {sidebarMode === 'prompts' && (
          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest text-gray-500">Prompt Library</span>
              <button
                onClick={createNewNote}
                className="text-[10px] px-2 py-1 rounded border border-forge-steel text-gray-400 hover:text-forge-ember cursor-pointer"
              >
                Add
              </button>
            </div>
            {promptLibrary.map((prompt) => (
              <div key={prompt} className="rounded border border-forge-steel bg-black/10 px-2 py-2">
                <div className="text-xs text-gray-200">{prompt}</div>
                <div className="mt-2 flex justify-end">
                  <button className="text-[10px] px-2 py-1 rounded border border-forge-steel text-gray-400 hover:text-forge-ember cursor-pointer">
                    Use now
                  </button>
                </div>
              </div>
            ))}
            {promptLibrary.length === 0 && <p className="text-[11px] text-gray-600">No prompts match this search.</p>}
          </div>
        )}

        {sidebarMode === 'kb' && (
          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest text-gray-500">Knowledge Base</span>
              <BookOpen size={12} className="text-gray-600" />
            </div>
            {knowledgeRows.map((entry) => (
              <button
                key={entry.path}
                onClick={() => {
                  if (!entry.is_dir) onFileSelect(entry.path);
                }}
                className="w-full text-left rounded border border-forge-steel bg-black/10 px-2 py-2 hover:border-forge-ember/30 cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-200 truncate">{entry.name.replace('.md', '')}</span>
                  <span className="text-[10px] text-gray-600">{entry.is_dir ? 'source' : 'ready'}</span>
                </div>
              </button>
            ))}
            {knowledgeRows.length === 0 && <p className="text-[11px] text-gray-600">No knowledge rows match this search.</p>}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-forge-steel flex items-center justify-between text-[9px] text-gray-700 font-mono tracking-widest uppercase">
        v0.3.0 - Obsidian Flow
        <button
          onClick={onOpenSettings}
          className="text-gray-600 hover:text-forge-ember transition-colors cursor-pointer"
          title="Settings"
        >
          <Settings size={14} />
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
