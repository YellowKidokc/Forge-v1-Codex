/**
 * useGrid — React hook that keeps a GridSnapshot in sync with a TipTap editor.
 * 
 * Usage:
 *   const grid = useGrid(editor);
 *   grid.getCell(0, 3)           // get word at row 0, col 3
 *   grid.queryByTag('axiom')     // find all cells tagged 'axiom'
 *   grid.addTag(2, 5, 'axiom')   // tag word at [2,5]
 *   grid.setFlag(4, 'load-bearing') // flag entire row 4
 *   grid.snapshot                 // the current GridSnapshot
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Editor } from '@tiptap/core';
import {
  GridSnapshot, GridCell, GridRow, GridQueryResult,
  buildGrid, getCell as _getCell, getRow as _getRow,
  getCellRange as _getCellRange,
  queryByTag as _queryByTag, queryByFlag as _queryByFlag,
  queryByText as _queryByText, queryGrid as _queryGrid,
  setCellMeta, setRowMeta, addTagToCell, addFlagToRow, removeFlagFromRow,
  serializeGridMeta, deserializeGridMeta,
  CellMeta,
} from '../lib/grid';

const EMPTY_GRID: GridSnapshot = {
  rows: [], version: 0, timestamp: 0, totalRows: 0, totalCells: 0,
};

function getMetaStorageKey(persistenceKey: string) {
  return `forge.grid.meta.v1:${persistenceKey}`;
}

export function useGrid(editor: Editor | null, persistenceKey?: string | null) {
  const [grid, setGrid] = useState<GridSnapshot>(EMPTY_GRID);
  const rebuildTimerRef = useRef<number | null>(null);
  const metaStoreRef = useRef<string>(''); // serialized metadata to preserve across rebuilds
  const metaDirtyRef = useRef(false);
  const previousGridRef = useRef<GridSnapshot>(EMPTY_GRID);
  const skipNextRebuildRef = useRef(false);
  const subscribersRef = useRef(new Map<string, Set<(cell: GridCell | null) => void>>());

  useEffect(() => {
    if (!persistenceKey) {
      metaStoreRef.current = '';
      return;
    }
    const raw = localStorage.getItem(getMetaStorageKey(persistenceKey));
    metaStoreRef.current = typeof raw === 'string' ? raw : '';
  }, [persistenceKey]);

  // Rebuild grid from editor document (debounced)
  const rebuildGrid = useCallback(() => {
    if (!editor) return;
    if (skipNextRebuildRef.current) {
      skipNextRebuildRef.current = false;
      return;
    }
    
    // Get TipTap's ProseMirror document as JSON
    const doc = editor.getJSON();
    let newGrid = buildGrid(doc);
    
    // Re-apply any stored metadata from previous snapshot
    if (metaStoreRef.current) {
      newGrid = deserializeGridMeta(newGrid, metaStoreRef.current);
    }
    
    setGrid(newGrid);
  }, [editor]);

  // Listen to editor updates
  useEffect(() => {
    if (!editor) return;
    
    const handler = () => {
      // Debounce rebuilds to avoid thrashing on every keystroke
      if (rebuildTimerRef.current) clearTimeout(rebuildTimerRef.current);
      rebuildTimerRef.current = window.setTimeout(rebuildGrid, 700);
    };

    editor.on('update', handler);
    
    // Initial build
    rebuildGrid();
    
    return () => {
      editor.off('update', handler);
      if (rebuildTimerRef.current) clearTimeout(rebuildTimerRef.current);
    };
  }, [editor, rebuildGrid]);

  // Persist metadata when grid changes
  useEffect(() => {
    const previousGrid = previousGridRef.current;
    if (metaDirtyRef.current && grid.totalRows > 0) {
      metaStoreRef.current = serializeGridMeta(grid);
      if (persistenceKey) {
        localStorage.setItem(getMetaStorageKey(persistenceKey), metaStoreRef.current);
      }
      metaDirtyRef.current = false;
    }

    subscribersRef.current.forEach((callbacks: Set<(cell: GridCell | null) => void>, key: string) => {
      const [rowText, colText] = key.split(':');
      const row = Number(rowText);
      const col = Number(colText);
      const cell = _getCell(grid, row, col);
      const prevCell = _getCell(previousGrid, row, col);
      if (
        prevCell?.word === cell?.word &&
        prevCell?.from === cell?.from &&
        prevCell?.to === cell?.to &&
        JSON.stringify(prevCell?.meta ?? null) === JSON.stringify(cell?.meta ?? null)
      ) {
        return;
      }
      callbacks.forEach((callback: (cell: GridCell | null) => void) => callback(cell));
    });
    previousGridRef.current = grid;
  }, [grid, persistenceKey]);

  // ── Query API ──
  const getCell = useCallback((row: number, col: number): GridCell | null => {
    return _getCell(grid, row, col);
  }, [grid]);

  const getRow = useCallback((row: number): GridRow | null => {
    return _getRow(grid, row);
  }, [grid]);

  const getCellRange = useCallback((fromRow: number, fromCol: number, toRow: number, toCol: number): GridCell[] => {
    return _getCellRange(grid, fromRow, fromCol, toRow, toCol);
  }, [grid]);

  const queryByTag = useCallback((tag: string): GridQueryResult => {
    return _queryByTag(grid, tag);
  }, [grid]);

  const queryByFlag = useCallback((flag: string): GridQueryResult => {
    return _queryByFlag(grid, flag);
  }, [grid]);

  const queryByText = useCallback((search: string): GridCell[] => {
    return _queryByText(grid, search);
  }, [grid]);

  const query = useCallback((predicate: (cell: GridCell, row: GridRow) => boolean): GridCell[] => {
    return _queryGrid(grid, predicate);
  }, [grid]);

  // ── Mutation API ──
  const addTag = useCallback((row: number, col: number, tag: string) => {
    metaDirtyRef.current = true;
    setGrid(prev => addTagToCell(prev, row, col, tag));
  }, []);

  const setFlag = useCallback((row: number, flag: string) => {
    metaDirtyRef.current = true;
    setGrid(prev => addFlagToRow(prev, row, flag));
  }, []);

  const removeFlag = useCallback((row: number, flag: string) => {
    metaDirtyRef.current = true;
    setGrid(prev => removeFlagFromRow(prev, row, flag));
  }, []);

  const updateCellMeta = useCallback((row: number, col: number, meta: Partial<CellMeta>) => {
    metaDirtyRef.current = true;
    setGrid(prev => setCellMeta(prev, row, col, meta));
  }, []);

  const updateRowMeta = useCallback((row: number, meta: Partial<CellMeta>) => {
    metaDirtyRef.current = true;
    setGrid(prev => setRowMeta(prev, row, meta));
  }, []);

  // ── Highlight API (applies visual decorations via TipTap) ──
  const highlightCell = useCallback((row: number, col: number, color: string = '#e8a912') => {
    if (!editor) return;
    const cell = _getCell(grid, row, col);
    if (!cell) return;
    
    // Use TipTap's chain to set a highlight mark at the cell's position
    try {
      editor.chain()
        .focus()
        .setTextSelection({ from: cell.from, to: cell.to })
        .setMark('highlight', { color })
        .run();
    } catch {
      // Highlight mark may not be registered — fall back to bold as visual indicator
      editor.chain()
        .focus()
        .setTextSelection({ from: cell.from, to: cell.to })
        .toggleBold()
        .run();
    }
  }, [editor, grid]);

  const highlightRow = useCallback((row: number, color: string = '#e8a912') => {
    if (!editor) return;
    const r = _getRow(grid, row);
    if (!r || r.cells.length === 0) return;
    
    try {
      editor.chain()
        .focus()
        .setTextSelection({ from: r.from + 1, to: r.to - 1 })
        .setMark('highlight', { color })
        .run();
    } catch {
      editor.chain()
        .focus()
        .setTextSelection({ from: r.from + 1, to: r.to - 1 })
        .toggleBold()
        .run();
    }
  }, [editor, grid]);

  const setCell = useCallback((row: number, col: number, value: string) => {
    if (!editor) return false;
    const cell = _getCell(grid, row, col);
    if (!cell) return false;
    skipNextRebuildRef.current = true;
    editor.chain().focus().setTextSelection({ from: cell.from, to: cell.to }).insertContent(value).run();
    return true;
  }, [editor, grid]);

  const subscribe = useCallback((row: number, col: number, callback: (cell: GridCell | null) => void) => {
    const key = `${row}:${col}`;
    const map = subscribersRef.current;
    const existing = map.get(key) ?? new Set<(cell: GridCell | null) => void>();
    existing.add(callback);
    map.set(key, existing);
    callback(_getCell(grid, row, col));
    return () => {
      const entry = map.get(key);
      if (!entry) return;
      entry.delete(callback);
      if (entry.size === 0) map.delete(key);
    };
  }, [grid]);

  return {
    snapshot: grid,
    getCell,
    getRow,
    getCellRange,
    queryByTag,
    queryByFlag,
    queryByText,
    query,
    addTag,
    setFlag,
    removeFlag,
    updateCellMeta,
    updateRowMeta,
    highlightCell,
    highlightRow,
    setCell,
    subscribe,
    rebuild: rebuildGrid,
  };
}

export type UseGridReturn = ReturnType<typeof useGrid>;
