import React, { useState, useCallback, createContext, useContext, useEffect } from 'react';
import { FileEntry } from '../lib/types';
import {
  ChevronRight,
  ChevronDown,
  FileText,
  Folder,
  FolderOpen,
  ChevronsDownUp,
  ChevronsUpDown,
  Edit2,
  Trash2,
  ExternalLink,
  Copy,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { revealItemInDir } from '@tauri-apps/plugin-opener';

interface TreeControl {
  expandAll: number;
  collapseAll: number;
}

const TreeControlContext = createContext<TreeControl>({ expandAll: 0, collapseAll: 0 });

interface FileTreeProps {
  entries: FileEntry[];
  onFileSelect: (path: string) => void;
  activeFile: string | null;
  searchQuery: string;
  onRefresh: () => void;
}

interface FileNodeProps {
  entry: FileEntry;
  depth: number;
  onFileSelect: (path: string) => void;
  activeFile: string | null;
  onRequestRename: (entry: FileEntry) => Promise<void>;
  onRequestDelete: (entry: FileEntry) => Promise<void>;
  onContextMenu: (entry: FileEntry, event: React.MouseEvent) => void;
}

interface MenuState {
  entry: FileEntry;
  x: number;
  y: number;
}

const FileNode: React.FC<FileNodeProps> = ({
  entry,
  depth,
  onFileSelect,
  activeFile,
  onRequestRename,
  onRequestDelete,
  onContextMenu,
}) => {
  const [expanded, setExpanded] = useState(false);
  const control = useContext(TreeControlContext);

  React.useEffect(() => {
    if (control.expandAll > 0) setExpanded(true);
  }, [control.expandAll]);

  React.useEffect(() => {
    if (control.collapseAll > 0) setExpanded(false);
  }, [control.collapseAll]);

  const handleDragStart = (event: React.DragEvent, fileEntry: FileEntry) => {
    if (fileEntry.is_dir) return;

    const normalized = fileEntry.path.replace(/\\/g, '/').replace(/^\/+/, '');
    const fileUri = `file:///${encodeURI(normalized)}`;
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('text/plain', fileEntry.path);
    event.dataTransfer.setData('text/uri-list', fileUri);
    event.dataTransfer.setData('DownloadURL', `text/markdown:${fileEntry.name}:${fileUri}`);
  };

  if (entry.is_dir) {
    const childCount = entry.children?.length || 0;

    return (
      <div className="group/node">
        <div
          className="w-full flex items-center gap-1.5 py-1 px-2 text-left hover:bg-[#2a2a2a] transition-colors group relative cursor-pointer"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => setExpanded(!expanded)}
          onContextMenu={(event) => onContextMenu(entry, event)}
        >
          {expanded ? (
            <ChevronDown size={12} className="text-gray-600 shrink-0" />
          ) : (
            <ChevronRight size={12} className="text-gray-600 shrink-0" />
          )}
          {expanded ? (
            <FolderOpen size={14} className="text-[#ff4d00]/60 shrink-0" />
          ) : (
            <Folder size={14} className="text-gray-500 shrink-0" />
          )}
          <span className="text-xs text-gray-400 truncate flex-1">{entry.name}</span>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pr-1">
            <button
              onClick={(event) => {
                event.stopPropagation();
                onRequestRename(entry);
              }}
              className="p-1 hover:text-white text-gray-600 transition-colors cursor-pointer"
              title="Rename"
            >
              <Edit2 size={10} />
            </button>
            <button
              onClick={(event) => {
                event.stopPropagation();
                onRequestDelete(entry);
              }}
              className="p-1 hover:text-red-500 text-gray-600 transition-colors cursor-pointer"
              title="Delete"
            >
              <Trash2 size={10} />
            </button>
          </div>
          <span className="text-[9px] text-gray-700 shrink-0">{childCount}</span>
        </div>
        {expanded && entry.children && (
          <div>
            {entry.children.map((child) => (
              <FileNode
                key={child.path}
                entry={child}
                depth={depth + 1}
                onFileSelect={onFileSelect}
                activeFile={activeFile}
                onRequestRename={onRequestRename}
                onRequestDelete={onRequestDelete}
                onContextMenu={onContextMenu}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const isActive = entry.path === activeFile;

  return (
    <div
      draggable
      className={`w-full flex items-center gap-1.5 py-1 px-2 text-left transition-colors group relative cursor-pointer ${
        isActive
          ? 'bg-[#ff4d00]/10 text-[#ff4d00]'
          : 'text-gray-400 hover:bg-[#2a2a2a] hover:text-gray-300'
      }`}
      style={{ paddingLeft: `${depth * 12 + 20}px` }}
      onClick={() => onFileSelect(entry.path)}
      onContextMenu={(event) => onContextMenu(entry, event)}
      onDragStart={(event) => handleDragStart(event, entry)}
      title="Drag into external apps to attach the note file"
    >
      <FileText size={13} className={isActive ? 'text-[#ff4d00] shrink-0' : 'text-gray-600 shrink-0'} />
      <span className="text-xs truncate flex-1">{entry.name.replace('.md', '')}</span>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pr-1">
        <button
          onClick={(event) => {
            event.stopPropagation();
            onRequestRename(entry);
          }}
          className="p-1 hover:text-white text-gray-600 transition-colors cursor-pointer"
          title="Rename"
        >
          <Edit2 size={10} />
        </button>
        <button
          onClick={(event) => {
            event.stopPropagation();
            onRequestDelete(entry);
          }}
          className="p-1 hover:text-red-500 text-gray-600 transition-colors cursor-pointer"
          title="Delete"
        >
          <Trash2 size={10} />
        </button>
      </div>
    </div>
  );
};

const FileTree: React.FC<FileTreeProps> = ({ entries, onFileSelect, activeFile, searchQuery, onRefresh }) => {
  const [expandAll, setExpandAll] = useState(0);
  const [collapseAll, setCollapseAll] = useState(0);
  const [contextMenu, setContextMenu] = useState<MenuState | null>(null);

  useEffect(() => {
    if (!contextMenu) return;

    const onWindowClick = () => setContextMenu(null);
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setContextMenu(null);
      }
    };

    window.addEventListener('click', onWindowClick);
    window.addEventListener('keydown', onEscape);
    return () => {
      window.removeEventListener('click', onWindowClick);
      window.removeEventListener('keydown', onEscape);
    };
  }, [contextMenu]);

  const filterEntries = useCallback(
    (items: FileEntry[]): FileEntry[] => {
      if (!searchQuery) return items;
      const query = searchQuery.toLowerCase();

      return items.reduce((acc: FileEntry[], item) => {
        if (item.is_dir) {
          const filteredChildren = filterEntries(item.children || []);
          if (filteredChildren.length > 0 || item.name.toLowerCase().includes(query)) {
            acc.push({ ...item, children: filteredChildren });
          }
        } else if (item.name.toLowerCase().includes(query)) {
          acc.push(item);
        }
        return acc;
      }, []);
    },
    [searchQuery]
  );

  const renameEntry = useCallback(
    async (entry: FileEntry) => {
      const newName = prompt('Enter new name:', entry.name);
      if (!newName || newName === entry.name) return;

      const oldPath = entry.path;
      const parentDir = oldPath.substring(0, oldPath.lastIndexOf(entry.name));
      const newPath = parentDir + newName;

      try {
        await invoke('rename_item', { oldPath, newPath });
        onRefresh();
      } catch (err) {
        console.error('Failed to rename:', err);
      }
    },
    [onRefresh]
  );

  const deleteEntry = useCallback(
    async (entry: FileEntry) => {
      if (!confirm(`Are you sure you want to delete ${entry.name}?`)) return;

      try {
        await invoke('delete_item', { path: entry.path });
        onRefresh();
      } catch (err) {
        console.error('Failed to delete:', err);
      }
    },
    [onRefresh]
  );

  const openContextMenu = useCallback((entry: FileEntry, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({ entry, x: event.clientX, y: event.clientY });
  }, []);

  const filteredFiles = filterEntries(entries);

  const menuX = contextMenu ? Math.min(contextMenu.x, window.innerWidth - 190) : 0;
  const menuY = contextMenu ? Math.min(contextMenu.y, window.innerHeight - 220) : 0;

  if (entries.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-gray-600">
        <p className="text-[10px] uppercase tracking-widest">Empty notebook</p>
      </div>
    );
  }

  return (
    <TreeControlContext.Provider value={{ expandAll, collapseAll }}>
      <div className="flex items-center justify-end gap-1 px-3 py-1 border-b border-white/5">
        <button
          onClick={() => setExpandAll((prev) => prev + 1)}
          className="text-gray-700 hover:text-gray-400 transition-colors p-1 cursor-pointer"
          title="Expand all"
        >
          <ChevronsUpDown size={12} />
        </button>
        <button
          onClick={() => setCollapseAll((prev) => prev + 1)}
          className="text-gray-700 hover:text-gray-400 transition-colors p-1 cursor-pointer"
          title="Collapse all"
        >
          <ChevronsDownUp size={12} />
        </button>
      </div>

      <div className="py-1">
        {filteredFiles.map((entry) => (
          <FileNode
            key={entry.path}
            entry={entry}
            depth={0}
            onFileSelect={onFileSelect}
            activeFile={activeFile}
            onRequestRename={renameEntry}
            onRequestDelete={deleteEntry}
            onContextMenu={openContextMenu}
          />
        ))}
      </div>

      {contextMenu && (
        <div
          className="fixed z-40 min-w-44 rounded border border-forge-steel bg-[#161616] shadow-2xl p-1"
          style={{ left: menuX, top: menuY }}
          onClick={(event) => event.stopPropagation()}
        >
          {!contextMenu.entry.is_dir && (
            <button
              className="w-full text-left text-xs text-gray-300 hover:bg-forge-steel px-2 py-1.5 rounded cursor-pointer"
              onClick={() => {
                onFileSelect(contextMenu.entry.path);
                setContextMenu(null);
              }}
            >
              Open Note
            </button>
          )}
          <button
            className="w-full text-left text-xs text-gray-300 hover:bg-forge-steel px-2 py-1.5 rounded cursor-pointer flex items-center gap-2"
            onClick={() => {
              renameEntry(contextMenu.entry);
              setContextMenu(null);
            }}
          >
            <Edit2 size={12} /> Rename
          </button>
          <button
            className="w-full text-left text-xs text-gray-300 hover:bg-forge-steel px-2 py-1.5 rounded cursor-pointer flex items-center gap-2"
            onClick={async () => {
              await revealItemInDir(contextMenu.entry.path);
              setContextMenu(null);
            }}
          >
            <ExternalLink size={12} /> Reveal In Folder
          </button>
          <button
            className="w-full text-left text-xs text-gray-300 hover:bg-forge-steel px-2 py-1.5 rounded cursor-pointer flex items-center gap-2"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(contextMenu.entry.path);
              } catch (err) {
                console.error('Failed to copy path:', err);
              }
              setContextMenu(null);
            }}
          >
            <Copy size={12} /> Copy Path
          </button>
          <button
            className="w-full text-left text-xs text-red-300 hover:bg-red-900/20 px-2 py-1.5 rounded cursor-pointer flex items-center gap-2"
            onClick={() => {
              deleteEntry(contextMenu.entry);
              setContextMenu(null);
            }}
          >
            <Trash2 size={12} /> Delete
          </button>
        </div>
      )}
    </TreeControlContext.Provider>
  );
};

export default FileTree;
