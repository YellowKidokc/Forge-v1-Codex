import { useState, useEffect, useCallback } from 'react';
import { X, FolderOpen, FileText, RefreshCw, Download, ChevronRight, ChevronDown } from 'lucide-react';
import { FileEntry } from '../../lib/types';
import { ensureMirror, getMirrorFiles, readMirrorFile } from '../../lib/mirror';

interface MirrorViewProps {
  open: boolean;
  onClose: () => void;
}

interface TreeNodeProps {
  entry: FileEntry;
  depth: number;
  onSelect: (path: string) => void;
}

const TreeNode = ({ entry, depth, onSelect }: TreeNodeProps) => {
  const [expanded, setExpanded] = useState(depth < 1);

  return (
    <div>
      <div
        className={`flex items-center gap-1 px-2 py-1 hover:bg-white/5 cursor-pointer transition-colors`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => {
          if (entry.is_dir) {
            setExpanded(!expanded);
          } else {
            onSelect(entry.path);
          }
        }}
      >
        {entry.is_dir ? (
          expanded ? <ChevronDown size={10} className="text-gray-500" /> : <ChevronRight size={10} className="text-gray-500" />
        ) : (
          <FileText size={10} className="text-gray-600" />
        )}
        <span className={`text-[11px] truncate ${entry.is_dir ? 'text-gray-300' : 'text-gray-400'}`}>
          {entry.name}
        </span>
      </div>
      {entry.is_dir && expanded && entry.children?.map((child) => (
        <TreeNode key={child.path} entry={child} depth={depth + 1} onSelect={onSelect} />
      ))}
    </div>
  );
};

const MirrorView = ({ open, onClose }: MirrorViewProps) => {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [mirrorPath, setMirrorPath] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const path = await ensureMirror();
      setMirrorPath(path);
      const entries = await getMirrorFiles();
      setFiles(entries);
    } catch (err) {
      console.error('Failed to load mirror files:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  const handleSelectFile = async (path: string) => {
    setSelectedFile(path);
    try {
      // Extract relative path from mirror path
      if (mirrorPath) {
        const relativePath = path.replace(mirrorPath, '').replace(/^[\\/]/, '');
        const content = await readMirrorFile(relativePath);
        setFileContent(content);
      }
    } catch (err) {
      setFileContent(`(Failed to read file: ${err})`);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-4xl max-h-[80vh] rounded-lg border border-forge-steel bg-[#1a1a1a] shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-forge-steel flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen size={14} className="text-forge-ember" />
            <span className="text-sm font-bold uppercase tracking-widest text-gray-400">Data Mirror</span>
            <span className="text-xs text-gray-600 ml-2 font-mono">{mirrorPath || '_data/'}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={refresh} className="text-gray-500 hover:text-forge-ember cursor-pointer" title="Refresh">
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={onClose} className="text-gray-500 hover:text-white cursor-pointer">
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* File tree */}
          <div className="w-64 border-r border-forge-steel overflow-y-auto">
            {files.length === 0 && !loading && (
              <div className="p-4">
                <p className="text-xs text-gray-600">
                  No files in the mirror yet. Generated outputs (HTML, CSV, graphs, audio) will appear here.
                </p>
              </div>
            )}
            {files.map((entry) => (
              <TreeNode key={entry.path} entry={entry} depth={0} onSelect={handleSelectFile} />
            ))}
          </div>

          {/* File preview */}
          <div className="flex-1 overflow-auto p-4">
            {!selectedFile && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-2">
                  <Download size={24} className="text-gray-700 mx-auto" />
                  <p className="text-xs text-gray-600">
                    Select a file to preview its content
                  </p>
                  <p className="text-[10px] text-gray-700 max-w-xs">
                    The data mirror stores all generated outputs: HTML reports, CSV exports,
                    graphs, audio files, and Python script results. Content stays clean, data stays organized.
                  </p>
                </div>
              </div>
            )}
            {selectedFile && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-gray-400 font-mono truncate">
                    {selectedFile.split(/[\\/]/).pop()}
                  </span>
                </div>
                <pre className="text-[11px] text-gray-300 font-mono whitespace-pre-wrap bg-black/30 rounded p-3 border border-forge-steel">
                  {fileContent}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MirrorView;
