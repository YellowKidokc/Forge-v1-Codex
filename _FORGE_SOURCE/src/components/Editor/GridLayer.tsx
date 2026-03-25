import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Editor } from '@tiptap/core';
import { UseGridReturn } from '../../hooks/useGrid';

interface GridLayerProps {
  editor: Editor | null;
  grid: UseGridReturn;
}

const ROW_HEIGHT = 86;
const OVERSCAN_ROWS = 6;

function GridLayerBase({ editor, grid }: GridLayerProps) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [viewportHeight, setViewportHeight] = useState(560);
  const totalRows = grid.snapshot.rows.length;
  const totalHeight = totalRows * ROW_HEIGHT;

  const { startIndex, endIndex, visibleRows } = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN_ROWS);
    const end = Math.min(
      totalRows,
      Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN_ROWS
    );
    return {
      startIndex: start,
      endIndex: end,
      visibleRows: grid.snapshot.rows.slice(start, end),
    };
  }, [grid.snapshot.rows, scrollTop, totalRows, viewportHeight]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const updateHeight = () => setViewportHeight(node.clientHeight || 560);
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-1/2 overflow-y-auto bg-[#111115] p-3 font-mono text-[11px]"
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
    >
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-forge-steel sticky top-0 bg-[#111115] z-10">
        <span className="text-forge-ember text-[10px] uppercase tracking-widest font-bold">Layer 2 — Grid</span>
        <span className="text-gray-600 text-[9px]">
          {grid.snapshot.totalRows} rows · {grid.snapshot.totalCells} cells
        </span>
      </div>

      {grid.snapshot.totalRows > 0 && (
        <div style={{ height: totalHeight, position: 'relative' }}>
          <div style={{ transform: `translateY(${startIndex * ROW_HEIGHT}px)` }}>
            {visibleRows.map((row) => (
              <div key={row.nodeId} className="mb-2 group min-h-[80px]">
                <div className="flex items-start gap-2">
                  <span className="text-gray-600 w-6 text-right flex-shrink-0 select-none">{row.index}</span>
                  <div className="flex-1">
                    <div className="text-[9px] text-gray-600 mb-0.5">
                      <span className="text-forge-ember/50">{row.nodeType}</span>
                      {row.level ? <span className="ml-1">h{row.level}</span> : null}
                      {row.meta.flags.length > 0 && (
                        <span className="ml-2 text-amber-400">[{row.meta.flags.join(', ')}]</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-px">
                      {row.cells.map((cell) => (
                        <button
                          key={`${cell.row}-${cell.col}`}
                          type="button"
                          className={`px-1 py-0.5 rounded-sm cursor-pointer transition-colors ${
                            cell.meta.tags.length > 0
                              ? 'bg-amber-400/15 text-amber-300 border border-amber-400/20'
                              : cell.meta.flags.length > 0
                                ? 'bg-purple-400/10 text-purple-300 border border-purple-400/15'
                                : 'text-gray-400 hover:bg-white/5 border border-transparent hover:border-gray-700'
                          }`}
                          title={`[${cell.row},${cell.col}] pos:${cell.from}-${cell.to}${cell.meta.tags.length ? ` tags:${cell.meta.tags.join(',')}` : ''}`}
                          onClick={() => {
                            if (!editor) return;
                            editor.chain().focus().setTextSelection({ from: cell.from, to: cell.to }).run();
                          }}
                        >
                          {cell.word}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {endIndex < totalRows && <div className="h-1" />}
        </div>
      )}

      {grid.snapshot.totalRows === 0 && (
        <div className="text-center text-gray-700 mt-12">No content to grid.</div>
      )}
    </div>
  );
}

const GridLayer = memo(GridLayerBase, (prev, next) => {
  return prev.editor === next.editor && prev.grid.snapshot.version === next.grid.snapshot.version;
});

export default GridLayer;
