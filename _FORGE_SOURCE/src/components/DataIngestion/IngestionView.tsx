/**
 * IngestionView — Drop data, answer 5 questions, it's live.
 *
 * Combines:
 * 1. File drop zone + format detection
 * 2. Setup wizard (3-5 questions)
 * 3. Dataset browser + row viewer
 */

import { useState, useCallback, useRef } from 'react';
import { X, Upload, Trash2, Plus, Search, ChevronRight } from 'lucide-react';
import {
  detectFormat, detectPrimaryKey, parseCSV, parseJSON, parseText,
  ingestData, getDatasets, removeDataset, addNoteToRow, searchDatasets,
  type IngestedDataset, type WizardAnswers, type DataFormat,
} from '../../lib/ingestion';

interface IngestionViewProps {
  open: boolean;
  onClose: () => void;
}

type WizardStep = 'drop' | 'questions' | 'done';

interface PreviewData {
  filename: string;
  content: string;
  format: DataFormat;
  columns: string[];
  rows: Record<string, unknown>[];
  detectedPK: string;
}

const IngestionView = ({ open, onClose }: IngestionViewProps) => {
  const [step, setStep] = useState<WizardStep>('drop');
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [answers, setAnswers] = useState<WizardAnswers>({
    dataType: '', primaryKey: '', purpose: 'read',
    canonicalColumns: [], aiWatchPrompt: '',
  });
  const [datasets, setDatasets] = useState<IngestedDataset[]>(getDatasets);
  const [activeDataset, setActiveDataset] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [selectedRow, setSelectedRow] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshDatasets = useCallback(() => {
    setDatasets(getDatasets());
  }, []);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const format = detectFormat(file.name, content);

      let columns: string[] = [];
      let rows: Record<string, unknown>[] = [];

      try {
        if (format === 'csv') {
          const parsed = parseCSV(content);
          columns = parsed.columns;
          rows = parsed.rows;
        } else if (format === 'json') {
          const parsed = parseJSON(content);
          columns = parsed.columns;
          rows = parsed.rows;
        } else {
          const parsed = parseText(content);
          columns = parsed.columns;
          rows = parsed.rows;
        }
      } catch (err) {
        console.error('Parse error:', err);
      }

      const detectedPK = detectPrimaryKey(columns, rows);

      setPreview({ filename: file.name, content, format, columns, rows, detectedPK });
      setAnswers(prev => ({ ...prev, primaryKey: detectedPK }));
      setStep('questions');
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleIngest = useCallback(() => {
    if (!preview) return;
    ingestData(preview.filename, preview.content, answers);
    refreshDatasets();
    setStep('done');
    setPreview(null);
  }, [preview, answers, refreshDatasets]);

  const handleDelete = useCallback((id: string) => {
    removeDataset(id);
    refreshDatasets();
    if (activeDataset === id) setActiveDataset(null);
  }, [activeDataset, refreshDatasets]);

  const handleAddNote = useCallback((datasetId: string, rowId: string) => {
    if (!noteInput.trim()) return;
    addNoteToRow(datasetId, rowId, noteInput.trim());
    setNoteInput('');
    refreshDatasets();
  }, [noteInput, refreshDatasets]);

  if (!open) return null;

  const activeDs = activeDataset ? datasets.find(d => d.id === activeDataset) : null;
  const searchResults = searchQuery.trim() ? searchDatasets(searchQuery) : [];
  const displayRows = activeDs?.rows || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70" />
      <div
        className="relative w-full max-w-5xl h-[80vh] rounded-lg border border-forge-steel bg-[#111115] shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-forge-steel">
          <div className="flex items-center gap-3">
            <span className="text-forge-ember text-[10px] uppercase tracking-widest font-bold">Data Ingestion</span>
            <span className="text-gray-600 text-[9px]">{datasets.length} dataset{datasets.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setStep('drop'); setPreview(null); }}
              className="text-[10px] px-2 py-1 rounded border border-forge-steel text-gray-400 hover:text-white hover:border-forge-ember/40 cursor-pointer"
            >
              <Plus size={10} className="inline mr-1" />
              Import
            </button>
            <button onClick={onClose} className="text-gray-600 hover:text-white cursor-pointer">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left: Dataset list */}
          <div className="w-56 border-r border-forge-steel overflow-y-auto p-2">
            {/* Search */}
            <div className="relative mb-2">
              <Search size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-600" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search data..."
                className="w-full bg-black/30 border border-forge-steel rounded pl-6 pr-2 py-1 text-[10px] text-white outline-none focus:border-forge-ember/40 placeholder:text-gray-700"
              />
            </div>

            {datasets.map(ds => (
              <div
                key={ds.id}
                onClick={() => { setActiveDataset(ds.id); setStep('done'); setSelectedRow(null); }}
                className={`flex items-center justify-between px-2 py-1.5 rounded text-xs cursor-pointer mb-0.5 ${
                  activeDataset === ds.id
                    ? 'bg-forge-ember/10 text-forge-ember'
                    : 'text-gray-400 hover:bg-white/5'
                }`}
              >
                <div className="truncate">
                  <div className="truncate">{ds.name}</div>
                  <div className="text-[9px] text-gray-600">{ds.rows.length} rows · {ds.format}</div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); handleDelete(ds.id); }}
                  className="text-gray-700 hover:text-red-400 cursor-pointer"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            ))}

            {datasets.length === 0 && (
              <div className="text-[10px] text-gray-700 text-center mt-8">No datasets yet</div>
            )}

            {/* Search results */}
            {searchQuery.trim() && searchResults.length > 0 && (
              <div className="mt-3 pt-2 border-t border-forge-steel">
                <div className="text-[9px] text-gray-600 mb-1">{searchResults.length} matches</div>
                {searchResults.slice(0, 20).map((r, i) => (
                  <div
                    key={i}
                    onClick={() => { setActiveDataset(r.dataset.id); setSelectedRow(r.row.id); setStep('done'); }}
                    className="text-[10px] text-gray-400 px-2 py-1 rounded hover:bg-white/5 cursor-pointer truncate"
                  >
                    <span className="text-forge-ember/50">{r.dataset.name}</span>
                    <span className="mx-1 text-gray-700">/</span>
                    <span>{String(r.row.columns[r.matchedColumn]).substring(0, 40)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Content area */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Drop zone / wizard */}
            {step === 'drop' && (
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                className="flex-1 flex items-center justify-center"
              >
                <div className="text-center">
                  <div
                    className="w-64 h-40 mx-auto border-2 border-dashed border-forge-steel rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-forge-ember/40 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={24} className="text-gray-600 mb-2" />
                    <div className="text-xs text-gray-400">Drop CSV, JSON, or text file here</div>
                    <div className="text-[10px] text-gray-600 mt-1">or click to browse</div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.tsv,.json,.txt,.md"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                  />
                </div>
              </div>
            )}

            {/* Setup wizard */}
            {step === 'questions' && preview && (
              <div className="flex-1 overflow-y-auto p-4">
                <h3 className="text-xs uppercase tracking-widest text-forge-ember font-bold mb-4">
                  Setup: {preview.filename}
                </h3>
                <div className="text-[10px] text-gray-500 mb-4">
                  Detected: {preview.format.toUpperCase()} · {preview.columns.length} columns · {preview.rows.length} rows
                </div>

                {/* Preview table */}
                <div className="overflow-x-auto mb-4 border border-forge-steel rounded">
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="border-b border-forge-steel bg-black/30">
                        {preview.columns.slice(0, 8).map(col => (
                          <th key={col} className="px-2 py-1 text-left text-gray-500 font-normal">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.slice(0, 5).map((row, i) => (
                        <tr key={i} className="border-b border-forge-steel/30">
                          {preview.columns.slice(0, 8).map(col => (
                            <td key={col} className="px-2 py-1 text-gray-400 truncate max-w-[150px]">
                              {String(row[col] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 5 Questions */}
                <div className="space-y-3 max-w-lg">
                  {/* Q1: What is this? */}
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1">1. What IS this data?</label>
                    <input
                      value={answers.dataType}
                      onChange={e => setAnswers(p => ({ ...p, dataType: e.target.value }))}
                      placeholder="e.g., Research papers, Bible, Financial data..."
                      className="w-full bg-black/30 border border-forge-steel rounded px-2 py-1.5 text-xs text-white outline-none focus:border-forge-ember/40 placeholder:text-gray-700"
                    />
                  </div>

                  {/* Q2: Primary key */}
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1">
                      2. Primary key column? <span className="text-gray-600">(auto-detected: {preview.detectedPK})</span>
                    </label>
                    <select
                      value={answers.primaryKey}
                      onChange={e => setAnswers(p => ({ ...p, primaryKey: e.target.value }))}
                      className="w-full bg-black/30 border border-forge-steel rounded px-2 py-1.5 text-xs text-white outline-none focus:border-forge-ember/40"
                    >
                      {preview.columns.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>

                  {/* Q3: Purpose */}
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1">3. What do you want to DO with this?</label>
                    <div className="flex flex-wrap gap-1">
                      {['read', 'annotate', 'search', 'analyze'].map(p => (
                        <button
                          key={p}
                          onClick={() => setAnswers(prev => ({ ...prev, purpose: p }))}
                          className={`px-2 py-1 text-[10px] rounded border cursor-pointer transition-colors ${
                            answers.purpose === p
                              ? 'border-forge-ember/40 text-forge-ember bg-forge-ember/10'
                              : 'border-forge-steel text-gray-500 hover:text-gray-300'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Q4: Canonical columns */}
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1">
                      4. Any columns that are CANONICAL? <span className="text-gray-600">(never overwrite)</span>
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {preview.columns.map(col => (
                        <button
                          key={col}
                          onClick={() => {
                            setAnswers(prev => ({
                              ...prev,
                              canonicalColumns: prev.canonicalColumns.includes(col)
                                ? prev.canonicalColumns.filter(c => c !== col)
                                : [...prev.canonicalColumns, col],
                            }));
                          }}
                          className={`px-2 py-0.5 text-[10px] rounded border cursor-pointer transition-colors ${
                            answers.canonicalColumns.includes(col)
                              ? 'border-amber-400/40 text-amber-300 bg-amber-400/10'
                              : 'border-forge-steel text-gray-600 hover:text-gray-400'
                          }`}
                        >
                          {col}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Q5: AI watch prompt */}
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1">
                      5. What should the AI watch for? <span className="text-gray-600">(or skip)</span>
                    </label>
                    <input
                      value={answers.aiWatchPrompt}
                      onChange={e => setAnswers(p => ({ ...p, aiWatchPrompt: e.target.value }))}
                      placeholder="e.g., Find contradictions, flag duplicates, summarize patterns..."
                      className="w-full bg-black/30 border border-forge-steel rounded px-2 py-1.5 text-xs text-white outline-none focus:border-forge-ember/40 placeholder:text-gray-700"
                    />
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => { setStep('drop'); setPreview(null); }}
                    className="px-3 py-1.5 text-xs border border-forge-steel rounded text-gray-400 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleIngest}
                    className="px-3 py-1.5 text-xs border border-forge-ember/40 rounded text-forge-ember hover:bg-forge-ember/10 cursor-pointer"
                  >
                    Ingest Data
                  </button>
                </div>
              </div>
            )}

            {/* Dataset viewer */}
            {step === 'done' && activeDs && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Dataset header */}
                <div className="px-4 py-2 border-b border-forge-steel bg-black/20">
                  <div className="text-xs text-white font-bold">{activeDs.name}</div>
                  <div className="text-[9px] text-gray-600">
                    {activeDs.format.toUpperCase()} · {activeDs.rows.length} rows · PK: {activeDs.primaryKeyColumn}
                    {activeDs.purpose && <span className="ml-2 text-gray-500">Purpose: {activeDs.purpose}</span>}
                  </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                  {/* Data table */}
                  <div className="flex-1 overflow-auto">
                    <table className="w-full text-[10px]">
                      <thead className="sticky top-0 bg-[#111115]">
                        <tr className="border-b border-forge-steel">
                          <th className="px-2 py-1.5 text-left text-gray-600 font-normal w-6">#</th>
                          {activeDs.columns.slice(0, 8).map(col => (
                            <th
                              key={col}
                              className={`px-2 py-1.5 text-left font-normal ${
                                activeDs.canonicalColumns.includes(col)
                                  ? 'text-amber-400/70'
                                  : col === activeDs.primaryKeyColumn
                                    ? 'text-forge-ember/70'
                                    : 'text-gray-500'
                              }`}
                            >
                              {col}
                              {activeDs.canonicalColumns.includes(col) && ' *'}
                            </th>
                          ))}
                          <th className="px-2 py-1.5 text-left text-gray-600 font-normal">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayRows.map((row, i) => (
                          <tr
                            key={row.id}
                            onClick={() => setSelectedRow(row.id === selectedRow ? null : row.id)}
                            className={`border-b border-forge-steel/20 cursor-pointer transition-colors ${
                              row.id === selectedRow
                                ? 'bg-forge-ember/5'
                                : 'hover:bg-white/[0.02]'
                            } ${row.aiFlags.length > 0 ? 'bg-amber-400/[0.03]' : ''}`}
                          >
                            <td className="px-2 py-1 text-gray-700">{i + 1}</td>
                            {activeDs.columns.slice(0, 8).map(col => (
                              <td key={col} className="px-2 py-1 text-gray-400 truncate max-w-[180px]">
                                {String(row.columns[col] ?? '')}
                              </td>
                            ))}
                            <td className="px-2 py-1">
                              {row.notes.length > 0 && (
                                <span className="text-cyan-400/60 text-[9px]">{row.notes.length}</span>
                              )}
                              {row.aiFlags.length > 0 && (
                                <span className="text-amber-400/60 text-[9px] ml-1">
                                  [{row.aiFlags.join(', ')}]
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Row detail panel */}
                  {selectedRow && (() => {
                    const row = activeDs.rows.find(r => r.id === selectedRow);
                    if (!row) return null;
                    return (
                      <div className="w-64 border-l border-forge-steel overflow-y-auto p-3">
                        <div className="text-[9px] text-forge-ember uppercase tracking-widest font-bold mb-2">
                          Row Detail
                        </div>
                        <div className="text-[10px] text-gray-500 mb-2">
                          PK: <span className="text-gray-300">{row.primaryKey}</span>
                        </div>

                        {Object.entries(row.columns).map(([k, v]) => (
                          <div key={k} className="mb-1.5">
                            <div className="text-[9px] text-gray-600">{k}</div>
                            <div className="text-[10px] text-gray-300 break-words">
                              {String(v ?? '')}
                            </div>
                          </div>
                        ))}

                        {/* Notes */}
                        <div className="mt-3 pt-2 border-t border-forge-steel">
                          <div className="text-[9px] text-gray-600 mb-1">Notes ({row.notes.length})</div>
                          {row.notes.map((note, i) => (
                            <div key={i} className="text-[10px] text-cyan-300/80 mb-0.5 flex items-start gap-1">
                              <ChevronRight size={8} className="mt-0.5 flex-shrink-0" />
                              {note}
                            </div>
                          ))}
                          <div className="flex gap-1 mt-1">
                            <input
                              value={noteInput}
                              onChange={e => setNoteInput(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleAddNote(activeDs.id, row.id);
                              }}
                              placeholder="Add note..."
                              className="flex-1 bg-black/30 border border-forge-steel rounded px-1.5 py-0.5 text-[10px] text-white outline-none focus:border-forge-ember/40 placeholder:text-gray-700"
                            />
                            <button
                              onClick={() => handleAddNote(activeDs.id, row.id)}
                              className="text-[9px] text-forge-ember/60 hover:text-forge-ember cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* AI Flags */}
                        {row.aiFlags.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-forge-steel">
                            <div className="text-[9px] text-gray-600 mb-1">AI Flags</div>
                            {row.aiFlags.map((flag, i) => (
                              <span
                                key={i}
                                className="inline-block text-[9px] px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-300 border border-amber-400/20 mr-1 mb-0.5"
                              >
                                {flag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Empty state */}
            {step === 'done' && !activeDs && (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-gray-700 text-xs">
                  {datasets.length > 0
                    ? 'Select a dataset from the left panel'
                    : 'No datasets. Click Import to add data.'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IngestionView;
