/**
 * FORGE Grid Layer — The Addressable Substrate
 * 
 * Every block in the TipTap document maps to a Row.
 * Every word within a block maps to a Cell within that Row.
 * Every cell has coordinates [row, col] and can hold metadata (tags, flags, links).
 * 
 * The Grid is a parallel data structure that stays in sync with TipTap's document model.
 * It does NOT store the text itself — it indexes into the TipTap doc.
 * 
 * Architecture:
 *   TipTap ProseMirror Doc
 *     └── Node (paragraph, heading, listItem, etc.)  →  GridRow
 *           └── Text content split by word boundaries  →  GridCell[]
 */

// ─── Types ───────────────────────────────────────────────────

export interface CellMeta {
  tags: string[];
  flags: string[];        // e.g., 'load-bearing', 'axiom', 'definition'
  links: string[];        // cross-references
  color?: string;         // highlight color
  shape?: string;         // visual annotation (circle, underline, etc.)
  notes?: string;         // inline annotation
  confidence?: number;    // AI confidence score
  [key: string]: unknown; // extensible
}

export interface GridCell {
  row: number;
  col: number;
  word: string;           // the actual word text (snapshot, may drift if doc changes)
  from: number;           // ProseMirror absolute position (start of word)
  to: number;             // ProseMirror absolute position (end of word)
  meta: CellMeta;
}

export interface GridRow {
  index: number;
  nodeId: string;         // stable ID for the TipTap node
  nodeType: string;       // 'paragraph', 'heading', 'listItem', etc.
  level?: number;         // heading level (1-6) if applicable
  from: number;           // ProseMirror position of node start
  to: number;             // ProseMirror position of node end
  cells: GridCell[];
  meta: CellMeta;         // row-level metadata
}

export interface GridQueryResult {
  cells: GridCell[];
  rows: GridRow[];
}

export type GridQueryPredicate = (cell: GridCell, row: GridRow) => boolean;

export interface GridSnapshot {
  rows: GridRow[];
  version: number;        // incremented on every rebuild
  timestamp: number;
  totalRows: number;
  totalCells: number;
}

// ─── ID Generation ───────────────────────────────────────────

let nodeIdCounter = 0;
const nodeIdMap = new WeakMap<object, string>();

function getStableNodeId(node: any): string {
  // If TipTap node already has an ID attribute, use it
  if (node.attrs?.id) return node.attrs.id;
  
  // Otherwise generate a stable ID based on the node object reference
  if (nodeIdMap.has(node)) return nodeIdMap.get(node)!;
  
  const id = `n_${(++nodeIdCounter).toString(36)}`;
  nodeIdMap.set(node, id);
  return id;
}

// ─── Word Tokenizer ──────────────────────────────────────────

interface WordToken {
  word: string;
  offsetStart: number; // character offset within the text content
  offsetEnd: number;
}

function tokenizeWords(text: string): WordToken[] {
  const tokens: WordToken[] = [];
  // Split on word boundaries, preserving positions
  const regex = /\S+/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    tokens.push({
      word: match[0],
      offsetStart: match.index,
      offsetEnd: match.index + match[0].length,
    });
  }
  return tokens;
}

// ─── Default Metadata ────────────────────────────────────────

function emptyMeta(): CellMeta {
  return { tags: [], flags: [], links: [] };
}

// ─── Grid Builder ────────────────────────────────────────────
// Walks the ProseMirror document and builds the grid snapshot.

export function buildGrid(doc: any): GridSnapshot {
  const rows: GridRow[] = [];
  let totalCells = 0;

  // ProseMirror docs have a top-level 'doc' node with content children
  if (!doc || !doc.content) {
    return { rows: [], version: 0, timestamp: Date.now(), totalRows: 0, totalCells: 0 };
  }

  const appendRow = (node: any, nodeStart: number) => {
    const row = buildRowFromNode(node, rows.length, nodeStart);
    if (!row) return;
    rows.push(row);
    totalCells += row.cells.length;
  };

  walkGridNodes(doc, 0, appendRow);

  return {
    rows,
    version: Date.now(),
    timestamp: Date.now(),
    totalRows: rows.length,
    totalCells,
  };
}

