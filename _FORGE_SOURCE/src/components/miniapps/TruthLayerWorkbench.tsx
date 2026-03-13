import { useEffect, useMemo, useState } from 'react';

interface TruthLayerWorkbenchProps {
  open: boolean;
}

type ScopeLevel =
  | 'word'
  | 'sentence'
  | 'paragraph'
  | 'verse'
  | 'chapter'
  | 'book'
  | 'corpus';

type QuestionType =
  | 'does_x_hold'
  | 'what_is_x'
  | 'what_grounds_x'
  | 'what_must_x_be';

type FacetKey =
  | 'entity'
  | 'role'
  | 'evidence'
  | 'time'
  | 'ops'
  | 'context'
  | 'provenance';

type AttachmentType =
  | 'note'
  | 'tag'
  | 'equation'
  | 'link'
  | 'source'
  | 'task'
  | 'flag';

interface FacetAttachment {
  id: string;
  type: AttachmentType;
  content: string;
}

interface FacetValue {
  value: string;
  attachments: FacetAttachment[];
}

interface TruthRecord {
  id: string;
  createdAt: string;
  statement: string;
  scope: ScopeLevel;
  questionType: QuestionType;
  facets: Record<FacetKey, FacetValue>;
  deathTests: {
    selfRefutation: boolean;
    infiniteRegress: boolean;
    empiricalContradiction: boolean;
    logicalIncoherence: boolean;
  };
  gates: {
    structural: number;
    mathematical: number;
    empirical: number;
    crossDomain: number;
    adversarial: number;
  };
}

const STORAGE_KEY = 'forge_truth_layer_records_v1';

const FACET_META: Array<{ key: FacetKey; label: string; hint: string }> = [
  { key: 'entity', label: 'Entity', hint: 'What is this?' },
  { key: 'role', label: 'Role', hint: 'What function does it serve?' },
  { key: 'evidence', label: 'Evidence', hint: 'Why is it supported or killed?' },
  { key: 'time', label: 'Time', hint: 'Where in sequence does it sit?' },
  { key: 'ops', label: 'Ops', hint: 'Workflow state and next action' },
  { key: 'context', label: 'Context', hint: 'Lens/domain interpretation' },
  { key: 'provenance', label: 'Provenance', hint: 'Who/when/how/source' },
];

const ATTACHMENT_TYPES: AttachmentType[] = [
  'note',
  'tag',
  'equation',
  'link',
  'source',
  'task',
  'flag',
];

const DEFAULT_FACETS: Record<FacetKey, FacetValue> = {
  entity: { value: '', attachments: [] },
  role: { value: '', attachments: [] },
  evidence: { value: '', attachments: [] },
  time: { value: '', attachments: [] },
  ops: { value: '', attachments: [] },
  context: { value: '', attachments: [] },
  provenance: { value: '', attachments: [] },
};

function defaultRecord(): Omit<TruthRecord, 'id' | 'createdAt'> {
  return {
    statement: '',
    scope: 'paragraph',
    questionType: 'what_is_x',
    facets: JSON.parse(JSON.stringify(DEFAULT_FACETS)),
    deathTests: {
      selfRefutation: false,
      infiniteRegress: false,
      empiricalContradiction: false,
      logicalIncoherence: false,
    },
    gates: {
      structural: 50,
      mathematical: 50,
      empirical: 50,
      crossDomain: 50,
      adversarial: 50,
    },
  };
}

function scoreTier(score: number): string {
  if (score >= 90) return 'near-canonical';
  if (score >= 75) return 'strong';
  if (score >= 60) return 'provisional';
  return 'weak';
}

