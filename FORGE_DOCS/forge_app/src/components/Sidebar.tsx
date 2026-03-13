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
  Pin,
  Compass,
} from 'lucide-react';
import FileTree from './FileTree';
import { FileEntry, SavedNotebook, QuickPlace } from '../lib/types';
import { hasApiKey } from '../lib/ai';

interface SidebarProps {
  onFileSelect: (path: string) => void;
  activeFile: string | null;
  activeNotebookPath: string | null;
  savedNotebooks: SavedNotebook[];
  quickPlaces: QuickPlace[];
  onActivateNotebook: (path: string) => Promise<boolean>;
  onRemoveNotebook: (path: string) => void | Promise<void>;
  onOpenQuickPlace: (place: QuickPlace) => void;
  onPinCurrentNotebook: () => void;
  refreshToken: number;
  onOpenSettings: () => void;
  onFilesSnapshotChange?: (entries: FileEntry[]) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  onFileSelect,
  activeFile,
  activeNotebookPath,
  savedNotebooks,
  quickPlaces,
  onActivateNotebook,
  onRemoveNotebook,
  onOpenQuickPlace,
  onPinCurrentNotebook,
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
      const entries = await invoke<FileEntry[]>('get_vault_files');
      setFiles(entries);
      onFilesSnapshotChange?.(entries);
    } catch (err) {
      console.error('Failed to list files:', err);
    } finally {
      setLoading(false);
    }
  }, [activeNotebookPath, onFilesSnapshotChange]);

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

  return (
    <div className="w-64 h-screen bg-forge-iron border-r border-forge-steel flex flex-col shrink-0 z-10 text-white">
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

        {quickPlaces.filter((place) => place.pinned).length > 0 && (
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[9px] uppercase tracking-widest text-gray-600">Quick Places</span>
              <button
                onClick={onOpenSettings}
                className="text-[9px] text-gray-600 hover:text-gray-300 transition-colors cursor-pointer"
                title="Manage quick places"
              >
                Manage
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {quickPlaces
                .filter((place) => place.pinned)
                .slice(0, 10)
                .map((place) => (
                  <button
                    key={place.id}
                    onClick={() => onOpenQuickPlace(place)}
                    title={place.path}
                    className="text-[10px] px-1.5 py-1 rounded border border-forge-steel text-gray-300 hover:text-forge-ember hover:border-forge-ember/40 cursor-pointer max-w-40 truncate"
                  >
                    {place.mode === 'notebook' ? '📒' : '📁'} {place.name}
                  </button>
                ))}
            </div>
          </div>
        )}

        {activeNotebookPath && (
          <div className="flex items-center justify-between gap-1">
            <button
              onClick={() => setShowVaultPicker(true)}
              className="text-[10px] text-gray-500 font-mono truncate hover:text-gray-400 transition-colors cursor-pointer"
              title={activeNotebookPath}
            >
              {activeNotebookPath.split(/[\\/]/).pop() || 'notebook'}
            </button>
            <div className="flex items-center gap-1">
              <button
                onClick={onPinCurrentNotebook}
                className="text-gray-600 hover:text-forge-ember transition-colors cursor-pointer"
                title="Pin current notebook to quick places"
              >
                <Pin size={13} />
              </button>
              <button onClick={createNewFolder} className="text-gray-600 hover:text-forge-ember transition-colors cursor-pointer" title="New folder">
                <PlusSquare size={14} />
              </button>
              <button onClick={createNewNote} className="text-gray-600 hover:text-forge-ember transition-colors cursor-pointer" title="New note">
                <Plus size={14} />
              </button>
              <button onClick={refreshFiles} className="text-gray-600 hover:text-forge-ember transition-colors cursor-pointer" title="Refresh">
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        )}
      </div>

      {activeNotebookPath && (
        <div className="px-3 py-2 border-b border-forge-steel">
          <div className="relative">
            <Search className="absolute left-2 top-1.5 text-gray-600" size={12} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className="w-full bg-black/30 border border-forge-steel/50 py-1 pl-6 pr-2 rounded text-[11px] outline-none focus:border-forge-ember/50 transition-colors text-white"
            />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <FileTree
          entries={files}
          onFileSelect={onFileSelect}
          activeFile={activeFile}
          searchQuery={searchQuery}
          onRefresh={refreshFiles}
        />
      </div>

      <div className="p-3 border-t border-forge-steel flex items-center justify-between text-[9px] text-gray-700 font-mono tracking-widest uppercase">
        <span className="flex items-center gap-1">
          <Compass size={11} /> v0.3.1
        </span>
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
