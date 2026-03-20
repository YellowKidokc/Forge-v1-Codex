/**
 * FORGE Data Ingestion Layer
 *
 * Any data source. Drop it in. Answer 3-5 questions. It's live.
 *
 * Supported formats (v1):
 * - CSV (.csv) — auto-detected delimiter
 * - JSON array — each object becomes a row
 * - Markdown folder — each .md file becomes a row
 * - Plain text — line-per-row
 *
 * After ingestion, every row becomes an IngestedRow with:
 * - auto-generated UUID
 * - source file reference
 * - primary key
 * - column data
 * - notes, anchors, AI flags
 */

// ─── Types ───────────────────────────────────────────────────

export interface IngestedRow {
  id: string;
  source: string;
  primaryKey: string;
  columns: Record<string, unknown>;
  notes: string[];
  anchors: string[];
  aiFlags: string[];
}

export interface IngestedDataset {
  id: string;
  name: string;
  source: string;
  format: DataFormat;
  columns: string[];
  primaryKeyColumn: string;
  rows: IngestedRow[];
  purpose: string;
  canonicalColumns: string[];
  aiWatchPrompt: string;
  created: number;
}

export type DataFormat = 'csv' | 'json' | 'markdown' | 'text';

export interface WizardAnswers {
  dataType: string;
  primaryKey: string;
  purpose: string;
  canonicalColumns: string[];
  aiWatchPrompt: string;
}

// ─── Storage ─────────────────────────────────────────────────

const DATASETS_KEY = 'forge_ingested_datasets';

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function getDatasets(): IngestedDataset[] {
  try {
    return JSON.parse(localStorage.getItem(DATASETS_KEY) || '[]');
  } catch { return []; }
}

export function saveDatasets(datasets: IngestedDataset[]): void {
  localStorage.setItem(DATASETS_KEY, JSON.stringify(datasets));
}

export function getDataset(id: string): IngestedDataset | null {
  return getDatasets().find(d => d.id === id) || null;
}

export function removeDataset(id: string): void {
  saveDatasets(getDatasets().filter(d => d.id !== id));
}

export function addNoteToRow(datasetId: string, rowId: string, note: string): void {
  const datasets = getDatasets();
  const ds = datasets.find(d => d.id === datasetId);
  if (!ds) return;
  const row = ds.rows.find(r => r.id === rowId);
  if (!row) return;
  row.notes.push(note);
  saveDatasets(datasets);
}

export function addAiFlagToRow(datasetId: string, rowId: string, flag: string): void {
  const datasets = getDatasets();
  const ds = datasets.find(d => d.id === datasetId);
  if (!ds) return;
  const row = ds.rows.find(r => r.id === rowId);
  if (!row) return;
  if (!row.aiFlags.includes(flag)) row.aiFlags.push(flag);
  saveDatasets(datasets);
}

// ─── Format Detection ────────────────────────────────────────

export function detectFormat(filename: string, content: string): DataFormat {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'csv' || ext === 'tsv') return 'csv';
  if (ext === 'json') return 'json';
  if (ext === 'md' || ext === 'markdown') return 'markdown';

  // Try content-based detection
  const trimmed = content.trim();
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try { JSON.parse(trimmed); return 'json'; } catch { /* not json */ }
  }
  // CSV heuristic: first line has commas/tabs, subsequent lines have same count
  const lines = trimmed.split('\n');
  if (lines.length > 1) {
    const commas = (lines[0].match(/,/g) || []).length;
    const tabs = (lines[0].match(/\t/g) || []).length;
    if (commas > 1 || tabs > 1) return 'csv';
  }

  return 'text';
}

// ─── CSV Parser ──────────────────────────────────────────────

function detectDelimiter(content: string): string {
  const firstLine = content.split('\n')[0];
  const commas = (firstLine.match(/,/g) || []).length;
  const tabs = (firstLine.match(/\t/g) || []).length;
  const pipes = (firstLine.match(/\|/g) || []).length;
  const semicolons = (firstLine.match(/;/g) || []).length;

  const max = Math.max(commas, tabs, pipes, semicolons);
  if (max === 0) return ',';
  if (max === tabs) return '\t';
  if (max === pipes) return '|';
  if (max === semicolons) return ';';
  return ',';
}

function parseCSVLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