function safeFacetValue(input: unknown): FacetValue {
  if (typeof input === 'string') {
    return { value: input, attachments: [] };
  }
  if (!input || typeof input !== 'object') {
    return { value: '', attachments: [] };
  }
  const record = input as { value?: unknown; attachments?: unknown };
  const value = typeof record.value === 'string' ? record.value : '';
  const attachments = Array.isArray(record.attachments)
    ? record.attachments
        .filter(
          (item) =>
            item &&
            typeof item === 'object' &&
            typeof (item as { id?: unknown }).id === 'string' &&
            typeof (item as { type?: unknown }).type === 'string' &&
            typeof (item as { content?: unknown }).content === 'string'
        )
        .map((item) => {
          const i = item as { id: string; type: AttachmentType; content: string };
          return { id: i.id, type: i.type, content: i.content };
        })
    : [];
  return { value, attachments };
}

function normalizeRecord(raw: unknown): TruthRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Partial<TruthRecord>;
  if (!item.id || !item.createdAt || !item.statement) return null;

  const normalizedFacets: Record<FacetKey, FacetValue> = {
    entity: safeFacetValue(item.facets?.entity),
    role: safeFacetValue(item.facets?.role),
    evidence: safeFacetValue(item.facets?.evidence),
    time: safeFacetValue(item.facets?.time),
    ops: safeFacetValue(item.facets?.ops),
    context: safeFacetValue(item.facets?.context),
    provenance: safeFacetValue(item.facets?.provenance),
  };

  return {
    id: item.id,
    createdAt: item.createdAt,
    statement: item.statement,
    scope: item.scope || 'paragraph',
    questionType: item.questionType || 'what_is_x',
    facets: normalizedFacets,
    deathTests: item.deathTests || {
      selfRefutation: false,
      infiniteRegress: false,
      empiricalContradiction: false,
      logicalIncoherence: false,
    },
    gates: item.gates || {
      structural: 50,
      mathematical: 50,
      empirical: 50,
      crossDomain: 50,
      adversarial: 50,
    },
  };
}