function buildRowFromNode(node: any, rowIndex: number, nodeStart: number): GridRow | null {
  const typeName = node.type?.name || node.type;
  
  // Skip non-text nodes
  if (!typeName) return null;
  
  // Extract text content from the node
  const textContent = getNodeText(node);
  if (textContent.trim() === '' && typeName !== 'horizontalRule') return null;

  const nodeId = getStableNodeId(node);
  const tokens = tokenizeWords(textContent);
  
  // Build cells from word tokens
  // nodeStart is the ProseMirror position of the node
  // We need to calculate absolute positions for each word
  const textStart = nodeStart + 1; // +1 for the node opening tag in ProseMirror
  
  const cells: GridCell[] = tokens.map((token, colIndex) => ({
    row: rowIndex,
    col: colIndex,
    word: token.word,
    from: textStart + token.offsetStart,
    to: textStart + token.offsetEnd,
    meta: emptyMeta(),
  }));

  return {
    index: rowIndex,
    nodeId,
    nodeType: typeName,
    level: node.attrs?.level,
    from: nodeStart,
    to: nodeStart + getNodeSize(node),
    cells,
    meta: emptyMeta(),
  };
}

function getNodeText(node: any): string {
  // For ProseMirror JSON nodes, extract text recursively
  if (node.text) return node.text;
  if ((node.type?.name || node.type) === 'hardBreak') return ' ';
  if (!node.content) return '';
  return node.content
    .map((child: any) => getNodeText(child))
    .join('');
}

function walkGridNodes(
  node: any,
  nodeStart: number,
  onRow: (node: any, nodeStart: number) => void,
): void {
  if (!node) return;

  if (shouldBuildRow(node)) {
    onRow(node, nodeStart);
    return;
  }

  if (!Array.isArray(node.content)) return;

  const typeName = node.type?.name || node.type;
  let childStart = typeName === 'doc' ? nodeStart : nodeStart + 1;
  for (const child of node.content) {
    walkGridNodes(child, childStart, onRow);
    childStart += getNodeSize(child);
  }
}

function shouldBuildRow(node: any): boolean {
  const typeName = node.type?.name || node.type;

  if (!typeName || typeName === 'text') return false;

  const containerTypes = new Set([
    'doc',
    'bulletList',
    'orderedList',
    'blockquote',
    'taskList',
    'taskItem',
    'listItem',
    'table',
    'tableRow',
    'tableCell',
    'tableHeader',
    'promotedBlock',
  ]);

  if (containerTypes.has(typeName)) return false;

  return typeName === 'horizontalRule' || getNodeText(node).trim().length > 0;
}

function getNodeSize(node: any): number {
  if (!node) return 0;
  if (typeof node.nodeSize === 'number') return node.nodeSize;
  if (typeof node.text === 'string') return node.text.length;
  if (!Array.isArray(node.content)) return 2;
  return 2 + node.content.reduce((size: number, child: any) => size + getNodeSize(child), 0);
}

// ─── Grid Query API ──────────────────────────────────────────
// These functions operate on a GridSnapshot to find, filter, and retrieve cells.

export function getCell(grid: GridSnapshot, row: number, col: number): GridCell | null {
  const r = grid.rows[row];
  if (!r) return null;
  return r.cells[col] || null;
}

export function getRow(grid: GridSnapshot, row: number): GridRow | null {
  return grid.rows[row] || null;
}

export function getCellRange(grid: GridSnapshot, fromRow: number, fromCol: number, toRow: number, toCol: number): GridCell[] {
  const cells: GridCell[] = [];
  for (let r = fromRow; r <= toRow && r < grid.rows.length; r++) {
    const row = grid.rows[r];
    const startCol = r === fromRow ? fromCol : 0;
    const endCol = r === toRow ? toCol : row.cells.length - 1;
    for (let c = startCol; c <= endCol && c < row.cells.length; c++) {
      cells.push(row.cells[c]);
    }
  }
  return cells;
}

export function queryByTag(grid: GridSnapshot, tag: string): GridQueryResult {
  const cells: GridCell[] = [];
  const rows: GridRow[] = [];
  for (const row of grid.rows) {
    if (row.meta.tags.includes(tag)) rows.push(row);
    for (const cell of row.cells) {
      if (cell.meta.tags.includes(tag)) cells.push(cell);
    }
  }
  return { cells, rows };
}

export function queryByFlag(grid: GridSnapshot, flag: string): GridQueryResult {
  const cells: GridCell[] = [];
  const rows: GridRow[] = [];
  for (const row of grid.rows) {
    if (row.meta.flags.includes(flag)) rows.push(row);
    for (const cell of row.cells) {
      if (cell.meta.flags.includes(flag)) cells.push(cell);
    }
  }
  return { cells, rows };
}

