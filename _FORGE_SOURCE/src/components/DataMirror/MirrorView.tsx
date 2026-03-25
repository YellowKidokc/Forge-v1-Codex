import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Plus, FileText } from 'lucide-react';
import { FileEntry } from '../../lib/types';
import { createMirror, getMirrorFiles, writeMirrorFile } from '../../lib/mirror';

function flatten(entries: FileEntry[], depth = 0, out: Array<{ entry: FileEntry; depth: number }> = []) {
  for (const entry of entries) {
    out.push({ entry, depth });
    if (entry.children?.length) flatten(entry.children, depth + 1, out);
  }
  return out;
}

interface MirrorViewProps {
  activeNotebookPath: string | null;
}

export default function MirrorView({ activeNotebookPath }: MirrorViewProps) {
  const [items, setItems] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!activeNotebookPath) return;
    setLoading(true);
    try {
      await createMirror();
      setItems(await getMirrorFiles());
    } catch (error) {
      console.error('Mirror refresh failed:', error);
    } finally {
      setLoading(false);
    }
  }, [activeNotebookPath]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const flat = useMemo(() => flatten(items), [items]);

  if (!activeNotebookPath) {
    return <div className="flex-1 flex items-center justify-center text-gray-600">Select a notebook first.</div>;
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#151515]">
      <div className="px-4 py-2 border-b border-forge-steel flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-forge-ember">Data Mirror</div>
          <div className="text-[11px] text-gray-500">Generated outputs under <code>_data/</code></div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="text-xs px-2 py-1 border border-forge-steel rounded text-gray-300 hover:text-forge-ember cursor-pointer"
            onClick={async () => {
              const name = prompt('Output file in _data (example reports/summary.txt):');
              if (!name?.trim()) return;
              const body = prompt('Initial content:') ?? '';
              await writeMirrorFile(name.trim(), body);
              await refresh();
            }}
          >
            <Plus size={12} className="inline mr-1" /> Output
          </button>
          <button onClick={refresh} className="text-gray-500 hover:text-forge-ember cursor-pointer" title="Refresh mirror">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3 font-mono text-xs">
        {flat.length === 0 ? (
          <div className="text-gray-600">No mirror files yet.</div>
        ) : (
          <div className="space-y-0.5">
            {flat.map(({ entry, depth }) => (
              <div key={entry.path} className="flex items-center gap-2 text-gray-300" style={{ paddingLeft: `${depth * 14}px` }}>
                <FileText size={12} className={entry.is_dir ? 'text-gray-600' : 'text-forge-ember/80'} />
                <span className={entry.is_dir ? 'text-gray-500' : ''}>{entry.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