const TruthLayerWorkbench = ({ open }: TruthLayerWorkbenchProps) => {
  const [draft, setDraft] = useState<Omit<TruthRecord, 'id' | 'createdAt'>>(defaultRecord);
  const [records, setRecords] = useState<TruthRecord[]>([]);
  const [activeFacet, setActiveFacet] = useState<FacetKey>('entity');
  const [attachmentType, setAttachmentType] = useState<AttachmentType>('note');
  const [attachmentContent, setAttachmentContent] = useState('');
  const [scanQuery, setScanQuery] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const normalized = parsed
        .map(normalizeRecord)
        .filter((record): record is TruthRecord => Boolean(record));
      setRecords(normalized);
    } catch (err) {
      console.error('Failed to load truth layer records:', err);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }, [records]);

  const score = useMemo(() => {
    const g = draft.gates;
    return (g.structural + g.mathematical + g.empirical + g.crossDomain + g.adversarial) / 5;
  }, [draft.gates]);

  const deathTriggered = useMemo(
    () => Object.values(draft.deathTests).some(Boolean),
    [draft.deathTests]
  );

  const canSave =
    draft.statement.trim().length > 0 && draft.facets.entity.value.trim().length > 0;

  const scanner = useMemo(() => {
    const tags: string[] = [];
    const equations: string[] = [];
    for (const meta of FACET_META) {
      for (const att of draft.facets[meta.key].attachments) {
        if (att.type === 'tag') tags.push(att.content);
        if (att.type === 'equation') equations.push(att.content);
      }
    }
    return {
      tags,
      equations,
    };
  }, [draft.facets]);

  const globalScanner = useMemo(() => {
    const tags = new Set<string>();
    const equations = new Set<string>();
    for (const record of records) {
      for (const meta of FACET_META) {
        for (const att of record.facets[meta.key].attachments) {
          if (att.type === 'tag') tags.add(att.content);
          if (att.type === 'equation') equations.add(att.content);
        }
      }
    }
    return {
      tags: [...tags].sort((a, b) => a.localeCompare(b)),
      equations: [...equations].sort((a, b) => a.localeCompare(b)),
    };
  }, [records]);

  const filteredRecords = useMemo(() => {
    const q = scanQuery.trim().toLowerCase();
    if (!q) return records;
    return records.filter((record) => {
      if (record.statement.toLowerCase().includes(q)) return true;
      for (const meta of FACET_META) {
        const facet = record.facets[meta.key];
        if (facet.value.toLowerCase().includes(q)) return true;
        if (facet.attachments.some((a) => a.content.toLowerCase().includes(q))) return true;
      }
      return false;
    });
  }, [records, scanQuery]);

  if (!open) return null;

  const saveRecord = () => {
    if (!canSave) return;
    const next: TruthRecord = {
      id: `TL-${Date.now()}`,
      createdAt: new Date().toISOString(),
      ...draft,
    };
    setRecords((prev) => [next, ...prev].slice(0, 200));
    setDraft(defaultRecord());
    setAttachmentContent('');
  };

  const exportJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      total: records.length,
      records,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'forge_truth_layer_records.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const addAttachment = () => {
    const content = attachmentContent.trim();
    if (!content) return;
    const next: FacetAttachment = {
      id: `ATT-${Date.now()}`,
      type: attachmentType,
      content,
    };
    setDraft((prev) => ({
      ...prev,
      facets: {
        ...prev.facets,
        [activeFacet]: {
          ...prev.facets[activeFacet],
          attachments: [next, ...prev.facets[activeFacet].attachments],
        },
      },
    }));
    setAttachmentContent('');
  };

  const removeAttachment = (facet: FacetKey, id: string) => {
    setDraft((prev) => ({
      ...prev,
      facets: {
        ...prev.facets,
        [facet]: {
          ...prev.facets[facet],
          attachments: prev.facets[facet].attachments.filter((a) => a.id !== id),
        },
      },
    }));
  };

  return (
    <div className="flex-1 overflow-auto bg-[#151515] text-gray-200">
      <div className="mx-auto max-w-7xl p-4 space-y-4">
        <div className="border border-forge-steel rounded-md bg-black/20 p-3">
          <h2 className="text-sm font-semibold text-forge-ember uppercase tracking-wider">
            Truth Layer Workbench
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Derivation + 7 facets + 5 verification gates. Each facet supports 7 attachable functions:
            note, tag, equation, link, source, task, flag.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 space-y-4">
            <div className="border border-forge-steel rounded-md bg-black/20 p-3 space-y-3">
              <h3 className="text-xs uppercase tracking-wider text-gray-400">Claim Draft</h3>
              <textarea
                value={draft.statement}
                onChange={(e) => setDraft((prev) => ({ ...prev, statement: e.target.value }))}
                placeholder="Claim statement..."
                className="w-full min-h-24 bg-black/30 border border-forge-steel rounded p-2 text-xs outline-none focus:border-forge-ember/40"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <select
                  value={draft.scope}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, scope: e.target.value as ScopeLevel }))
                  }
                  className="bg-black/30 border border-forge-steel rounded p-2 text-xs"
                >
                  {['word', 'sentence', 'paragraph', 'verse', 'chapter', 'book', 'corpus'].map(
                    (s) => (
                      <option key={s} value={s}>
                        Scope: {s}
                      </option>
                    )
                  )}
                </select>
                <select
                  value={draft.questionType}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, questionType: e.target.value as QuestionType }))
                  }
                  className="bg-black/30 border border-forge-steel rounded p-2 text-xs"
                >
                  <option value="does_x_hold">Q1: Does X hold?</option>
                  <option value="what_is_x">Q2: What is X?</option>
                  <option value="what_grounds_x">Q3: What grounds X?</option>
                  <option value="what_must_x_be">Q4: What must X be?</option>
                </select>
              </div>
            </div>

            <div className="border border-forge-steel rounded-md bg-black/20 p-3">
              <h3 className="text-xs uppercase tracking-wider text-gray-400 mb-3">
                7 Facets (Values + Attachments)
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {FACET_META.map((meta) => (
                  <div key={meta.key} className="border border-forge-steel rounded p-2 space-y-2">
                    <div className="flex justify-between items-center">
                      <button
                        onClick={() => setActiveFacet(meta.key)}
                        className={`text-xs font-semibold ${
                          activeFacet === meta.key ? 'text-forge-ember' : 'text-gray-300'
                        }`}
                      >
                        {meta.label}
                      </button>
                      <span className="text-[10px] text-gray-500">{meta.hint}</span>
                    </div>
                    <input
                      value={draft.facets[meta.key].value}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          facets: {
                            ...prev.facets,
                            [meta.key]: {
                              ...prev.facets[meta.key],
                              value: e.target.value,
                            },
                          },
                        }))
                      }
                      placeholder={`${meta.label} value...`}
                      className="w-full bg-black/30 border border-forge-steel rounded p-2 text-xs"
                    />
                    <div className="max-h-20 overflow-auto space-y-1">
                      {draft.facets[meta.key].attachments.length === 0 && (
                        <p className="text-[11px] text-gray-600">No attachments</p>
                      )}
                      {draft.facets[meta.key].attachments.map((att) => (
                        <div
                          key={att.id}
                          className="flex justify-between gap-2 text-[11px] border border-forge-steel rounded px-2 py-1"
                        >
                          <span className="text-gray-500 uppercase">{att.type}</span>
                          <span className="flex-1 truncate text-gray-300">{att.content}</span>
                          <button
                            onClick={() => removeAttachment(meta.key, att.id)}
                            className="text-gray-500 hover:text-red-400"
                          >
                            x
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="border border-forge-steel rounded-md bg-black/20 p-3 space-y-2">
              <h3 className="text-xs uppercase tracking-wider text-gray-400">Attach to Active Facet</h3>
              <p className="text-[11px] text-gray-500">
                Active facet: <span className="text-forge-ember">{activeFacet}</span>
              </p>
              <select
                value={attachmentType}
                onChange={(e) => setAttachmentType(e.target.value as AttachmentType)}
                className="w-full bg-black/30 border border-forge-steel rounded p-2 text-xs"
              >
                {ATTACHMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <input
                value={attachmentContent}
                onChange={(e) => setAttachmentContent(e.target.value)}
                placeholder="Attachment content..."
                className="w-full bg-black/30 border border-forge-steel rounded p-2 text-xs"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addAttachment();
                }}
              />
              <button
                onClick={addAttachment}
                className="w-full px-3 py-1.5 text-xs rounded border border-forge-ember/40 text-forge-ember"
              >
                Add Attachment
              </button>
            </div>

            <div className="border border-forge-steel rounded-md bg-black/20 p-3 space-y-2">
              <h3 className="text-xs uppercase tracking-wider text-gray-400">Death Conditions</h3>
              {(
                [
                  ['selfRefutation', 'Self-refutation'],
                  ['infiniteRegress', 'Infinite regress'],
                  ['empiricalContradiction', 'Empirical contradiction'],
                  ['logicalIncoherence', 'Logical incoherence'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={draft.deathTests[key]}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        deathTests: { ...prev.deathTests, [key]: e.target.checked },
                      }))
                    }
                  />
                  {label}
                </label>
              ))}
              <p className={`text-xs ${deathTriggered ? 'text-red-400' : 'text-green-400'}`}>
                Status: {deathTriggered ? 'death condition triggered' : 'no death condition triggered'}
              </p>
            </div>

            <div className="border border-forge-steel rounded-md bg-black/20 p-3 space-y-2">
              <h3 className="text-xs uppercase tracking-wider text-gray-400">5 Verification Gates</h3>
              {(
                [
                  ['structural', 'Structural coherence'],
                  ['mathematical', 'Mathematical constraints'],
                  ['empirical', 'Empirical support'],
                  ['crossDomain', 'Cross-domain stability'],
                  ['adversarial', 'Adversarial resilience'],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>{label}</span>
                    <span>{draft.gates[key]}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={draft.gates[key]}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        gates: { ...prev.gates, [key]: Number(e.target.value) },
                      }))
                    }
                    className="w-full"
                  />
                </div>
              ))}
              <div className="pt-2 text-xs">
                <span className="text-gray-400">Truth-confidence score: </span>
                <span className="text-forge-ember font-semibold">{score.toFixed(1)}</span>
                <span className="text-gray-400"> ({scoreTier(score)})</span>
              </div>
            </div>

            <div className="border border-forge-steel rounded-md bg-black/20 p-3 space-y-2">
              <h3 className="text-xs uppercase tracking-wider text-gray-400">Scanner</h3>
              <p className="text-[11px] text-gray-500">Tags ({scanner.tags.length})</p>
              <div className="text-[11px] text-gray-300 max-h-16 overflow-auto">
                {scanner.tags.length === 0 ? '(none)' : scanner.tags.join(', ')}
              </div>
              <p className="text-[11px] text-gray-500">Equations ({scanner.equations.length})</p>
              <div className="text-[11px] text-gray-300 max-h-16 overflow-auto">
                {scanner.equations.length === 0 ? '(none)' : scanner.equations.join(' | ')}
              </div>
            </div>

            <div className="border border-forge-steel rounded-md bg-black/20 p-3 space-y-2">
              <h3 className="text-xs uppercase tracking-wider text-gray-400">
                Global Scanner (Saved Records)
              </h3>
              <input
                value={scanQuery}
                onChange={(e) => setScanQuery(e.target.value)}
                placeholder="Search tags/equations/notes..."
                className="w-full bg-black/30 border border-forge-steel rounded p-2 text-xs"
              />
              <p className="text-[11px] text-gray-500">
                Global tags: {globalScanner.tags.length} | equations: {globalScanner.equations.length}
              </p>
              <div className="text-[11px] text-gray-300 max-h-20 overflow-auto">
                {globalScanner.tags.slice(0, 30).map((t) => `#${t}`).join(', ') || '(no tags)'}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={saveRecord}
            disabled={!canSave}
            className="px-3 py-1.5 text-xs rounded border border-forge-ember/40 text-forge-ember disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Save Record
          </button>
          <button
            onClick={exportJson}
            className="px-3 py-1.5 text-xs rounded border border-forge-steel text-gray-300"
          >
            Export JSON
          </button>
          <button
            onClick={() => setRecords([])}
            className="px-3 py-1.5 text-xs rounded border border-forge-steel text-gray-500"
          >
            Clear Local Records
          </button>
        </div>

        <div className="border border-forge-steel rounded-md bg-black/20 p-3">
          <h3 className="text-xs uppercase tracking-wider text-gray-400 mb-2">
            Saved Records ({records.length})
          </h3>
          <div className="max-h-72 overflow-auto space-y-2">
            {filteredRecords.length === 0 && <p className="text-xs text-gray-500">No matching records.</p>}
            {filteredRecords.map((r) => {
              const recScore =
                (r.gates.structural +
                  r.gates.mathematical +
                  r.gates.empirical +
                  r.gates.crossDomain +
                  r.gates.adversarial) /
                5;
              const allAttachments = FACET_META.flatMap((meta) => r.facets[meta.key].attachments);
              return (
                <div key={r.id} className="border border-forge-steel rounded p-2 text-xs">
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-300 font-semibold">{r.id}</span>
                    <span className="text-forge-ember">
                      {recScore.toFixed(1)} ({scoreTier(recScore)})
                    </span>
                  </div>
                  <p className="text-gray-400 mt-1">{r.statement}</p>
                  <div className="text-[11px] text-gray-500 mt-1">
                    scope={r.scope} | q={r.questionType} | attachments={allAttachments.length} |
                    created={new Date(r.createdAt).toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TruthLayerWorkbench;
