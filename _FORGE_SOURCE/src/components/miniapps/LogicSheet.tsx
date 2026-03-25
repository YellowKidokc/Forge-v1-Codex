import { useMemo, useState } from 'react';

interface LogicSheetProps {
  open: boolean;
}

const COLS = 8;
const ROWS = 24;

function colLabel(index: number): string {
  return String.fromCharCode(65 + index);
}

function cellId(col: number, row: number): string {
  return `${colLabel(col)}${row + 1}`;
}

function parseCellRef(ref: string): { col: number; row: number } | null {
  const match = ref.toUpperCase().match(/^([A-Z]+)(\d+)$/);
  if (!match) return null;
  const col = match[1].charCodeAt(0) - 65;
  const row = Number(match[2]) - 1;
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return null;
  return { col, row };
}

function rangeRefs(start: string, end: string): string[] {
  const from = parseCellRef(start);
  const to = parseCellRef(end);
  if (!from || !to) return [];
  const refs: string[] = [];
  const minCol = Math.min(from.col, to.col);
  const maxCol = Math.max(from.col, to.col);
  const minRow = Math.min(from.row, to.row);
  const maxRow = Math.max(from.row, to.row);
  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      refs.push(cellId(col, row));
    }
  }
  return refs;
}

function toNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function evaluateFormula(formula: string, cells: Record<string, string>): string {
  const source = formula.trim();
  if (!source.startsWith('=')) return source;

  const body = source.slice(1).trim();
  const sumMatch = body.match(/^SUM\(([A-Z]\d+):([A-Z]\d+)\)$/i);
  if (sumMatch) {
    const refs = rangeRefs(sumMatch[1], sumMatch[2]);
    const total = refs.reduce((acc, ref) => acc + toNumber(cells[ref] || '0'), 0);
    return String(total);
  }

  const avgMatch = body.match(/^AVG\(([A-Z]\d+):([A-Z]\d+)\)$/i);
  if (avgMatch) {
    const refs = rangeRefs(avgMatch[1], avgMatch[2]);
    if (refs.length === 0) return '0';
    const total = refs.reduce((acc, ref) => acc + toNumber(cells[ref] || '0'), 0);
    return String(total / refs.length);
  }

  const expression = body.replace(/[A-Z]\d+/gi, (ref) => String(toNumber(cells[ref.toUpperCase()] || '0')));
  if (!/^[0-9+\-*/ ().]+$/.test(expression)) {
    return '#ERR';
  }
  try {
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${expression});`)();
    return String(result);
  } catch {
    return '#ERR';
  }
}

const LogicSheet = ({ open }: LogicSheetProps) => {
  const [cells, setCells] = useState<Record<string, string>>({});
  const [activeCell, setActiveCell] = useState('A1');

  const activeValue = cells[activeCell] || '';
  const evaluated = useMemo(
    () => evaluateFormula(activeValue, cells),
    [activeValue, cells]
  );

  if (!open) return null;

  return (
    <div className="flex-1 flex flex-col bg-[#171717] overflow-hidden">
      <div className="px-4 py-2 border-b border-forge-steel flex items-center gap-3 text-xs">
        <span className="text-forge-ember font-mono">{activeCell}</span>
        <input
          value={activeValue}
          onChange={(event) => setCells((prev) => ({ ...prev, [activeCell]: event.target.value }))}
          placeholder="Cell value or formula (=SUM(A1:A3), =A1+B1)"
          className="flex-1 bg-black/30 border border-forge-steel rounded px-2 py-1 text-xs text-white outline-none focus:border-forge-ember/40"
        />
        <span className="text-gray-500">Result: {evaluated}</span>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="w-10 border border-forge-steel bg-[#1f1f1f]" />
              {Array.from({ length: COLS }).map((_, col) => (
                <th key={col} className="min-w-28 border border-forge-steel bg-[#1f1f1f] text-gray-400">
                  {colLabel(col)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: ROWS }).map((_, row) => (
              <tr key={row}>
                <td className="border border-forge-steel bg-[#1f1f1f] text-gray-500 text-center">{row + 1}</td>
                {Array.from({ length: COLS }).map((_, col) => {
                  const id = cellId(col, row);
                  const raw = cells[id] || '';
                  const isActive = id === activeCell;
                  const shown = isActive
                    ? raw
                    : raw.startsWith('=')
                      ? evaluateFormula(raw, cells)
                      : raw;
                  return (
                    <td key={id} className={`border border-forge-steel ${isActive ? 'bg-forge-ember/10' : ''}`}>
                      <input
                        value={isActive ? raw : shown}
                        onFocus={() => setActiveCell(id)}
                        onChange={(event) => setCells((prev) => ({ ...prev, [id]: event.target.value }))}
                        className="w-full bg-transparent px-2 py-1 text-gray-200 outline-none"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LogicSheet;
