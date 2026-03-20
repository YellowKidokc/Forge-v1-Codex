import { useState, useEffect, useCallback } from 'react';
import { X, Clock, RotateCcw } from 'lucide-react';
import {
  VersionSnapshot,
  listSnapshots,
  readSnapshot,
  rollbackToSnapshot,
  computeDiff,
  formatTimestamp,
  DiffLine,
} from '../../lib/versioning';

interface VersionBrowserProps {
  open: boolean;
  onClose: () => void;
  filePath: string | null;
  currentContent: string;
  onRollback: () => void;
}

const VersionBrowser = ({ open, onClose, filePath, currentContent, onRollback }: VersionBrowserProps) => {
  const [snapshots, setSnapshots] = useState<VersionSnapshot[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [diffLines, setDiffLines] = useState<DiffLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [rolling, setRolling] = useState(false);

  const refresh = useCallback(async () => {
    if (!filePath) return;
    setLoading(true);
    try {
      const snaps = await listSnapshots(filePath);
      setSnapshots(snaps);
    } catch (err) {
      console.error('Failed to list snapshots:', err);
    } finally {
      setLoading(false);
    }
  }, [filePath]);

  useEffect(() => {
    if (open && filePath) {
      refresh();
      setSelectedId(null);
      setDiffLines([]);
    }
  }, [open, filePath, refresh]);

  const viewDiff = async (snapshotId: string) => {
    if (!filePath) return;
    setSelectedId(snapshotId);
    try {
      const oldContent = await readSnapshot(filePath, snapshotId);
      setDiffLines(computeDiff(oldContent, currentContent));
    } catch (err) {
      console.error('Failed to read snapshot:', err);
    }
  };

  const handleRollback = async (snapshotId: string) => {
    if (!filePath) return;
    const confirmed = window.confirm('Rollback to this version? Current state will be saved as a snapshot first.');
    if (!confirmed) return;

    setRolling(true);
    try {
      await rollbackToSnapshot(filePath, snapshotId);
      onRollback();
      await refresh();
    } catch (err) {
      console.error('Failed to rollback:', err);
    } finally {
      setRolling(false);
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
            <Clock size={14} className="text-forge-ember" />
            <span className="text-sm font-bold uppercase tracking-widest text-gray-400">Version History</span>
            <span className="text-xs text-gray-600 ml-2">
              {filePath?.split(/[\\/]/).pop() || 'No file'}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white cursor-pointer">
            <X size={14} />
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Snapshot list */}
          <div className="w-64 border-r border-forge-steel overflow-y-auto p-3 space-y-1">
            {loading && <p className="text-xs text-gray-500">Loading...</p>}
            {!loading && snapshots.length === 0 && (
              <p className="text-xs text-gray-600">No snapshots yet. Versions are created on each save.</p>
            )}
            {snapshots.map((snap) => {
              const isSelected = snap.id === selectedId;
              return (
                <div
                  key={snap.id}
                  className={`rounded border px-2 py-2 cursor-pointer transition-colors ${
                    isSelected
                      ? 'border-forge-ember/40 bg-forge-ember/10'
                      : 'border-forge-steel hover:border-gray-600'
                  }`}
                  onClick={() => viewDiff(snap.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-mono ${isSelected ? 'text-forge-ember' : 'text-gray-400'}`}>
                      {formatTimestamp(snap.timestamp)}
                    </span>
                    <span className="text-[9px] text-gray-600">{(snap.size_bytes / 1024).toFixed(1)}K</span>
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5 truncate">{snap.summary}</div>
                  {isSelected && (
                    <div className="mt-2 flex gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRollback(snap.id); }}
                        disabled={rolling}
                        className="flex items-center gap-1 text-[10px] px-2 py-1 rounded border border-forge-ember/40 text-forge-ember hover:bg-forge-ember/10 cursor-pointer disabled:opacity-40"
                      >
                        <RotateCcw size={9} /> Rollback
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Diff view */}
          <div className="flex-1 overflow-auto p-3">
            {!selectedId && (
              <div className="flex items-center justify-center h-full">
                <p className="text-xs text-gray-600">Select a version to compare with current</p>
              </div>
            )}
            {selectedId && diffLines.length === 0 && (
              <p className="text-xs text-gray-500">No differences.</p>
            )}
            {selectedId && diffLines.length > 0 && (
              <div className="font-mono text-[11px] leading-5">
                {diffLines.map((line, i) => (
                  <div
                    key={i}
                    className={`px-2 ${
                      line.type === 'added'
                        ? 'bg-green-900/30 text-green-300'
                        : line.type === 'removed'
                        ? 'bg-red-900/30 text-red-300'
                        : 'text-gray-500'
                    }`}
                  >
                    <span className="inline-block w-4 text-gray-700 mr-2 select-none">
                      {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                    </span>
                    {line.content || '\u00A0'}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VersionBrowser;