export function queryByText(grid: GridSnapshot, search: string): GridCell[] {
  const lower = search.toLowerCase();
  const results: GridCell[] = [];
  for (const row of grid.rows) {
    for (const cell of row.cells) {
      if (cell.word.toLowerCase().includes(lower)) results.push(cell);
    }
  }
  return results;
}

export function queryGrid(grid: GridSnapshot, predicate: GridQueryPredicate): GridCell[] {
  const results: GridCell[] = [];
  for (const row of grid.rows) {
    for (const cell of row.cells) {
      if (predicate(cell, row)) results.push(cell);
    }
  }
  return results;
}

// ─── Grid Mutation API ───────────────────────────────────────
// These functions create NEW grid snapshots (immutable pattern for React).

export function setCellMeta(grid: GridSnapshot, row: number, col: number, meta: Partial<CellMeta>): GridSnapshot {
  const newRows = grid.rows.map((r, ri) => {
    if (ri !== row) return r;
    return {
      ...r,
      cells: r.cells.map((c, ci) => {
        if (ci !== col) return c;
        return { ...c, meta: { ...c.meta, ...meta } };
      }),
    };
  });
  return { ...grid, rows: newRows, version: grid.version + 1 };
}

export function setRowMeta(grid: GridSnapshot, row: number, meta: Partial<CellMeta>): GridSnapshot {
  const newRows = grid.rows.map((r, ri) => {
    if (ri !== row) return r;
    return { ...r, meta: { ...r.meta, ...meta } };
  });
  return { ...grid, rows: newRows, version: grid.version + 1 };
}

export function addTagToCell(grid: GridSnapshot, row: number, col: number, tag: string): GridSnapshot {
  const cell = getCell(grid, row, col);
  if (!cell || cell.meta.tags.includes(tag)) return grid;
  return setCellMeta(grid, row, col, { tags: [...cell.meta.tags, tag] });
}

export function addFlagToRow(grid: GridSnapshot, row: number, flag: string): GridSnapshot {
  const r = getRow(grid, row);
  if (!r || r.meta.flags.includes(flag)) return grid;
  return setRowMeta(grid, row, { flags: [...r.meta.flags, flag] });
}

export function removeFlagFromRow(grid: GridSnapshot, row: number, flag: string): GridSnapshot {
  const r = getRow(grid, row);
  if (!r) return grid;
  return setRowMeta(grid, row, { flags: r.meta.flags.filter(f => f !== flag) });
}

// ─── Grid Serialization ─────────────────────────────────────
// For persistence — save/load grid metadata alongside the markdown file.

export function serializeGridMeta(grid: GridSnapshot): string {
  // Only serialize cells/rows that have non-empty metadata
  const data: any[] = [];
  for (const row of grid.rows) {
    const hasRowMeta = row.meta.tags.length > 0 || row.meta.flags.length > 0 || row.meta.links.length > 0;
    const cellsWithMeta = row.cells.filter(c =>
      c.meta.tags.length > 0 || c.meta.flags.length > 0 || c.meta.links.length > 0 || c.meta.color || c.meta.notes
    );
    if (hasRowMeta || cellsWithMeta.length > 0) {
      data.push({
        row: row.index,
        nodeId: row.nodeId,
        nodeType: row.nodeType,
        meta: hasRowMeta ? row.meta : undefined,
        cells: cellsWithMeta.length > 0 ? cellsWithMeta.map(c => ({
          col: c.col,
          word: c.word, // anchor for re-matching after edits
          meta: c.meta,
        })) : undefined,
      });
    }
  }
  return JSON.stringify(data, null, 2);
}

export function deserializeGridMeta(grid: GridSnapshot, json: string): GridSnapshot {
  try {
    const data = JSON.parse(json);
    let result = { ...grid };
    for (const entry of data) {
      // Try to match by row index first, then by nodeId
      const row = result.rows[entry.row];
      if (!row) continue;
      
      if (entry.meta) {
        result = setRowMeta(result, entry.row, entry.meta);
      }
      if (entry.cells) {
        for (const cellData of entry.cells) {
          // Try exact col match first
          let targetCol = cellData.col;
          // If word doesn't match at that col, search for it in the row
          const currentCell = getCell(result, entry.row, targetCol);
          if (currentCell && currentCell.word !== cellData.word) {
            const found = row.cells.findIndex(c => c.word === cellData.word);
            if (found >= 0) targetCol = found;
          }
          result = setCellMeta(result, entry.row, targetCol, cellData.meta);
        }
      }
    }
    return result;
  } catch {
    return grid;
  }
}