export function parseCSV(content: string): { columns: string[]; rows: Record<string, string>[] } {
  const delimiter = detectDelimiter(content);
  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length === 0) return { columns: [], rows: [] };

  const columns = parseCSVLine(lines[0], delimiter);
  const rows = lines.slice(1).map(line => {
    const values = parseCSVLine(line, delimiter);
    const row: Record<string, string> = {};
    columns.forEach((col, i) => { row[col] = values[i] || ''; });
    return row;
  });

  return { columns, rows };
}

// ─── JSON Parser ─────────────────────────────────────────────

export function parseJSON(content: string): { columns: string[]; rows: Record<string, unknown>[] } {
  const parsed = JSON.parse(content);
  let arr: Record<string, unknown>[];

  if (Array.isArray(parsed)) {
    arr = parsed;
  } else if (parsed && typeof parsed === 'object') {
    // Try to find an array property
    const arrayKey = Object.keys(parsed).find(k => Array.isArray(parsed[k]));
    arr = arrayKey ? parsed[arrayKey] : [parsed];
  } else {
    return { columns: [], rows: [] };
  }

  // Extract all unique keys as columns
  const colSet = new Set<string>();
  for (const row of arr) {
    if (row && typeof row === 'object') {
      Object.keys(row).forEach(k => colSet.add(k));
    }
  }
  const columns = Array.from(colSet);
  return { columns, rows: arr.filter(r => r && typeof r === 'object') };
}

// ─── Text Parser ─────────────────────────────────────────────

export function parseText(content: string): { columns: string[]; rows: Record<string, string>[] } {
  const lines = content.split('\n').filter(l => l.trim());
  return {
    columns: ['line', 'text'],
    rows: lines.map((line, i) => ({ line: String(i + 1), text: line })),
  };
}

// ─── Primary Key Detection ───────────────────────────────────

export function detectPrimaryKey(columns: string[], rows: Record<string, unknown>[]): string {
  // Look for common primary key column names
  const pkNames = ['id', 'ID', 'Id', '_id', 'key', 'uuid', 'pk', 'primary_key', 'index', 'ref', 'code'];
  for (const name of pkNames) {
    if (columns.includes(name)) return name;
  }

  // Find the column with most unique values
  let bestCol = columns[0] || 'id';
  let bestUnique = 0;
  for (const col of columns) {
    const values = new Set(rows.map(r => String(r[col] ?? '')));
    if (values.size > bestUnique) {
      bestUnique = values.size;
      bestCol = col;
    }
  }
  return bestCol;
}

// ─── Full Ingestion Pipeline ─────────────────────────────────

export function ingestData(
  filename: string,
  content: string,
  answers: WizardAnswers,
): IngestedDataset {
  const format = detectFormat(filename, content);
  let columns: string[];
  let rawRows: Record<string, unknown>[];

  switch (format) {
    case 'csv': {
      const csv = parseCSV(content);
      columns = csv.columns;
      rawRows = csv.rows;
      break;
    }
    case 'json': {
      const json = parseJSON(content);
      columns = json.columns;
      rawRows = json.rows;
      break;
    }
    default: {
      const text = parseText(content);
      columns = text.columns;
      rawRows = text.rows;
      break;
    }
  }

  const pkCol = answers.primaryKey || detectPrimaryKey(columns, rawRows);

  const rows: IngestedRow[] = rawRows.map(raw => ({
    id: uid(),
    source: filename,
    primaryKey: String(raw[pkCol] ?? uid()),
    columns: raw,
    notes: [],
    anchors: [],
    aiFlags: [],
  }));

  const dataset: IngestedDataset = {
    id: uid(),
    name: filename.replace(/\.[^.]+$/, ''),
    source: filename,
    format,
    columns,
    primaryKeyColumn: pkCol,
    rows,
    purpose: answers.purpose,
    canonicalColumns: answers.canonicalColumns,
    aiWatchPrompt: answers.aiWatchPrompt,
    created: Date.now(),
  };

  const datasets = getDatasets();
  datasets.push(dataset);
  saveDatasets(datasets);

  return dataset;
}

// ─── Search ──────────────────────────────────────────────────

export function searchDatasets(query: string): { dataset: IngestedDataset; row: IngestedRow; matchedColumn: string }[] {
  const lower = query.toLowerCase();
  const results: { dataset: IngestedDataset; row: IngestedRow; matchedColumn: string }[] = [];

  for (const ds of getDatasets()) {
    for (const row of ds.rows) {
      for (const [col, val] of Object.entries(row.columns)) {
        if (String(val).toLowerCase().includes(lower)) {
          results.push({ dataset: ds, row, matchedColumn: col });
          break; // one match per row is enough
        }
      }
    }
  }

  return results;
}
