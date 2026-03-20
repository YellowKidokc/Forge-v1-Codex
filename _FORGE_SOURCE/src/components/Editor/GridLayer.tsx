import { UseGridReturn } from '../../hooks/useGrid';
import { Editor } from '@tiptap/core';

interface GridLayerProps {
  grid: UseGridReturn;
  editor: Editor | null;
}

const GridLayer = ({ grid, editor }: GridLayerProps) => {
  return (
    <div className="w-1/2 overflow-y-auto bg-[#111115] p-3 font-mono text-[11px]">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-forge-steel">
        <span className="text-forge-ember text-[10px] uppercase tracking-widest font-bold">Layer 2 — Grid</span>
        <span className="text-gray-600 text-[9px]">
          {grid.snapshot.totalRows} rows · {grid.snapshot.totalCells} cells
        </span>
      </div>
      {grid.snapshot.rows.map((row) => (
        <div key={row.index} className="mb-2 group">
          <div className="flex items-start gap-2">
            <span className="text-gray-600 w-6 text-right flex-shrink-0 select-none">{row.index}</span>
            <div className="flex-1">
              <div className="text-[9px] text-gray-600 mb-0.5">
                <span className="text-forge-ember/50">{row.nodeType}</span>
                {row.level ? <span className="ml-1">h{row.level}</span> : null}
                {row.meta.flags.length > 0 && (
                  <span className="ml-2 text-amber-400">[{row.meta.flags.join(', ')}]</span>
                )}
                {row.meta.tags.length > 0 && (
                  <span className="ml-2 text-cyan-400">#{row.meta.tags.join(' #')}</span>
                )}
              </div>
              <div className="flex flex-wrap gap-px">
                {row.cells.map((cell) => (
                  <span
                    key={`${cell.row}-${cell.col}`}
                    className={`px-1 py-0.5 rounded-sm cursor-pointer transition-colors ${
                      cell.meta.tags.length > 0
                        ? 'bg-amber-400/15 text-amber-300 border border-amber-400/20'
                        : cell.meta.flags.length > 0
                          ? 'bg-purple-400/10 text-purple-300 border border-purple-400/15'
                          : cell.meta.color
                            ? `text-white border`
                            : 'text-gray-400 hover:bg-white/5 border border-transparent hover:border-gray-700'
                    }`}
                    style={cell.meta.color ? { borderColor: cell.meta.color + '40', backgroundColor: cell.meta.color + '15' } : undefined}
                    title={`[${cell.row},${cell.col}] pos:${cell.from}-${cell.to}${cell.meta.tags.length ? ' tags:' + cell.meta.tags.join(',') : ''}${cell.meta.notes ? ' note:' + cell.meta.notes : ''}`}
                    onClick={() => {
                      if (editor) {
                        editor.chain().focus().setTextSelection({ from: cell.from, to: cell.to }).run();
                      }
                    }}
                  >
                    {cell.word}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
      {grid.snapshot.totalRows === 0 && (
        <div className="text-center text-gray-700 mt-12">No content to grid</div>
      )}
    </div>
  );
};

export default GridLayer;
